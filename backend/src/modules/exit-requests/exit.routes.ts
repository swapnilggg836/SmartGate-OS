import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { logAudit } from '../../lib/audit';
import { emitToUser, emitToRole, emitBroadcast } from '../../lib/socket';
import { sendEmailNotification, sendPushNotification } from '../../lib/email';
import { UserRole } from '@smart-gate/types';

const router = Router();

const createExitSchema = z.object({
  exitDate: z.string(),
  exitTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  expectedReturnTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format (HH:mm)'),
  destination: z.string().min(2),
  reason: z.string().min(3),
  description: z.string().optional(),
  requiresHrApproval: z.boolean().optional().default(false),
  isUrgent: z.boolean().optional().default(false)
});

const reviewExitSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']).optional(),
  status: z.enum(['APPROVED', 'REJECTED']).optional(),
  comments: z.string().optional()
}).refine(d => d.action || d.status, { message: 'action or status required' });

// Helper: Generate unique Gate Pass Number
async function generateUniquePassNumber(): Promise<string> {
  const currentYear = new Date().getFullYear();
  const count = await prisma.gatePass.count();
  const nextSeq = String(count + 1).padStart(5, '0');
  return `GP-${currentYear}-${nextSeq}`;
}

// Helper: Auto-generate Digital Gate Pass & initial GateLog
async function issueGatePass(exitRequestId: string, tx?: any) {
  const db = tx || prisma;

  const exitRequest = await db.exitRequest.findUnique({
    where: { id: exitRequestId },
    include: {
      employee: {
        include: {
          department: true,
          user: true
        }
      }
    }
  });

  if (!exitRequest) return null;

  const passNumber = await generateUniquePassNumber();
  const dateStr = exitRequest.exitDate.toISOString().split('T')[0];

  // Calculate validity window: validFrom = exitDate + exitTime - 30m, validUntil = exitDate + expectedReturnTime + 2h
  const [exitH, exitM] = exitRequest.exitTime.split(':').map(Number);
  const [retH, retM] = exitRequest.expectedReturnTime.split(':').map(Number);

  const validFrom = new Date(exitRequest.exitDate);
  validFrom.setHours(exitH, exitM - 30, 0, 0);

  const validUntil = new Date(exitRequest.exitDate);
  validUntil.setHours(retH + 2, retM, 0, 0);

  const qrPayload = JSON.stringify({
    passNumber,
    employeeCode: exitRequest.employee.employeeCode,
    employeeName: `${exitRequest.employee.firstName} ${exitRequest.employee.lastName}`,
    department: exitRequest.employee.department?.name || '',
    date: dateStr,
    exitTime: exitRequest.exitTime,
    expectedReturnTime: exitRequest.expectedReturnTime,
    destination: exitRequest.destination,
    reason: exitRequest.reason,
    validUntil: validUntil.toISOString(),
    status: 'ACTIVE'
  });

  const gatePass = await db.gatePass.create({
    data: {
      passNumber,
      exitRequestId: exitRequest.id,
      employeeId: exitRequest.employeeId,
      qrPayload,
      validFrom,
      validUntil,
      status: 'ACTIVE'
    }
  });

  const [expH, expM] = exitRequest.expectedReturnTime.split(':').map(Number);
  const expectedReturnDateTime = new Date(exitRequest.exitDate);
  expectedReturnDateTime.setHours(expH, expM, 0, 0);

  const approvedExitDateTime = new Date(exitRequest.exitDate);
  approvedExitDateTime.setHours(exitH, exitM, 0, 0);

  await db.gateLog.create({
    data: {
      gatePassId: gatePass.id,
      employeeId: exitRequest.employeeId,
      approvedExitTime: approvedExitDateTime,
      expectedReturnTime: expectedReturnDateTime,
      exitStatus: 'PENDING',
      returnStatus: 'PENDING'
    }
  });

  // Notify Employee & Security Staff
  await prisma.notification.create({
    data: {
      userId: exitRequest.employee.userId,
      title: 'Digital Gate Pass Issued',
      message: `Your Gate Pass ${passNumber} is ready with QR code for gate verification.`,
      type: 'GATE_PASS_GENERATED',
      metadata: JSON.stringify({ passNumber, gatePassId: gatePass.id })
    }
  });

  emitToUser(exitRequest.employee.userId, 'gate_pass:issued', {
    passNumber,
    gatePassId: gatePass.id,
    qrPayload
  });

  emitToRole(UserRole.SECURITY_GUARD, 'security:new_pass_ready', {
    passNumber,
    employeeName: `${exitRequest.employee.firstName} ${exitRequest.employee.lastName}`,
    employeeCode: exitRequest.employee.employeeCode,
    department: exitRequest.employee.department?.name
  });

  await sendEmailNotification({
    to: exitRequest.employee.user.email,
    subject: `Digital Gate Pass Issued: ${passNumber}`,
    html: `<p>Dear ${exitRequest.employee.firstName},</p><p>Your Exit Permission has been approved and Gate Pass <strong>${passNumber}</strong> is active.</p>`
  });

  return gatePass;
}

