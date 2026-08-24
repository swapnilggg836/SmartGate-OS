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
}
