import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { logAudit } from '../../lib/audit';
import { emitToUser, emitToRole } from '../../lib/socket';
import { sendEmailNotification } from '../../lib/email';
import { UserRole, RequestStatus } from '@smart-gate/types';

const router = Router();

const createLeaveSchema = z.object({
  leaveTypeId: z.string().min(1, 'Please select a leave type'),
  fromDate: z.string().min(1, 'From date is required'),
  toDate: z.string().min(1, 'To date is required'),
  totalDays: z.number().positive().optional(),
  reason: z.string().min(2, 'Reason must be at least 2 characters')
});

const reviewLeaveSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'SEND_BACK']).optional(),
  status: z.enum(['APPROVED', 'REJECTED', 'SENT_BACK']).optional(),
  comments: z.string().optional()
}).refine(d => d.action || d.status, { message: 'action or status required' });

// GET /api/leave/types
router.get('/types', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const types = await prisma.leaveType.findMany({
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: types });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch leave types' });
  }
});

// POST /api/leave/types (Super Admin / HR)
router.post('/types', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.HR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, defaultDaysPerYear, requiresHrApproval, color } = req.body;
    if (!name || !code) {
      return res.status(400).json({ success: false, message: 'Name and code are required.' });
    }

    const createdType = await prisma.leaveType.create({
      data: {
        name,
        code: code.toUpperCase(),
        defaultDaysPerYear: Number(defaultDaysPerYear) || 12,
        requiresHrApproval: Boolean(requiresHrApproval),
        color: color || '#3B82F6'
      }
    });

    // Automatically seed leave balances for all existing employees
    const employees = await prisma.employee.findMany({ select: { id: true } });
    if (employees.length > 0) {
      await prisma.leaveBalance.createMany({
        data: employees.map(emp => ({
          employeeId: emp.id,
          leaveTypeId: createdType.id,
          totalDays: createdType.defaultDaysPerYear,
          usedDays: 0,
          pendingDays: 0
        })),
        skipDuplicates: true
      });
    }

    return res.status(201).json({ success: true, data: createdType });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || 'Failed to create leave type' });
  }
});

// PATCH /api/leave/types/:id (Super Admin / HR)
router.patch('/types/:id', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.HR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, defaultDaysPerYear, requiresHrApproval, color } = req.body;

    const updated = await prisma.leaveType.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(code && { code: code.toUpperCase() }),
        ...(defaultDaysPerYear !== undefined && { defaultDaysPerYear: Number(defaultDaysPerYear) }),
        ...(requiresHrApproval !== undefined && { requiresHrApproval: Boolean(requiresHrApproval) }),
        ...(color && { color })
      }
    });

    return res.json({ success: true, data: updated });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message || 'Failed to update leave type' });
  }
});

// GET /api/leave/balances — Dynamically calculated from live LeaveRequest actions
router.get('/balances', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetEmployeeId = (req.query.employeeId as string) || req.user?.employeeId;

    if (!targetEmployeeId) {
      return res.status(400).json({ success: false, message: 'No employee record linked.' });
    }

    // Auto-ensure leave balances exist for all active leave types
    const leaveTypes = await prisma.leaveType.findMany();
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.upsert({
        where: { employeeId_leaveTypeId: { employeeId: targetEmployeeId, leaveTypeId: lt.id } },
        update: {},
        create: {
          employeeId: targetEmployeeId,
          leaveTypeId: lt.id,
          totalDays: lt.defaultDaysPerYear,
          usedDays: 0,
          pendingDays: 0
        }
      });
    }

    const balances = await prisma.leaveBalance.findMany({
      where: { employeeId: targetEmployeeId },
      include: { leaveType: true }
    });

    // Calculate live usedDays and pendingDays directly from actual LeaveRequest actions
    const enrichedBalances = await Promise.all(
      balances.map(async (b) => {
        const [approvedSum, pendingSum] = await Promise.all([
          prisma.leaveRequest.aggregate({
            where: { employeeId: targetEmployeeId, leaveTypeId: b.leaveTypeId, status: 'APPROVED' },
            _sum: { totalDays: true }
          }),
          prisma.leaveRequest.aggregate({
            where: {
              employeeId: targetEmployeeId,
              leaveTypeId: b.leaveTypeId,
              status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_GM', 'PENDING_SUPER_ADMIN'] }
            },
            _sum: { totalDays: true }
          })
        ]);

        const usedDays = approvedSum._sum.totalDays || 0;
        const pendingDays = pendingSum._sum.totalDays || 0;
        const availableDays = Math.max(0, b.totalDays - usedDays - pendingDays);

        // Keep database record in sync
        if (b.usedDays !== usedDays || b.pendingDays !== pendingDays) {
          await prisma.leaveBalance.update({
            where: { id: b.id },
            data: { usedDays, pendingDays }
          });
        }

        return {
          ...b,
          usedDays,
          pendingDays,
          availableDays
        };
      })
    );

    return res.json({ success: true, data: enrichedBalances });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch leave balances' });
  }
});