// GET /api/exit-requests
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, employeeId, date } = req.query;
    const role = req.user!.role;
    const userEmployeeId = req.user!.employeeId;

    const where: any = {};

    if (status) {
      where.status = String(status);
    }

    if (role === UserRole.EMPLOYEE) {
      where.employeeId = userEmployeeId;
    } else if (role === UserRole.MANAGER) {
      const managerEmp = await prisma.employee.findUnique({
        where: { id: userEmployeeId }
      });
      if (managerEmp) {
        where.employee = { departmentId: managerEmp.departmentId };
      }
    } else if (employeeId) {
      where.employeeId = String(employeeId);
    }

    if (date) {
      const queryDate = new Date(String(date));
      const nextDate = new Date(queryDate);
      nextDate.setDate(queryDate.getDate() + 1);
      where.exitDate = {
        gte: queryDate,
        lt: nextDate
      };
    }

    const requests = await prisma.exitRequest.findMany({
      where,
      include: {
        employee: {
          include: {
            department: true,
            user: { select: { email: true } }
          }
        },
        gatePass: {
          include: {
            gateLogs: true
          }
        },
        approvals: {
          include: {
            approver: {
              include: { employee: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch exit requests' });
  }
});

// GET /api/exit-requests/pending (Manager sees pending from their dept)
router.get('/pending', authenticate, requireRoles(UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const role = req.user!.role;
    const userEmployeeId = req.user!.employeeId;
    const where: any = { status: { in: ['PENDING_MANAGER', 'PENDING'] } };
    if (role === UserRole.MANAGER && userEmployeeId) {
      const managerEmp = await prisma.employee.findUnique({ where: { id: userEmployeeId } });
      if (managerEmp) where.employee = { departmentId: managerEmp.departmentId };
    }
    const requests = await prisma.exitRequest.findMany({
      where,
      include: { employee: { include: { department: true, user: { select: { email: true } } } }, approvals: { include: { approver: { include: { employee: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: requests });
  } catch (err) { return res.status(500).json({ success: false, message: 'Failed to fetch pending requests' }); }
});

// GET /api/exit-requests/pending-hr (HR sees manager-approved requests)
router.get('/pending-hr', authenticate, requireRoles(UserRole.HR, UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const requests = await prisma.exitRequest.findMany({
      where: { status: 'PENDING_HR' },
      include: { employee: { include: { department: true, user: { select: { email: true } } } }, approvals: { include: { approver: { include: { employee: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: requests });
  } catch (err) { return res.status(500).json({ success: false, message: 'Failed to fetch HR pending requests' }); }
});

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const request = await prisma.exitRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            department: true,
            user: { select: { email: true } }
          }
        },
        gatePass: {
          include: { gateLogs: true }
        },
        approvals: {
          include: { approver: { include: { employee: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Exit request not found' });
    }

    return res.json({ success: true, data: request });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch exit request' });
  }
});

// POST /api/exit-requests (Employee submit)
router.post('/', authenticate, validateBody(createExitSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    if (!employeeId) {
      return res.status(403).json({ success: false, message: 'No employee profile linked to user account.' });
    }

    const { exitDate, exitTime, expectedReturnTime, destination, reason, description, requiresHrApproval, isUrgent } = req.body;

    const requestDate = new Date(exitDate);
    const [exitH, exitM] = exitTime.split(':').map(Number);
    const [retH, retM] = expectedReturnTime.split(':').map(Number);

    const exitMinutes = exitH * 60 + exitM;
    const returnMinutes = retH * 60 + retM;

    if (returnMinutes <= exitMinutes) {
      return res.status(400).json({
        success: false,
        message: 'Expected return time must be later than exit time.'
      });
    }

    // 1. Employee active verification
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true, department: true }
    });

    if (!employee || !employee.user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Employee account is not active.'
      });
    }

    // 2. Duplicate or overlapping active exit request check
    const existingExit = await prisma.exitRequest.findFirst({
      where: {
        employeeId,
        exitDate: requestDate,
        status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'APPROVED'] },
        OR: [
          {
            AND: [
              { exitTime: { lte: expectedReturnTime } },
              { expectedReturnTime: { gte: exitTime } }
            ]
          }
        ]
      }
    });

    if (existingExit) {
      return res.status(400).json({
        success: false,
        message: 'An existing exit request is already active or pending for this time window.'
      });
    }

    // 3. Check for approved leave covering this date
    const leaveCover = await prisma.leaveRequest.findFirst({
      where: {
        employeeId,
        status: 'APPROVED',
        fromDate: { lte: requestDate },
        toDate: { gte: requestDate }
      }
    });

    if (leaveCover) {
      return res.status(400).json({
        success: false,
        message: 'You have an approved leave scheduled for this date. Exit permission is not applicable.'
      });
    }

    // 4. Create Exit Request
    const createdRequest = await prisma.exitRequest.create({
      data: {
        employeeId,
        exitDate: requestDate,
        exitTime,
        expectedReturnTime,
        destination,
        reason,
        description: description || null,
        requiresHrApproval: Boolean(requiresHrApproval),
        isUrgent: Boolean(isUrgent),
        status: 'PENDING_MANAGER'
      },
      include: {
        employee: { include: { department: true } }
      }
    });

    // Notify employee: submitted confirmation
    await prisma.notification.create({
      data: {
        userId: req.user!.userId,
        title: isUrgent ? '🚨 Urgent Exit Request Submitted' : 'Exit Request Submitted',
        message: `Your exit request for ${exitTime}–${expectedReturnTime} to ${destination} has been submitted for Manager approval.${isUrgent ? ' Marked as URGENT — Super Admin also notified.' : ''}`,
        type: 'INFO',
        metadata: JSON.stringify({ requestId: createdRequest.id })
      }
    });

    // Notify Managers (dept-based)
    emitToRole(UserRole.MANAGER, 'exit:new_request', {
      requestId: createdRequest.id,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeeCode: employee.employeeCode,
      department: employee.department?.name,
      exitDate, exitTime, expectedReturnTime, destination, reason,
      isUrgent: Boolean(isUrgent)
    });

    // Notify Super Admin on URGENT exits
    if (isUrgent) {
      const superAdmins = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN', isActive: true } });
      await Promise.all(superAdmins.map(admin =>
        prisma.notification.create({
          data: {
            userId: admin.id,
            title: '🚨 Urgent Exit Request — Action Required',
            message: `URGENT: ${employee.firstName} ${employee.lastName} (${employee.employeeCode}) needs to exit at ${exitTime}. Destination: ${destination}. Reason: ${reason}`,
            type: 'URGENT',
            metadata: JSON.stringify({ requestId: createdRequest.id, isUrgent: true })
          }
        })
      ));
      emitToRole(UserRole.SUPER_ADMIN, 'exit:urgent_request', {
        requestId: createdRequest.id,
        employeeName: `${employee.firstName} ${employee.lastName}`,
        employeeCode: employee.employeeCode,
        exitTime, destination, reason
      });
    }

    await logAudit({
      userId: req.user!.userId,
      action: 'EXIT_REQUEST_CREATED',
      entity: 'ExitRequest',
      entityId: createdRequest.id,
      newValues: { exitDate, exitTime, expectedReturnTime, destination, reason, isUrgent },
      req
    });

    return res.status(201).json({ success: true, data: createdRequest });
  } catch (err: any) {
    console.error('Create exit request error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit exit request.' });
  }
});

// PATCH /api/exit-requests/:id/review (Manager / HR approval)
router.patch('/:id/review', authenticate, requireRoles(UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN), validateBody(reviewExitSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { action, status, comments } = req.body;
    // Accept both formats: { action: 'APPROVE' } and { status: 'APPROVED' }
    const resolvedAction = action || (status === 'APPROVED' ? 'APPROVE' : status === 'REJECTED' ? 'REJECT' : null);
    if (!resolvedAction) return res.status(400).json({ success: false, message: 'action or status required' });
    const approverRole = req.user!.role as UserRole;
    const approverUserId = req.user!.userId;

    const request = await prisma.exitRequest.findUnique({
      where: { id },
      include: {
        employee: { include: { user: true, department: true } },
        gatePass: true
      }
    });

    if (!request) {
      return res.status(404).json({ success: false, message: 'Exit request not found.' });
    }

    if (request.status === 'APPROVED' || request.status === 'REJECTED') {
      return res.status(400).json({ success: false, message: `Request is already in ${request.status} state.` });
    }

    if (resolvedAction === 'REJECT' && (!comments || comments.trim().length === 0)) {
      return res.status(400).json({ success: false, message: 'Rejection requires a mandatory comment explaining the reason.' });
    }

    let nextStatus = request.status;
    let shouldGeneratePass = false;

    if (resolvedAction === 'APPROVE') {
      if (approverRole === UserRole.MANAGER) {
        if (request.requiresHrApproval) {
          nextStatus = 'PENDING_HR';
        } else {
          nextStatus = 'APPROVED';
          shouldGeneratePass = true;
        }
      } else if (approverRole === UserRole.HR || approverRole === UserRole.SUPER_ADMIN) {
        nextStatus = 'APPROVED';
        shouldGeneratePass = true;
      }
    } else {
      nextStatus = 'REJECTED';
    }

    await prisma.$transaction(async (tx) => {
      // 1. Create Approval Record
      await tx.approval.create({
        data: {
          requestType: 'EXIT',
          requestId: request.id,
          exitRequestId: request.id,
          approverId: approverUserId,
          approverRole: approverRole === UserRole.SUPER_ADMIN ? 'HR' : approverRole,
          status: resolvedAction === 'APPROVE' ? 'APPROVED' : 'REJECTED',
          comments: comments || null,
          approvedAt: new Date()
        }
      });

      // 2. Update ExitRequest status
      await tx.exitRequest.update({
        where: { id: request.id },
        data: { status: nextStatus }
      });
    });

    // 3. Issue Gate Pass if fully approved
    let gatePass = null;
    if (shouldGeneratePass && !request.gatePass) {
      gatePass = await issueGatePass(request.id);
    }

    // 4. Notifications & Live WebSockets
    const notificationTitle = resolvedAction === 'APPROVE'
      ? (nextStatus === 'APPROVED' ? 'Exit Permission Approved' : 'Exit Permission Approved by Manager')
      : 'Exit Request Rejected';

    const notificationMessage = resolvedAction === 'APPROVE'
      ? (nextStatus === 'APPROVED' ? `Your exit request for ${request.exitTime} has been approved. Gate pass generated!` : `Manager approved. Awaiting final HR clearance.`)
      : `Your exit request was rejected. Reason: ${comments}`;

    await prisma.notification.create({
      data: {
        userId: request.employee.userId,
        title: notificationTitle,
        message: notificationMessage,
        type: resolvedAction === 'APPROVE' ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
        metadata: JSON.stringify({ requestId: request.id, status: nextStatus })
      }
    });

    emitToUser(request.employee.userId, 'exit:status_updated', {
      requestId: request.id,
      status: nextStatus,
      message: notificationMessage,
      gatePass
    });

    if (nextStatus === 'PENDING_HR') {
      emitToRole(UserRole.HR, 'exit:pending_hr', {
        requestId: request.id,
        employeeName: `${request.employee.firstName} ${request.employee.lastName}`,
        destination: request.destination
      });
    }

    await logAudit({
      userId: approverUserId,
      action: `EXIT_${resolvedAction}_BY_${approverRole}`,
      entity: 'ExitRequest',
      entityId: request.id,
      newValues: { status: nextStatus, comments },
      req
    });

    return res.json({
      success: true,
      message: `Exit request ${resolvedAction.toLowerCase()}d successfully.`,
      status: nextStatus,
      gatePass
    });
  } catch (err: any) {
    console.error('Review exit request error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process exit request review.' });
  }
});

export default router;
