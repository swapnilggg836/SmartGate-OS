import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { UserRole } from '@smart-gate/types';

const router = Router();

// GET /api/attendance — role-filtered
router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { employeeId, date, month, year } = req.query;
    const role = req.user!.role;
    const userEmployeeId = req.user!.employeeId;

    const where: any = {};

    // Role-based data visibility
    if (role === UserRole.EMPLOYEE) {
      where.employeeId = userEmployeeId; // Own data only
    } else if (role === UserRole.MANAGER || role === UserRole.HR) {
      // Manager/HR sees connected team members + self
      const connectedConns = await prisma.authorityConnection.findMany({
        where: { authorityUserId: req.user!.userId, status: 'ACTIVE' },
        select: { userId: true }
      });
      const connectedUserIds = connectedConns.map(c => c.userId);
      const teamEmps = await prisma.employee.findMany({
        where: { OR: [{ userId: { in: connectedUserIds } }, { id: userEmployeeId! }] },
        select: { id: true }
      });
      where.employeeId = { in: teamEmps.map(e => e.id) };
      if (employeeId) where.employeeId = String(employeeId);
    } else {
      // Super Admin sees all — can optionally filter by employeeId
      if (employeeId) where.employeeId = String(employeeId);
    }

    // Date filter
    if (date) {
      const queryDate = new Date(String(date));
      const nextDate = new Date(queryDate);
      nextDate.setDate(queryDate.getDate() + 1);
      where.date = { gte: queryDate, lt: nextDate };
    } else if (month && year) {
      const m = parseInt(String(month)) - 1;
      const y = parseInt(String(year));
      where.date = {
        gte: new Date(y, m, 1),
        lt: new Date(y, m + 1, 1)
      };
    }

    const records = await prisma.attendance.findMany({
      where,
      include: { employee: { include: { department: true } } },
      orderBy: { date: 'desc' },
      take: 500
    });

    return res.json({ success: true, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance' });
  }
});

// GET /api/attendance/summary — today's live headcount or personal stats
router.get('/summary', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const role = req.user!.role;
    const userEmployeeId = req.user!.employeeId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    if (role === UserRole.EMPLOYEE && userEmployeeId) {
      const monthlyAttendance = await prisma.attendance.findMany({
        where: {
          employeeId: userEmployeeId,
          date: { gte: startOfMonth, lte: endOfToday }
        }
      });

      const presentCount = monthlyAttendance.filter(a => a.status === 'PRESENT').length;
      const onExitCount = monthlyAttendance.filter(a => a.status === 'ON_EXIT_PERMISSION').length;
      const onLeaveCount = monthlyAttendance.filter(a => a.status === 'ON_LEAVE').length;
      const absentCount = monthlyAttendance.filter(a => a.status === 'ABSENT').length;
      const totalDays = now.getDate();

      return res.json({
        success: true,
        data: {
          isPersonal: true,
          totalEmployees: totalDays,
          presentCount,
          onExitCount,
          onLeaveCount,
          absentCount
        }
      });
    }

    const teamFilter: any = {};
    if (role === UserRole.MANAGER || role === UserRole.HR) {
      const connectedConns = await prisma.authorityConnection.findMany({
        where: { authorityUserId: req.user!.userId, status: 'ACTIVE' },
        select: { userId: true }
      });
      const connectedUserIds = connectedConns.map(c => c.userId);
      const teamEmps = await prisma.employee.findMany({
        where: { OR: [{ userId: { in: connectedUserIds } }, { id: userEmployeeId! }] },
        select: { id: true }
      });
      teamFilter.id = { in: teamEmps.map(e => e.id) };
    }

    const totalEmployees = await prisma.employee.count({ where: teamFilter });
    const todayAttendance = await prisma.attendance.findMany({
      where: { date: today, ...(teamFilter.id ? { employeeId: teamFilter.id } : {}) }
    });

    const presentCount = todayAttendance.filter(a => a.status === 'PRESENT').length;
    const onExitCount = todayAttendance.filter(a => a.status === 'ON_EXIT_PERMISSION').length;
    const onLeaveCount = todayAttendance.filter(a => a.status === 'ON_LEAVE').length;
    const absentCount = Math.max(0, totalEmployees - (presentCount + onExitCount + onLeaveCount));

    return res.json({ success: true, data: { isPersonal: false, totalEmployees, presentCount, onExitCount, onLeaveCount, absentCount } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch summary' });
  }
});

