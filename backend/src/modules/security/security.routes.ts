import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { logAudit } from '../../lib/audit';
import { emitToUser, emitToRole, emitBroadcast } from '../../lib/socket';
import { sendEmailNotification, sendPushNotification } from '../../lib/email';
import { UserRole, ExitStatus, ReturnStatus, AttendanceStatus, NotificationType } from '@smart-gate/types';

const router = Router();

const exitLogSchema = z.object({
  gatePassId: z.string().min(1),
  notes: z.string().optional()
});

const returnLogSchema = z.object({
  gatePassId: z.string().min(1),
  notes: z.string().optional()
});

// GET /api/gate-logs
router.get('/', authenticate, requireRoles(UserRole.SECURITY_GUARD, UserRole.HR, UserRole.SUPER_ADMIN, UserRole.MANAGER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, date } = req.query;

    const where: any = {};
    if (status) {
      where.OR = [
        { exitStatus: String(status) },
        { returnStatus: String(status) }
      ];
    }

    if (date) {
      const queryDate = new Date(String(date));
      const nextDate = new Date(queryDate);
      nextDate.setDate(queryDate.getDate() + 1);
      where.createdAt = {
        gte: queryDate,
        lt: nextDate
      };
    }

    const logs = await prisma.gateLog.findMany({
      where,
      include: {
        employee: {
          include: {
            department: true,
            user: { select: { email: true } }
          }
        },
        gatePass: {
          include: { exitRequest: true }
        },
        securityUser: {
          include: {
            employee: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch gate logs' });
  }
});

// GET /api/gate-logs/today
router.get('/today', authenticate, requireRoles(UserRole.SECURITY_GUARD, UserRole.HR, UserRole.SUPER_ADMIN, UserRole.MANAGER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const logs = await prisma.gateLog.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        employee: {
          include: { department: true }
        },
        gatePass: {
          include: { exitRequest: true }
        },
        securityUser: {
          include: { employee: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch today gate logs' });
  }
});

// POST /api/gate-logs/exit (Security Guard records Actual Exit)
router.post('/exit', authenticate, requireRoles(UserRole.SECURITY_GUARD, UserRole.HR, UserRole.SUPER_ADMIN), validateBody(exitLogSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gatePassId, notes } = req.body;
    const securityUserId = req.user!.userId;

    const gatePass = await prisma.gatePass.findUnique({
      where: { id: gatePassId },
      include: {
        employee: { include: { user: true, department: true } },
        exitRequest: true,
        gateLogs: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    if (!gatePass) {
      return res.status(404).json({ success: false, message: 'Gate pass not found.' });
    }

    if (gatePass.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, message: `Gate pass is ${gatePass.status}. Exit cannot be logged.` });
    }

    const currentLog = gatePass.gateLogs[0];
    if (currentLog && currentLog.exitStatus === 'EXITED') {
      return res.status(400).json({ success: false, message: 'Exit has already been recorded for this pass.' });
    }

    const actualExitTime = new Date();

    let updatedLog;
    if (currentLog) {
      updatedLog = await prisma.gateLog.update({
        where: { id: currentLog.id },
        data: {
          actualExitTime,
          exitStatus: 'EXITED',
          securityUserId,
          notes: notes || currentLog.notes
        },
        include: {
          employee: { include: { department: true } },
          gatePass: true
        }
      });
    } else {
      updatedLog = await prisma.gateLog.create({
        data: {
          gatePassId: gatePass.id,
          employeeId: gatePass.employeeId,
          approvedExitTime: new Date(gatePass.validFrom),
          actualExitTime,
          expectedReturnTime: new Date(gatePass.validUntil),
          exitStatus: 'EXITED',
          returnStatus: 'PENDING',
          securityUserId,
          notes
        },
        include: {
          employee: { include: { department: true } },
          gatePass: true
        }
      });
    }

    // Update Attendance status to ON_EXIT_PERMISSION
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.attendance.upsert({
      where: {
        employeeId_date: {
          employeeId: gatePass.employeeId,
          date: today
        }
      },
      update: { status: 'ON_EXIT_PERMISSION' },
      create: {
        employeeId: gatePass.employeeId,
        date: today,
        checkInTime: new Date(),
        status: 'ON_EXIT_PERMISSION'
      }
    });

    // Notify Employee
    const timeFormatted = actualExitTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    await prisma.notification.create({
      data: {
        userId: gatePass.employee.userId,
        title: 'Exit Logged at Gate',
        message: `Your exit was logged at ${timeFormatted}. Please return before ${gatePass.exitRequest.expectedReturnTime}.`,
        type: 'GATE_EXIT_LOGGED',
        metadata: JSON.stringify({ passNumber: gatePass.passNumber, exitTime: actualExitTime })
      }
    });

    emitToUser(gatePass.employee.userId, 'gate:exit_logged', {
      passNumber: gatePass.passNumber,
      actualExitTime
    });

    emitBroadcast('gate:activity_update', {
      type: 'EXIT',
      employeeName: `${gatePass.employee.firstName} ${gatePass.employee.lastName}`,
      passNumber: gatePass.passNumber,
      timestamp: actualExitTime
    });

    await logAudit({
      userId: securityUserId,
      action: 'SECURITY_ALLOW_EXIT',
      entity: 'GateLog',
      entityId: updatedLog.id,
      newValues: { gatePassId, actualExitTime },
      req
    });

    return res.json({
      success: true,
      message: `Exit successfully recorded for ${gatePass.employee.firstName} ${gatePass.employee.lastName}.`,
      data: updatedLog
    });
  } catch (err: any) {
    console.error('Exit log error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record gate exit.' });
  }
});

// POST /api/gate-logs/return (Security Guard records Actual Return)
router.post('/return', authenticate, requireRoles(UserRole.SECURITY_GUARD, UserRole.HR, UserRole.SUPER_ADMIN), validateBody(returnLogSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { gatePassId, notes } = req.body;
    const securityUserId = req.user!.userId;

    const gatePass = await prisma.gatePass.findUnique({
      where: { id: gatePassId },
      include: {
        employee: { include: { user: true, department: true } },
        exitRequest: true,
        gateLogs: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });

    if (!gatePass) {
      return res.status(404).json({ success: false, message: 'Gate pass not found.' });
    }

    const currentLog = gatePass.gateLogs[0];
    if (!currentLog || currentLog.exitStatus !== 'EXITED') {
      return res.status(400).json({ success: false, message: 'Employee has not been logged as EXITED yet.' });
    }

    if (currentLog.returnStatus === 'RETURNED' || currentLog.returnStatus === 'LATE_RETURN') {
      return res.status(400).json({ success: false, message: 'Return has already been logged for this pass.' });
    }

    const actualReturnTime = new Date();
    const isLate = actualReturnTime > currentLog.expectedReturnTime;
    const returnStatus = isLate ? 'LATE_RETURN' : 'RETURNED';

    const updatedLog = await prisma.gateLog.update({
      where: { id: currentLog.id },
      data: {
        actualReturnTime,
        returnStatus,
        notes: notes ? `${currentLog.notes || ''} | Return: ${notes}` : currentLog.notes
      },
      include: {
        employee: { include: { department: true } },
        gatePass: true
      }
    });

    // Mark GatePass as USED
    await prisma.gatePass.update({
      where: { id: gatePass.id },
      data: { status: 'USED' }
    });

    // Update Attendance back to PRESENT
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.attendance.updateMany({
      where: {
        employeeId: gatePass.employeeId,
        date: today
      },
      data: { status: 'PRESENT' }
    });

    // Notify Employee
    const timeFormatted = actualReturnTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const notificationTitle = isLate ? 'Late Return Recorded' : 'Return Logged Successfully';
    const notificationMsg = isLate
      ? `Your return was recorded at ${timeFormatted}, which exceeds your approved return time of ${gatePass.exitRequest.expectedReturnTime}. Manager & HR have been alerted.`
      : `Your return was logged at ${timeFormatted}. Gate pass ${gatePass.passNumber} completed.`;

    await prisma.notification.create({
      data: {
        userId: gatePass.employee.userId,
        title: notificationTitle,
        message: notificationMsg,
        type: isLate ? 'LATE_RETURN_ALERT' : 'GATE_RETURN_LOGGED',
        metadata: JSON.stringify({ passNumber: gatePass.passNumber, actualReturnTime, isLate })
      }
    });

    // If LATE_RETURN, alert Manager & HR!
    if (isLate) {
      const alertMsg = `⚠️ LATE RETURN ALERT: ${gatePass.employee.firstName} ${gatePass.employee.lastName} returned at ${timeFormatted} (Expected: ${gatePass.exitRequest.expectedReturnTime}).`;

      emitToRole(UserRole.MANAGER, 'gate:late_return_alert', {
        employeeName: `${gatePass.employee.firstName} ${gatePass.employee.lastName}`,
        employeeCode: gatePass.employee.employeeCode,
        department: gatePass.employee.department?.name,
        expectedReturnTime: gatePass.exitRequest.expectedReturnTime,
        actualReturnTime: timeFormatted,
        passNumber: gatePass.passNumber
      });

      emitToRole(UserRole.HR, 'gate:late_return_alert', {
        employeeName: `${gatePass.employee.firstName} ${gatePass.employee.lastName}`,
        employeeCode: gatePass.employee.employeeCode,
        department: gatePass.employee.department?.name,
        expectedReturnTime: gatePass.exitRequest.expectedReturnTime,
        actualReturnTime: timeFormatted,
        passNumber: gatePass.passNumber
      });
    }

    emitToUser(gatePass.employee.userId, 'gate:return_logged', {
      passNumber: gatePass.passNumber,
      actualReturnTime,
      isLate
    });

    emitBroadcast('gate:activity_update', {
      type: 'RETURN',
      employeeName: `${gatePass.employee.firstName} ${gatePass.employee.lastName}`,
      passNumber: gatePass.passNumber,
      timestamp: actualReturnTime,
      isLate
    });

    await logAudit({
      userId: securityUserId,
      action: isLate ? 'SECURITY_LOG_LATE_RETURN' : 'SECURITY_LOG_RETURN',
      entity: 'GateLog',
      entityId: updatedLog.id,
      newValues: { gatePassId, actualReturnTime, returnStatus, isLate },
      req
    });

    return res.json({
      success: true,
      message: `Return recorded for ${gatePass.employee.firstName} ${gatePass.employee.lastName}.${isLate ? ' (FLAGGED: LATE RETURN)' : ''}`,
      isLate,
      data: updatedLog
    });
  } catch (err: any) {
    console.error('Return log error:', err);
    return res.status(500).json({ success: false, message: 'Failed to record gate return.' });
  }
});

export default router;
