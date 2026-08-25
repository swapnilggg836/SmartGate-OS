/**
 * Escalation Service
 * 
 * Handles:
 * - Approval reminders (24h no response)
 * - Escalation to GM/SuperAdmin (configurable threshold)
 * - Late return alerts (notify manager + HR)
 * - Critical alerts (long overdue → notify GM)
 * 
 * Call POST /api/escalation/run to trigger a check.
 * In production, schedule this via a cron job (e.g., every 15 minutes).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Configurable thresholds (can be moved to DB config table later)
const REMINDER_AFTER_HOURS = 24;      // Send reminder after 24h of pending
const ESCALATE_AFTER_HOURS = 48;      // Escalate to GM after 48h of no response
const LATE_ALERT_GRACE_MINUTES = 30;  // Allow 30 min grace before sending late alert
const CRITICAL_LATE_HOURS = 2;        // Mark CRITICAL after 2+ hours late

export async function runEscalationCheck() {
  const now = new Date();
  const report = {
    reminders: 0,
    escalations: 0,
    lateAlerts: 0,
    criticalAlerts: 0
  };

  // ─── 1. Leave Request Reminders & Escalation ───────────────────────────────

  const pendingLeaveRequests = await prisma.leaveRequest.findMany({
    where: {
      status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_GM'] }
    },
    include: {
      employee: {
        include: { user: true }
      },
      approvals: {
        where: { status: 'PENDING' },
        include: { approver: true }
      }
    }
  });

  for (const req of pendingLeaveRequests) {
    const ageHours = (now.getTime() - req.createdAt.getTime()) / (1000 * 60 * 60);

    // Reminder at 24h
    if (ageHours >= REMINDER_AFTER_HOURS && !req.lastReminderAt) {
      for (const approval of req.approvals) {
        await prisma.notification.create({
          data: {
            userId: approval.approverId,
            title: '⏰ Approval Reminder',
            message: `Leave request from ${req.employee.firstName} ${req.employee.lastName} is awaiting your approval for over ${Math.floor(ageHours)} hours.`,
            type: 'REMINDER',
            priority: 'HIGH',
            metadata: JSON.stringify({ requestId: req.id, requestType: 'LEAVE' })
          }
        });
      }
      await prisma.leaveRequest.update({
        where: { id: req.id },
        data: { lastReminderAt: now }
      });
      report.reminders++;
    }

    // Escalate at 48h
    if (ageHours >= ESCALATE_AFTER_HOURS && !req.escalatedToGM) {
      // Find GM or SuperAdmin to escalate to
      const gmUser = await prisma.user.findFirst({
        where: { role: { in: ['GM', 'SUPER_ADMIN'] }, isActive: true }
      });

      if (gmUser) {
        await prisma.notification.create({
          data: {
            userId: gmUser.id,
            title: '🔴 Escalated: Leave Request Pending',
            message: `Leave request from ${req.employee.firstName} ${req.employee.lastName} (${req.employee.employeeCode}) has been pending for over ${Math.floor(ageHours)} hours without response.`,
            type: 'ESCALATION',
            priority: 'CRITICAL',
            metadata: JSON.stringify({ requestId: req.id, requestType: 'LEAVE', pendingHours: Math.floor(ageHours) })
          }
        });
      }

      await prisma.leaveRequest.update({
        where: { id: req.id },
        data: { escalatedToGM: true, isCritical: true, escalatedAt: now }
      });
      report.escalations++;
    }
  }

  // ─── 2. Exit Request Reminders & Escalation ────────────────────────────────

  const pendingExitRequests = await prisma.exitRequest.findMany({
    where: {
      status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_GM'] }
    },
    include: {
      employee: {
        include: { user: true }
      },
      approvals: {
        where: { status: 'PENDING' },
        include: { approver: true }
      }
    }
  });

  for (const req of pendingExitRequests) {
    const ageHours = (now.getTime() - req.createdAt.getTime()) / (1000 * 60 * 60);

    if (ageHours >= REMINDER_AFTER_HOURS && !req.lastReminderAt) {
      for (const approval of req.approvals) {
        await prisma.notification.create({
          data: {
            userId: approval.approverId,
            title: '⏰ Approval Reminder',
            message: `Exit permission request from ${req.employee.firstName} ${req.employee.lastName} is awaiting your approval for over ${Math.floor(ageHours)} hours.`,
            type: 'REMINDER',
            priority: 'HIGH',
            metadata: JSON.stringify({ requestId: req.id, requestType: 'EXIT' })
          }
        });
      }
      await prisma.exitRequest.update({
        where: { id: req.id },
        data: { lastReminderAt: now }
      });
      report.reminders++;
    }

    if (ageHours >= ESCALATE_AFTER_HOURS && !req.escalatedToGM) {
      const gmUser = await prisma.user.findFirst({
        where: { role: { in: ['GM', 'SUPER_ADMIN'] }, isActive: true }
      });
      if (gmUser) {
        await prisma.notification.create({
          data: {
            userId: gmUser.id,
            title: '🔴 Escalated: Exit Permission Pending',
            message: `Exit permission from ${req.employee.firstName} ${req.employee.lastName} (${req.employee.employeeCode}) has been pending for over ${Math.floor(ageHours)} hours.`,
            type: 'ESCALATION',
            priority: 'CRITICAL',
            metadata: JSON.stringify({ requestId: req.id, requestType: 'EXIT', pendingHours: Math.floor(ageHours) })
          }
        });
      }
      await prisma.exitRequest.update({
        where: { id: req.id },
        data: { escalatedToGM: true, isCritical: true, escalatedAt: now }
      });
      report.escalations++;
    }
  }

  // ─── 3. Late Return Alerts ─────────────────────────────────────────────────

  const activeLogs = await prisma.gateLog.findMany({
    where: {
      exitStatus: 'EXITED',
      returnStatus: 'PENDING'
    },
    include: {
      employee: {
        include: {
          user: true,
          department: true
        }
      },
      gatePass: {
        include: {
          exitRequest: true
        }
      }
    }
  });

  for (const log of activeLogs) {
    const expectedReturn = new Date(log.expectedReturnTime);
    const lateMs = now.getTime() - expectedReturn.getTime();
    const lateMinutes = Math.floor(lateMs / (1000 * 60));

    if (lateMinutes < LATE_ALERT_GRACE_MINUTES) continue;

    const lateHours = lateMinutes / 60;

    // Send late alert
    if (!log.lateAlertSent && lateMinutes >= LATE_ALERT_GRACE_MINUTES) {
      // Notify manager & HR of this employee
      const emp = await prisma.employee.findUnique({ where: { id: log.employeeId } });
      const notifyUsers: string[] = [];
      if (emp?.managerId) notifyUsers.push(emp.managerId);
      if (emp?.hrAuthorityId) notifyUsers.push(emp.hrAuthorityId);

      for (const userId of notifyUsers) {
        await prisma.notification.create({
          data: {
            userId,
            title: '⚠️ Late Return Alert',
            message: `${log.employee.firstName} ${log.employee.lastName} (${log.employee.employeeCode}) has not returned yet. Expected: ${expectedReturn.toLocaleTimeString()}. Late by ${lateMinutes} minutes.`,
            type: 'LATE_RETURN_ALERT',
            priority: 'HIGH',
            metadata: JSON.stringify({
              gateLogId: log.id,
              employeeId: log.employeeId,
              lateMinutes,
              expectedReturn: log.expectedReturnTime
            })
          }
        });
      }

      await prisma.gateLog.update({
        where: { id: log.id },
        data: {
          returnStatus: 'LATE_RETURN',
          lateMinutes,
          lateAlertSent: true
        }
      });
      report.lateAlerts++;
    }

    // Critical alert after CRITICAL_LATE_HOURS
    if (!log.criticalAlertSent && lateHours >= CRITICAL_LATE_HOURS) {
      const gmUser = await prisma.user.findFirst({
        where: { role: { in: ['GM', 'SUPER_ADMIN'] }, isActive: true }
      });

      if (gmUser) {
        await prisma.notification.create({
          data: {
            userId: gmUser.id,
            title: '🚨 CRITICAL: Employee Severely Overdue',
            message: `${log.employee.firstName} ${log.employee.lastName} (${log.employee.employeeCode}, ${log.employee.department?.name}) has been outside for ${Math.floor(lateHours)} hours beyond approved time. Expected return: ${expectedReturn.toLocaleTimeString()}.`,
            type: 'CRITICAL_ALERT',
            priority: 'CRITICAL',
            metadata: JSON.stringify({
              gateLogId: log.id,
              employeeId: log.employeeId,
              lateMinutes,
              lateHours: Math.floor(lateHours)
            })
          }
        });
      }

      await prisma.gateLog.update({
        where: { id: log.id },
        data: {
          returnStatus: 'CRITICAL',
          lateMinutes,
          criticalAlertSent: true
        }
      });
      report.criticalAlerts++;
    }
  }

  console.log(`[Escalation] Run complete:`, report);
  return report;
}