// GET /api/leave/requests
router.get('/requests', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, employeeId, startDate, endDate, departmentId } = req.query;
    const role = req.user!.role;
    const userEmployeeId = req.user!.employeeId;
    const userId = req.user!.userId;

    const where: any = {};

    if (status) {
      where.status = String(status);
    }

    if (role === UserRole.EMPLOYEE) {
      where.employeeId = userEmployeeId;
    } else if (role === UserRole.MANAGER) {
      // Manager views only their authority-connected employees
      const juniors = await prisma.authorityConnection.findMany({
        where: { authorityUserId: userId, connectionType: 'REPORTING_MANAGER', status: 'ACTIVE' },
        select: { userId: true }
      });
      const juniorUserIds = juniors.map(j => j.userId);
      const juniorEmployees = await prisma.employee.findMany({
        where: { userId: { in: juniorUserIds } },
        select: { id: true }
      });
      where.employeeId = { in: juniorEmployees.map(e => e.id) };
    } else if (employeeId) {
      where.employeeId = String(employeeId);
    }

    // Department filter (HR/Admin/GM only)
    if (departmentId && String(departmentId) !== 'ALL' && role !== UserRole.EMPLOYEE && role !== UserRole.MANAGER) {
      const deptEmps = await prisma.employee.findMany({
        where: { departmentId: String(departmentId) },
        select: { id: true }
      });
      where.employeeId = { in: deptEmps.map(e => e.id) };
    }

    // Date range filter on fromDate
    if (startDate || endDate) {
      where.fromDate = {};
      if (startDate) where.fromDate.gte = new Date(String(startDate));
      if (endDate) {
        const end = new Date(String(endDate));
        end.setDate(end.getDate() + 1);
        where.fromDate.lt = end;
      }
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: {
          include: {
            department: true,
            user: { select: { email: true } }
          }
        },
        leaveType: true,
        approvals: {
          include: {
            approver: {
              include: {
                employee: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch leave requests' });
  }
});


// GET /api/leave/requests/pending (Manager / HR / GM / Super Admin)
// Returns only requests where the current user IS the connected authority
router.get('/requests/pending', authenticate, requireRoles(UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN, UserRole.GM as any), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const role = req.user!.role;
    const userId = req.user!.userId;
    let where: any = {};

    if (role === UserRole.SUPER_ADMIN) {
      // Admin sees everything pending
      where.status = { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_GM', 'PENDING_SUPER_ADMIN'] };
    } else if (role === 'GM') {
      // GM sees escalated, critical, and requests where they are the GM authority
      const juniors = await prisma.authorityConnection.findMany({
        where: { authorityUserId: userId, connectionType: 'GM_AUTHORITY', status: 'ACTIVE' },
        select: { userId: true }
      });
      const juniorUserIds = juniors.map(j => j.userId);
      const juniorEmployees = await prisma.employee.findMany({
        where: { userId: { in: juniorUserIds } },
        select: { id: true }
      });
      where.OR = [
        { status: 'PENDING_GM', employeeId: { in: juniorEmployees.map(e => e.id) } },
        { escalatedToGM: true, status: { in: ['PENDING_GM', 'PENDING_MANAGER', 'PENDING_HR'] } }
      ];
    } else if (role === UserRole.HR) {
      // HR sees PENDING_HR requests from employees connected to them
      const juniors = await prisma.authorityConnection.findMany({
        where: { authorityUserId: userId, connectionType: 'HR_AUTHORITY', status: 'ACTIVE' },
        select: { userId: true }
      });
      const juniorUserIds = juniors.map(j => j.userId);
      const juniorEmployees = await prisma.employee.findMany({
        where: { userId: { in: juniorUserIds } },
        select: { id: true }
      });
      where.status = { in: ['PENDING_HR', 'PENDING_SUPER_ADMIN'] };
      where.employeeId = { in: juniorEmployees.map(e => e.id) };
    } else if (role === UserRole.MANAGER) {
      // Manager sees PENDING_MANAGER requests from employees connected to them
      const juniors = await prisma.authorityConnection.findMany({
        where: { authorityUserId: userId, connectionType: 'REPORTING_MANAGER', status: 'ACTIVE' },
        select: { userId: true }
      });
      const juniorUserIds = juniors.map(j => j.userId);
      const juniorEmployees = await prisma.employee.findMany({
        where: { userId: { in: juniorUserIds } },
        select: { id: true }
      });
      where.status = 'PENDING_MANAGER';
      where.employeeId = { in: juniorEmployees.map(e => e.id) };
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: {
        employee: { include: { department: true } },
        leaveType: true,
        approvals: { include: { approver: { include: { employee: true } } } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch pending leave requests' });
  }
});

// GET /api/leave/requests/pending-hr (HR and Super Admin)
router.get('/requests/pending-hr', authenticate, requireRoles(UserRole.HR, UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const role = req.user!.role;
    const userId = req.user!.userId;
    const where: any = {};

    if (role === UserRole.SUPER_ADMIN) {
      where.status = { in: ['PENDING_HR', 'PENDING_SUPER_ADMIN'] };
    } else if (role === UserRole.HR) {
      const juniors = await prisma.authorityConnection.findMany({
        where: { authorityUserId: userId, connectionType: 'HR_AUTHORITY', status: 'ACTIVE' },
        select: { userId: true }
      });
      const juniorUserIds = juniors.map(j => j.userId);
      const juniorEmployees = await prisma.employee.findMany({
        where: { userId: { in: juniorUserIds } },
        select: { id: true }
      });
      where.status = 'PENDING_HR';
      where.employeeId = { in: juniorEmployees.map(e => e.id) };
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: { employee: { include: { department: true } }, leaveType: true, approvals: { include: { approver: { include: { employee: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: requests });
  } catch (err) { return res.status(500).json({ success: false, message: 'Failed to fetch HR pending leave requests' }); }
});

// POST /api/leave/requests
router.post('/requests', authenticate, validateBody(createLeaveSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    if (!employeeId) {
      return res.status(403).json({ success: false, message: 'User does not have an employee profile.' });
    }

    const { leaveTypeId, fromDate, toDate, reason } = req.body;
    const startDate = new Date(fromDate);
    const endDate = new Date(toDate);
    const diffMs = endDate.getTime() - startDate.getTime();
    const totalDays = req.body.totalDays || Math.ceil(diffMs / (1000 * 60 * 60 * 24)) + 1;
    const submitterRole = req.user!.role as string;

    if (endDate < startDate) {
      return res.status(400).json({ success: false, message: 'To Date cannot be earlier than From Date.' });
    }

    // 1. Check Leave Balance
    const balance = await prisma.leaveBalance.findUnique({
      where: { employeeId_leaveTypeId: { employeeId, leaveTypeId } },
      include: { leaveType: true }
    });

    if (!balance) {
      return res.status(400).json({ success: false, message: 'Leave balance not initialized for this leave type.' });
    }

    const availableDays = balance.totalDays - balance.usedDays - balance.pendingDays;
    if (totalDays > availableDays) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. Available: ${availableDays} days, Requested: ${totalDays} days.`
      });
    }

    // 2. Overlapping check
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_SUPER_ADMIN', 'APPROVED'] },
        OR: [{ fromDate: { lte: endDate }, toDate: { gte: startDate } }]
      }
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active or pending leave request covering these dates.'
      });
    }

    // 3. Determine initial status based on submitter's role
    // - EMPLOYEE → PENDING_MANAGER (normal flow)
    // - MANAGER  → PENDING_SUPER_ADMIN (goes to HR + Super Admin)
    // - HR       → PENDING_SUPER_ADMIN (goes to Super Admin only)
    // - SUPER_ADMIN → auto-APPROVED
    let initialStatus = 'PENDING_MANAGER';
    if (submitterRole === UserRole.MANAGER || submitterRole === UserRole.HR) {
      initialStatus = 'PENDING_SUPER_ADMIN';
    } else if (submitterRole === UserRole.SUPER_ADMIN) {
      initialStatus = 'APPROVED';
    }

    // 4. Create request & update pending balance
    const [createdRequest] = await prisma.$transaction([
      prisma.leaveRequest.create({
        data: {
          employeeId,
          leaveTypeId,
          fromDate: startDate,
          toDate: endDate,
          totalDays,
          reason,
          status: initialStatus,
          submitterRole
        },
        include: {
          employee: { include: { department: true } },
          leaveType: true
        }
      }),
      prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { pendingDays: { increment: totalDays } }
      })
    ]);

    const employee = createdRequest.employee;

    // 5. Notifications — dynamic authority-based routing
    await prisma.notification.create({
      data: {
        userId: req.user!.userId,
        title: 'Leave Request Submitted',
        message: `Your ${balance.leaveType.name} request for ${totalDays} day(s) from ${fromDate} to ${toDate} has been submitted.`,
        type: 'INFO',
        metadata: JSON.stringify({ requestId: createdRequest.id })
      }
    });

    if (submitterRole === UserRole.EMPLOYEE || submitterRole === UserRole.MANAGER || submitterRole === UserRole.HR) {
      // Look up connected manager authority for this employee
      const managerConn = await prisma.authorityConnection.findFirst({
        where: {
          userId: req.user!.userId,
          connectionType: 'REPORTING_MANAGER',
          status: 'ACTIVE'
        }
      });

      if (managerConn) {
        // Check for temporary delegation
        const now = new Date();
        const delegation = await prisma.temporaryDelegation.findFirst({
          where: {
            fromUserId: managerConn.authorityUserId,
            connectionType: 'REPORTING_MANAGER',
            isActive: true,
            startDate: { lte: now },
            endDate: { gte: now }
          }
        });
        const effectiveManagerId = delegation ? delegation.toUserId : managerConn.authorityUserId;

        await prisma.notification.create({
          data: {
            userId: effectiveManagerId,
            title: 'New Leave Request',
            message: `${employee.firstName} ${employee.lastName} (${employee.employeeCode}) applied for ${balance.leaveType.name} (${totalDays} days). Please review.`,
            type: 'APPROVAL_REQUEST',
            priority: 'NORMAL',
            metadata: JSON.stringify({ requestId: createdRequest.id, requestType: 'LEAVE' })
          }
        });
        emitToUser(effectiveManagerId, 'leave:new_request', {
          requestId: createdRequest.id,
          employeeName: `${employee.firstName} ${employee.lastName}`,
          totalDays,
          leaveType: balance.leaveType.name
        });
      } else {
        // No authority connection — fallback: notify all managers in department (backwards compat)
        const managers = await prisma.user.findMany({ where: { role: 'MANAGER', isActive: true } });
        await Promise.all(managers.map(mgr =>
          prisma.notification.create({
            data: {
              userId: mgr.id,
              title: 'New Leave Request (No Authority Assigned)',
              message: `${employee.firstName} ${employee.lastName} applied for ${balance.leaveType.name} (${totalDays} days). Employee has no connected manager — please review or assign authority.`,
              type: 'APPROVAL_REQUEST',
              priority: 'HIGH',
              metadata: JSON.stringify({ requestId: createdRequest.id, requestType: 'LEAVE' })
            }
          })
        ));
      }
    }

    await logAudit({
      userId: req.user!.userId,
      action: 'LEAVE_REQUEST_CREATED',
      entity: 'LeaveRequest',
      entityId: createdRequest.id,
      newValues: { leaveTypeId, fromDate, toDate, totalDays, reason },
      req
    });

    return res.status(201).json({ success: true, data: createdRequest });
  } catch (err: any) {
    console.error('Submit leave error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit leave request.' });
  }
});

// PATCH /api/leave/requests/:id/review (Manager / HR / GM / Super Admin)
router.patch('/:id/review', authenticate, requireRoles(UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN, UserRole.GM as any), validateBody(reviewLeaveSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, status, comments } = req.body;
    const resolvedAction = action || (status === 'APPROVED' ? 'APPROVE' : status === 'REJECTED' ? 'REJECT' : status === 'SENT_BACK' ? 'SEND_BACK' : null);
    if (!resolvedAction) return res.status(400).json({ success: false, message: 'action or status required' });
    const approverRole = req.user!.role as UserRole;
    const approverUserId = req.user!.userId;

    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: { include: { user: true, department: true } },
        leaveType: true
      }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Leave request not found.' });
    }

    if (resolvedAction === 'SEND_BACK' && (!comments || comments.trim().length === 0)) {
      return res.status(400).json({ success: false, message: 'Send Back requires a mandatory comment explaining what needs to be corrected.' });
    }

    if (resolvedAction === 'REJECT' && (!comments || comments.trim().length === 0)) {
      return res.status(400).json({ success: false, message: 'Rejection requires a mandatory comment explaining the reason.' });
    }

    let nextStatus = request.status;

    if (resolvedAction === 'SEND_BACK') {
      nextStatus = 'SENT_BACK';
    } else if (resolvedAction === 'APPROVE') {
      if (approverRole === UserRole.MANAGER) {
        if (request.leaveType.requiresHrApproval) {
          nextStatus = 'PENDING_HR';
        } else if ((request.leaveType as any).requiresGmApproval) {
          nextStatus = 'PENDING_GM';
        } else {
          nextStatus = 'APPROVED';
        }
      } else if (approverRole === UserRole.HR) {
        nextStatus = 'APPROVED';
      } else if (approverRole === 'GM' as any || approverRole === UserRole.SUPER_ADMIN) {
        nextStatus = 'APPROVED';
      }
    } else {
      nextStatus = 'REJECTED';
    }

    await prisma.$transaction(async (tx) => {
      // Record Approval log
      await tx.approval.create({
        data: {
          requestType: 'LEAVE',
          requestId: request.id,
          leaveRequestId: request.id,
          approverId: approverUserId,
          approverRole: approverRole === UserRole.SUPER_ADMIN ? 'SUPER_ADMIN' : approverRole,
          action: resolvedAction,
          status: resolvedAction === 'APPROVE' ? 'APPROVED' : resolvedAction === 'REJECT' ? 'REJECTED' : 'SENT_BACK',
          comments: comments || null,
          approvedAt: new Date()
        }
      });

      // Update request status + sendBackReason
      await tx.leaveRequest.update({
        where: { id: request.id },
        data: {
          status: nextStatus,
          sendBackReason: resolvedAction === 'SEND_BACK' ? (comments || null) : undefined
        }
      });

      // Update LeaveBalance
      const balance = await tx.leaveBalance.findUnique({
        where: {
          employeeId_leaveTypeId: {
            employeeId: request.employeeId,
            leaveTypeId: request.leaveTypeId
          }
        }
      });

      if (balance) {
        if (nextStatus === 'APPROVED') {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              pendingDays: { decrement: request.totalDays },
              usedDays: { increment: request.totalDays }
            }
          });
        } else if (nextStatus === 'REJECTED' || nextStatus === 'SENT_BACK') {
          await tx.leaveBalance.update({
            where: { id: balance.id },
            data: {
              pendingDays: { decrement: request.totalDays }
            }
          });
        }
      }
    });

    // Notify Employee
    const notificationTitle = resolvedAction === 'APPROVE'
      ? (nextStatus === 'APPROVED' ? 'Leave Request Approved ✅' : 'Leave Request Approved by Manager')
      : resolvedAction === 'SEND_BACK'
        ? 'Leave Request Sent Back for Correction'
        : 'Leave Request Rejected';

    const notificationMessage = resolvedAction === 'APPROVE'
      ? (nextStatus === 'APPROVED' ? `Your ${request.leaveType.name} request for ${request.totalDays} days is fully approved.` : `Approved by manager. Awaiting further approval.`)
      : resolvedAction === 'SEND_BACK'
        ? `Your leave request was sent back for correction. Reason: ${comments}`
        : `Your leave request was rejected. Reason: ${comments}`;

    const notifType = resolvedAction === 'APPROVE' ? 'REQUEST_APPROVED' : resolvedAction === 'SEND_BACK' ? 'REQUEST_SENT_BACK' : 'REQUEST_REJECTED';
    const notifPriority = resolvedAction === 'REJECT' ? 'HIGH' : 'NORMAL';

    await prisma.notification.create({
      data: {
        userId: request.employee.userId,
        title: notificationTitle,
        message: notificationMessage,
        type: notifType,
        priority: notifPriority,
        metadata: JSON.stringify({ requestId: request.id, status: nextStatus })
      }
    });

    emitToUser(request.employee.userId, 'leave:status_updated', {
      requestId: request.id,
      status: nextStatus,
      message: notificationMessage
    });

    // If moving to PENDING_HR, notify the employee's specific HR authority
    if (nextStatus === 'PENDING_HR') {
      const hrConn = await prisma.authorityConnection.findFirst({
        where: {
          userId: request.employee.userId,
          connectionType: 'HR_AUTHORITY',
          status: 'ACTIVE'
        }
      });
      const hrTargetId = hrConn?.authorityUserId;
      if (hrTargetId) {
        await prisma.notification.create({
          data: {
            userId: hrTargetId,
            title: 'Leave Request Awaiting HR Approval',
            message: `${request.employee.firstName} ${request.employee.lastName}'s ${request.leaveType.name} leave (${request.totalDays} days) was approved by manager and now needs your approval.`,
            type: 'APPROVAL_REQUEST',
            priority: 'NORMAL',
            metadata: JSON.stringify({ requestId: request.id, requestType: 'LEAVE' })
          }
        });
        emitToUser(hrTargetId, 'leave:pending_hr', {
          requestId: request.id,
          employeeName: `${request.employee.firstName} ${request.employee.lastName}`,
          totalDays: request.totalDays
        });
      } else {
        // Fallback: notify all HR
        emitToRole(UserRole.HR, 'leave:pending_hr', {
          requestId: request.id,
          employeeName: `${request.employee.firstName} ${request.employee.lastName}`,
          totalDays: request.totalDays
        });
      }
    }

    await logAudit({
      userId: approverUserId,
      action: `LEAVE_${resolvedAction}_BY_${approverRole}`,
      entity: 'LeaveRequest',
      entityId: request.id,
      newValues: { status: nextStatus, comments },
      req
    });

    return res.json({ success: true, message: `Request successfully ${resolvedAction.toLowerCase()}d.`, status: nextStatus });
  } catch (err: any) {
    console.error('Review leave error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process approval review.' });
  }
});

