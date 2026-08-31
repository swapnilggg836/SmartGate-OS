import cron from 'node-cron';
import { prisma } from '../lib/prisma';
import { emitToRole, emitToUser } from '../lib/socket';
import { UserRole } from '@smart-gate/types';

export function startBackgroundJobs() {
  console.log('⏰ Starting automated background jobs (Gate Pass Expiry & Late Return Detector)...');

  // 1. Run every 5 minutes: Check and expire elapsed unused gate passes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const expiredPasses = await prisma.gatePass.updateMany({
        where: {
          status: 'ACTIVE',
          validUntil: { lt: now },
          gateLogs: {
            none: { exitStatus: 'EXITED' } // only expire if unused
          }
        },
        data: { status: 'EXPIRED' }
      });

      if (expiredPasses.count > 0) {
        console.log(`🧹 Auto-expired ${expiredPasses.count} unused gate pass(es) past validity window.`);
      }
    } catch (err) {
      console.error('Error running gate pass expiry job:', err);
    }
  });

  // 2. Run every 5 minutes: Check for unreturned employees past expected return time
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const overdueLogs = await prisma.gateLog.findMany({
        where: {
          exitStatus: 'EXITED',
          returnStatus: 'PENDING',
          expectedReturnTime: { lt: now }
        },
        include: {
          employee: {
            include: { department: true, user: true }
          },
          gatePass: {
            include: { exitRequest: true }
          }
        }
      });

      for (const log of overdueLogs) {
        // Flag late return
        await prisma.gateLog.update({
          where: { id: log.id },
          data: { returnStatus: 'LATE_RETURN' }
        });

        const timeExpected = log.gatePass.exitRequest.expectedReturnTime;
        const employeeName = `${log.employee.firstName} ${log.employee.lastName}`;

        // In-app alert
        await prisma.notification.create({
          data: {
            userId: log.employee.userId,
            title: '⚠️ Exceeded Return Time',
            message: `You were expected back by ${timeExpected}. Please check in with security immediately.`,
            type: 'LATE_RETURN_ALERT'
          }
        });

        emitToRole(UserRole.MANAGER, 'gate:late_return_alert', {
          employeeName,
          employeeCode: log.employee.employeeCode,
          department: log.employee.department?.name,
          expectedReturnTime: timeExpected,
          passNumber: log.gatePass.passNumber
        });

        emitToRole(UserRole.HR, 'gate:late_return_alert', {
          employeeName,
          employeeCode: log.employee.employeeCode,
          department: log.employee.department?.name,
          expectedReturnTime: timeExpected,
          passNumber: log.gatePass.passNumber
        });
      }
    } catch (err) {
      console.error('Error running late return detector:', err);
    }
  });

  // 3. Every 5 minutes: Auto-expire unused VisitorPasses past validUntil
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const expiredPasses = await prisma.visitorPass.updateMany({
        where: { status: 'ACTIVE', validUntil: { lt: now } },
        data: { status: 'EXPIRED' },
      });
      if (expiredPasses.count > 0) {
        // Also mark the visit as EXPIRED if still APPROVED/PENDING
        await prisma.visitorVisit.updateMany({
          where: {
            status: { in: ['APPROVED', 'PENDING_HOST', 'WAITING'] },
            visitDate: { lt: new Date(now.setHours(0, 0, 0, 0)) },
          },
          data: { status: 'EXPIRED' },
        });
        console.log(`🎫 Auto-expired ${expiredPasses.count} visitor pass(es).`);
      }
    } catch (err) {
      console.error('Error running visitor pass expiry job:', err);
    }
  });

  // 4. Every 5 minutes: Detect overdue visitors (CHECKED_IN past expectedExitTime)
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();
      const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      // Find CHECKED_IN visitors whose expected exit time has passed today
      const overdueVisits = await prisma.visitorVisit.findMany({
        where: {
          status: 'CHECKED_IN',
          expectedExitTime: { lt: nowHHMM },
          visitDate: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
            lt: new Date(new Date().setHours(23, 59, 59, 999)),
          },
        },
        include: {
          visitor: true,
          hostUser: { select: { id: true, email: true } },
        },
      });

      for (const visit of overdueVisits) {
        await prisma.visitorVisit.update({
          where: { id: visit.id },
          data: { status: 'OVERDUE' },
        });

        // Notify host
        await prisma.notification.create({
          data: {
            userId: visit.hostUserId,
            title: '⚠️ Visitor Overdue',
            message: `${visit.visitor.fullName} was expected to leave at ${visit.expectedExitTime} but is still inside.`,
            type: 'LATE_RETURN_ALERT',
            priority: 'HIGH',
            metadata: JSON.stringify({ visitId: visit.visitId }),
          },
        });

        emitToRole(UserRole.SECURITY_GUARD, 'visitor:overdue', {
          visitId: visit.visitId,
          visitorName: visit.visitor.fullName,
          expectedExitTime: visit.expectedExitTime,
        });
        emitToUser(visit.hostUserId, 'visitor:overdue', {
          visitId: visit.visitId,
          visitorName: visit.visitor.fullName,
        });
      }

      if (overdueVisits.length > 0) {
        console.log(`⚠️ Marked ${overdueVisits.length} visitor(s) as OVERDUE.`);
      }
    } catch (err) {
      console.error('Error running visitor overdue detector:', err);
    }
  });
}
