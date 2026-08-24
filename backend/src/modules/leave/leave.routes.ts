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
  action: z.enum(['APPROVE', 'REJECT']).optional(),
  status: z.enum(['APPROVED', 'REJECTED']).optional(),
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

// GET /api/leave/balances
router.get('/balances', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetEmployeeId = (req.query.employeeId as string) || req.user?.employeeId;

    if (!targetEmployeeId) {
      return res.status(400).json({ success: false, message: 'No employee record linked.' });
    }

    const balances = await prisma.leaveBalance.findMany({
      where: { employeeId: targetEmployeeId },
      include: { leaveType: true }
    });

    return res.json({ success: true, data: balances });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch leave balances' });
  }
});

// GET /api/leave/requests
router.get('/requests', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, employeeId } = req.query;
    const role = req.user!.role;
    const userEmployeeId = req.user!.employeeId;

    const where: any = {};

    if (status) {
      where.status = String(status);
    }

    if (role === UserRole.EMPLOYEE) {
      where.employeeId = userEmployeeId;
    } else if (role === UserRole.MANAGER) {
      // Manager views team/department requests
      const managerEmp = await prisma.employee.findUnique({
        where: { id: userEmployeeId }
      });
      if (managerEmp) {
        where.employee = { departmentId: managerEmp.departmentId };
      }
    } else if (employeeId) {
      where.employeeId = String(employeeId);
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

// GET /api/leave/requests/pending (Manager sees employee leaves pending their approval)
router.get('/requests/pending', authenticate, requireRoles(UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const role = req.user!.role;
    const userEmployeeId = req.user!.employeeId;
    let where: any = {};

    if (role === UserRole.MANAGER) {
      // Manager sees PENDING_MANAGER requests from their department employees only
      where.status = 'PENDING_MANAGER';
      if (userEmployeeId) {
        const managerEmp = await prisma.employee.findUnique({ where: { id: userEmployeeId } });
        if (managerEmp) where.employee = { departmentId: managerEmp.departmentId };
      }
    } else if (role === UserRole.HR) {
      // HR sees PENDING_HR + PENDING_SUPER_ADMIN (from managers who applied leave)
      where.status = { in: ['PENDING_HR', 'PENDING_SUPER_ADMIN'] };
    } else {
      // Super Admin sees everything pending
      where.status = { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_SUPER_ADMIN'] };
    }

    const requests = await prisma.leaveRequest.findMany({
      where,
      include: { employee: { include: { department: true } }, leaveType: true, approvals: { include: { approver: { include: { employee: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: requests });
  } catch (err) { return res.status(500).json({ success: false, message: 'Failed to fetch pending leave requests' }); }
});

// GET /api/leave/requests/pending-hr (HR and Super Admin)
router.get('/requests/pending-hr', authenticate, requireRoles(UserRole.HR, UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    // HR sees PENDING_HR; Super Admin sees PENDING_HR + PENDING_SUPER_ADMIN
    const role = req.user!.role;
    const statusFilter = role === UserRole.SUPER_ADMIN
      ? { in: ['PENDING_HR', 'PENDING_SUPER_ADMIN'] }
      : 'PENDING_HR';
    const requests = await prisma.leaveRequest.findMany({
      where: { status: statusFilter },
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

    // 5. Notifications — role-based escalation
    // Employee always gets confirmation
    await prisma.notification.create({
      data: {
        userId: req.user!.userId,
        title: 'Leave Request Submitted',
        message: `Your ${balance.leaveType.name} request for ${totalDays} day(s) from ${fromDate} to ${toDate} has been submitted.`,
        type: 'INFO',
        metadata: JSON.stringify({ requestId: createdRequest.id })
      }
    });

    if (submitterRole === UserRole.EMPLOYEE) {
      // Normal flow: notify managers of this department
      emitToRole(UserRole.MANAGER, 'leave:new_request', {
        requestId: createdRequest.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        department: employee.department?.name,
        totalDays,
        leaveType: balance.leaveType.name
      });

      // Also create in-app notification for Managers
      const managers = await prisma.user.findMany({ where: { role: 'MANAGER', isActive: true } });
      await Promise.all(managers.map(mgr =>
        prisma.notification.create({
          data: {
            userId: mgr.id,
            title: 'New Leave Request',
            message: `${employee.firstName} ${employee.lastName} applied for ${balance.leaveType.name} (${totalDays} days). Please review.`,
            type: 'ACTION_REQUIRED',
            metadata: JSON.stringify({ requestId: createdRequest.id })
          }
        })
      ));
    } else if (submitterRole === UserRole.MANAGER) {
      // Manager applying leave: notify HR + Super Admin
      const hrAndAdmins = await prisma.user.findMany({
        where: { role: { in: ['HR', 'SUPER_ADMIN'] }, isActive: true }
      });
      await Promise.all(hrAndAdmins.map(u =>
        prisma.notification.create({
          data: {
            userId: u.id,
            title: '📋 Manager Leave Request',
            message: `Manager ${employee.firstName} ${employee.lastName} applied for ${balance.leaveType.name} (${totalDays} days). Needs your approval.`,
            type: 'ACTION_REQUIRED',
            metadata: JSON.stringify({ requestId: createdRequest.id })
          }
        })
      ));
      emitToRole(UserRole.HR, 'leave:manager_request', { requestId: createdRequest.id, employeeName: `${employee.firstName} ${employee.lastName}`, totalDays, leaveType: balance.leaveType.name });
      emitToRole(UserRole.SUPER_ADMIN, 'leave:manager_request', { requestId: createdRequest.id, employeeName: `${employee.firstName} ${employee.lastName}`, totalDays, leaveType: balance.leaveType.name });
    } else if (submitterRole === UserRole.HR) {
      // HR applying leave: notify Super Admin only
      const superAdmins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN', isActive: true } });
      await Promise.all(superAdmins.map(u =>
        prisma.notification.create({
          data: {
            userId: u.id,
            title: '📋 HR Leave Request',
            message: `HR ${employee.firstName} ${employee.lastName} applied for ${balance.leaveType.name} (${totalDays} days). Needs your approval.`,
            type: 'ACTION_REQUIRED',
            metadata: JSON.stringify({ requestId: createdRequest.id })
          }
        })
      ));
      emitToRole(UserRole.SUPER_ADMIN, 'leave:hr_request', { requestId: createdRequest.id, employeeName: `${employee.firstName} ${employee.lastName}`, totalDays, leaveType: balance.leaveType.name });
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

// PATCH /api/leave/requests/:id/review (Manager / HR)
router.patch('/:id/review', authenticate, requireRoles(UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN), validateBody(reviewLeaveSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, status, comments } = req.body;
    const resolvedAction = action || (status === 'APPROVED' ? 'APPROVE' : status === 'REJECTED' ? 'REJECT' : null);
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

    if (resolvedAction === 'REJECT' && (!comments || comments.trim().length === 0)) {
      return res.status(400).json({ success: false, message: 'Rejection requires a mandatory comment explaining the reason.' });
    }

    let nextStatus = request.status;

    if (resolvedAction === 'APPROVE') {
      if (approverRole === UserRole.MANAGER) {
        if (request.leaveType.requiresHrApproval) {
          nextStatus = 'PENDING_HR';
        } else {
          nextStatus = 'APPROVED';
        }
      } else if (approverRole === UserRole.HR || approverRole === UserRole.SUPER_ADMIN) {
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
          approverRole: approverRole === UserRole.SUPER_ADMIN ? 'HR' : approverRole,
          status: resolvedAction === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          comments: comments || null,
          approvedAt: new Date()
        }
      });

      // Update request status
      await tx.leaveRequest.update({
        where: { id: request.id },
        data: { status: nextStatus }
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
        } else if (nextStatus === 'REJECTED') {
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
      ? (nextStatus === 'APPROVED' ? 'Leave Request Approved' : 'Leave Request Approved by Manager')
      : 'Leave Request Rejected';

    const notificationMessage = resolvedAction === 'APPROVE'
      ? (nextStatus === 'APPROVED' ? `Your ${request.leaveType.name} request for ${request.totalDays} days is fully approved.` : `Approved by manager. Awaiting final HR confirmation.`)
      : `Your leave request was rejected. Reason: ${comments}`;

    await prisma.notification.create({
      data: {
        userId: request.employee.userId,
        title: notificationTitle,
        message: notificationMessage,
        type: resolvedAction === 'APPROVE' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
        metadata: JSON.stringify({ requestId: request.id, status: nextStatus })
      }
    });

    emitToUser(request.employee.userId, 'leave:status_updated', {
      requestId: request.id,
      status: nextStatus,
      message: notificationMessage
    });

    if (nextStatus === 'PENDING_HR') {
      emitToRole(UserRole.HR, 'leave:pending_hr', {
        requestId: request.id,
        employeeName: `${request.employee.firstName} ${request.employee.lastName}`,
        totalDays: request.totalDays
      });
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