// GET /api/attendance/department-colleagues — View live status of department teammates
router.get('/department-colleagues', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userEmployeeId = req.user!.employeeId;
    if (!userEmployeeId) {
      return res.json({ success: true, data: [] });
    }

    const currentEmp = await prisma.employee.findUnique({
      where: { id: userEmployeeId },
      include: { department: true }
    });

    if (!currentEmp?.departmentId) {
      return res.json({ success: true, data: [] });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const colleagues = await prisma.employee.findMany({
      where: {
        departmentId: currentEmp.departmentId,
        id: { not: currentEmp.id },
        user: { isActive: true }
      },
      include: {
        department: true,
        user: { select: { email: true, role: true } },
        attendance: {
          where: { date: today },
          select: { status: true, checkInTime: true, checkOutTime: true }
        },
        gateLogs: {
          where: { exitStatus: 'EXITED', returnStatus: 'PENDING' },
          select: { id: true }
        }
      },
      orderBy: { firstName: 'asc' }
    });

    const formatted = colleagues.map(c => {
      const att = c.attendance[0];
      const isOutside = c.gateLogs.length > 0;
      let status = isOutside ? 'ON_EXIT_PERMISSION' : (att?.status || 'ABSENT');

      return {
        id: c.id,
        employeeCode: c.employeeCode,
        name: `${c.firstName} ${c.lastName}`,
        designation: c.designation,
        email: c.user?.email,
        department: c.department?.name,
        avatarUrl: c.avatarUrl,
        todayStatus: status,
        checkInTime: att?.checkInTime || null,
        checkOutTime: att?.checkOutTime || null
      };
    });

    return res.json({ success: true, data: formatted });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch department colleagues' });
  }
});

// GET /api/attendance/monthly-summary — monthly stats per employee (Manager/HR/Admin)
router.get('/monthly-summary', authenticate, requireRoles(UserRole.MANAGER, UserRole.HR, UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const role = req.user!.role;
    const userEmployeeId = req.user!.employeeId;
    const now = new Date();
    const m = parseInt(String(req.query.month || now.getMonth() + 1)) - 1;
    const y = parseInt(String(req.query.year || now.getFullYear()));

    const startDate = new Date(y, m, 1);
    const endDate = new Date(y, m + 1, 1);

    const empWhere: any = {};
    if (role === UserRole.MANAGER || role === UserRole.HR) {
      const connectedConns = await prisma.authorityConnection.findMany({
        where: { authorityUserId: req.user!.userId, status: 'ACTIVE' },
        select: { userId: true }
      });
      const connectedUserIds = connectedConns.map(c => c.userId);
      const teamEmps = await prisma.employee.findMany({
        where: { OR: [{ userId: { in: connectedUserIds } }, { id: userEmployeeId! }] },
        select: { id: true }
      });
      empWhere.id = { in: teamEmps.map(e => e.id) };
    }

    const employees = await prisma.employee.findMany({
      where: empWhere,
      include: {
        department: true,
        attendance: {
          where: { date: { gte: startDate, lt: endDate } }
        }
      },
      orderBy: [{ department: { name: 'asc' } }, { firstName: 'asc' }]
    });

    const summary = employees.map(emp => {
      const records = emp.attendance;
      return {
        employeeId: emp.id,
        employeeCode: emp.employeeCode,
        name: `${emp.firstName} ${emp.lastName}`,
        department: emp.department?.name || '—',
        totalDays: records.length,
        present: records.filter(r => r.status === 'PRESENT').length,
        absent: records.filter(r => r.status === 'ABSENT').length,
        onLeave: records.filter(r => r.status === 'ON_LEAVE').length,
        onExitPermission: records.filter(r => r.status === 'ON_EXIT_PERMISSION').length,
        halfDay: records.filter(r => r.status === 'HALF_DAY').length
      };
    });

    return res.json({ success: true, data: summary, month: m + 1, year: y });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch monthly summary' });
  }
});

export default router;
