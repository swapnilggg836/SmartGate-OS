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
    } else if (role === UserRole.MANAGER) {
      // Manager sees own department only
      const managerEmp = await prisma.employee.findUnique({ where: { id: userEmployeeId! } });
      if (managerEmp) where.employee = { departmentId: managerEmp.departmentId };
      if (employeeId) where.employeeId = String(employeeId); // Can filter by specific employee
    } else {
      // HR and Super Admin see all — can optionally filter by employeeId
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

// GET /api/attendance/summary — today's live headcount
router.get('/summary', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const role = req.user!.role;
    const userEmployeeId = req.user!.employeeId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const deptFilter: any = {};
    if (role === UserRole.MANAGER && userEmployeeId) {
      const managerEmp = await prisma.employee.findUnique({ where: { id: userEmployeeId } });
      if (managerEmp) deptFilter.departmentId = managerEmp.departmentId;
    }

    const totalEmployees = await prisma.employee.count({ where: deptFilter });
    const todayAttendance = await prisma.attendance.findMany({
      where: { date: today, ...(deptFilter.departmentId ? { employee: { departmentId: deptFilter.departmentId } } : {}) }
    });

    const presentCount = todayAttendance.filter(a => a.status === 'PRESENT').length;
    const onExitCount = todayAttendance.filter(a => a.status === 'ON_EXIT_PERMISSION').length;
    const onLeaveCount = todayAttendance.filter(a => a.status === 'ON_LEAVE').length;
    const absentCount = Math.max(0, totalEmployees - (presentCount + onExitCount + onLeaveCount));

    return res.json({ success: true, data: { totalEmployees, presentCount, onExitCount, onLeaveCount, absentCount } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch summary' });
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
    if (role === UserRole.MANAGER && userEmployeeId) {
      const managerEmp = await prisma.employee.findUnique({ where: { id: userEmployeeId } });
      if (managerEmp) empWhere.departmentId = managerEmp.departmentId;
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