// Alias: PATCH /api/leave/requests/:id/review — frontend calls this path
// The main route is /:id/review, this handles the /requests/:id/review variant
router.patch('/requests/:id/review', authenticate, requireRoles(UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN), validateBody(reviewLeaveSchema), async (req: AuthenticatedRequest, res: Response) => {
  // Redirect internally to same handler by calling the base route logic
  req.params.id = req.params.id;
  // Re-use same logic inline
  try {
    const { id } = req.params;
    const { action, status, comments } = req.body;
    const resolvedAction = action || (status === 'APPROVED' ? 'APPROVE' : status === 'REJECTED' ? 'REJECT' : null);
    if (!resolvedAction) return res.status(400).json({ success: false, message: 'action or status required' });
    const approverRole = req.user!.role as UserRole;
    const approverUserId = req.user!.userId;
    const request = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: { include: { user: true, department: true } }, leaveType: true }
    });
    if (!request) return res.status(404).json({ success: false, message: 'Leave request not found.' });
    if (resolvedAction === 'REJECT' && (!comments || !comments.trim())) {
      return res.status(400).json({ success: false, message: 'Rejection requires a comment.' });
    }
    let nextStatus = request.status;
    if (resolvedAction === 'APPROVE') {
      if (approverRole === UserRole.MANAGER) {
        nextStatus = request.leaveType.requiresHrApproval ? 'PENDING_HR' : 'APPROVED';
      } else {
        nextStatus = 'APPROVED';
      }
    } else {
      nextStatus = 'REJECTED';
    }
    await prisma.$transaction(async (tx) => {
      await tx.approval.create({
        data: {
          requestType: 'LEAVE', requestId: id, leaveRequestId: id,
          approverId: approverUserId,
          approverRole: approverRole === UserRole.SUPER_ADMIN ? 'HR' : approverRole,
          status: resolvedAction === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          comments: comments || null, approvedAt: new Date()
        }
      });
      await tx.leaveRequest.update({ where: { id }, data: { status: nextStatus } });
    });
    return res.json({ success: true, message: `Leave request ${resolvedAction.toLowerCase()}d.`, status: nextStatus });
  } catch (err: any) {
    console.error('Review leave (alias) error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process leave review.' });
  }
});

export default router;
