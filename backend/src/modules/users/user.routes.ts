import { Router, Response } from 'express';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import { prisma } from '../../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { logAudit } from '../../lib/audit';
import { UserRole } from '@smart-gate/types';

const router = Router();

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  role: z.nativeEnum(UserRole),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  departmentId: z.string().min(1),
  designation: z.string().min(1),
  phone: z.string().min(5),
  employeeCode: z.string().min(2),
  avatarUrl: z.string().url().optional()
});

// GET /api/users (Admin / HR)
router.get('/', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.HR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      include: {
        employee: {
          include: {
            department: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const result = users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      createdAt: u.createdAt,
      employee: u.employee
        ? {
            id: u.employee.id,
            employeeCode: u.employee.employeeCode,
            firstName: u.employee.firstName,
            lastName: u.employee.lastName,
            designation: u.employee.designation,
            phone: u.employee.phone,
            department: u.employee.department?.name,
            departmentId: u.employee.departmentId,
            avatarUrl: u.employee.avatarUrl
          }
        : null
    }));

    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// POST /api/users (Admin / HR)
router.post('/', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.HR), validateBody(createUserSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { email, password, role, firstName, lastName, departmentId, designation, phone, employeeCode, avatarUrl } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const existingCode = await prisma.employee.findUnique({ where: { employeeCode } });
    if (existingCode) {
      return res.status(400).json({ success: false, message: 'Employee code is already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role,
        isActive: true,
        employee: {
          create: {
            employeeCode,
            firstName,
            lastName,
            departmentId,
            designation,
            phone,
            avatarUrl: avatarUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150`
          }
        }
      },
      include: { employee: true }
    });

    // Seed default leave balances for this new employee
    const leaveTypes = await prisma.leaveType.findMany();
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.create({
        data: {
          employeeId: newUser.employee!.id,
          leaveTypeId: lt.id,
          totalDays: lt.defaultDaysPerYear,
          usedDays: 0,
          pendingDays: 0
        }
      });
    }

    await logAudit({
      userId: req.user!.userId,
      action: 'USER_CREATED',
      entity: 'User',
      entityId: newUser.id,
      newValues: { email, role, employeeCode, firstName, lastName },
      req
    });

    return res.status(201).json({ success: true, data: newUser });
  } catch (err: any) {
    console.error('Create user error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create user.' });
  }
});

// GET /api/employees
router.get('/employees', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { departmentId, search } = req.query;

    const where: any = {};
    if (departmentId) {
      where.departmentId = String(departmentId);
    }
    if (search) {
      const s = String(search).toLowerCase();
      where.OR = [
        { firstName: { contains: s } },
        { lastName: { contains: s } },
        { employeeCode: { contains: s } },
        { designation: { contains: s } }
      ];
    }

    const employees = await prisma.employee.findMany({
      where,
      include: {
        department: true,
        user: { select: { email: true, role: true, isActive: true } },
        leaveBalances: { include: { leaveType: true } }
      },
      orderBy: { firstName: 'asc' }
    });

    return res.json({ success: true, data: employees });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch employees' });
  }
});

// GET /api/employees/:id
router.get('/employees/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const employee = await prisma.employee.findUnique({
      where: { id },
      include: {
        department: true,
        user: { select: { email: true, role: true, isActive: true } },
        leaveBalances: { include: { leaveType: true } }
      }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    return res.json({ success: true, data: employee });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch employee' });
  }
});

// PATCH /api/users/:id/status (Admin / HR — activate/deactivate)
router.patch('/:id/status', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.HR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
    }
    const user = await prisma.user.update({ where: { id }, data: { isActive } });

    // If deactivating, cascade authority connection status
    if (!isActive) {
      const conns = await prisma.authorityConnection.findMany({
        where: { authorityUserId: id, status: 'ACTIVE' }
      });
      for (const conn of conns) {
        await prisma.authorityConnection.update({ where: { id: conn.id }, data: { status: 'NEEDS_REASSIGNMENT' } });
        await prisma.notification.create({
          data: {
            userId: conn.userId,
            title: 'Authority Reassignment Required',
            message: `Your ${conn.connectionType.replace('_', ' ')} is no longer active. Please connect a new authority.`,
            type: 'INFO',
            priority: 'HIGH'
          }
        });
      }
    }

    return res.json({ success: true, data: { id: user.id, isActive: user.isActive } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
});

// PATCH /api/users/employees/:id/transfer (Admin / HR — Department Transfer)
router.patch('/employees/:id/transfer', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.HR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { newDepartmentId, newDesignation, notes } = req.body;

    const employee = await prisma.employee.findUnique({
      where: { id },
      include: { department: true }
    });

    if (!employee) {
      return res.status(404).json({ success: false, message: 'Employee not found' });
    }

    const newDept = await prisma.department.findUnique({ where: { id: newDepartmentId } });
    if (!newDept) {
      return res.status(404).json({ success: false, message: 'Target department not found' });
    }

    const oldDeptName = employee.department?.name || 'Unassigned';

    await prisma.$transaction(async (tx) => {
      // 1. Update employee record
      await tx.employee.update({
        where: { id },
        data: {
          departmentId: newDepartmentId,
          designation: newDesignation || employee.designation
        }
      });

      // 2. Record historical timeline
      await tx.employeeStatusHistory.create({
        data: {
          employeeId: id,
          changeType: 'DEPT_CHANGE',
          oldValue: oldDeptName,
          newValue: `${newDept.name}${newDesignation ? ` (${newDesignation})` : ''}`,
          changedBy: req.user!.userId,
          notes: notes || `Transferred from ${oldDeptName} to ${newDept.name} by HR/Admin`
        }
      });

      // 3. Mark old reporting manager connection as NEEDS_REASSIGNMENT if manager was dept-specific
      const managerConn = await tx.authorityConnection.findFirst({
        where: { userId: employee.userId, connectionType: 'REPORTING_MANAGER', status: 'ACTIVE' }
      });
      if (managerConn) {
        await tx.authorityConnection.update({
          where: { id: managerConn.id },
          data: { status: 'NEEDS_REASSIGNMENT' }
        });
      }
    });

    await logAudit({
      userId: req.user!.userId,
      action: 'EMPLOYEE_DEPT_TRANSFERRED',
      entity: 'Employee',
      entityId: id,
      newValues: { oldDept: oldDeptName, newDept: newDept.name, newDesignation },
      req
    });

    return res.json({
      success: true,
      message: `Employee transferred to ${newDept.name} successfully.`
    });
  } catch (err: any) {
    console.error('Transfer employee error:', err);
    return res.status(500).json({ success: false, message: 'Failed to transfer employee.' });
  }
});

// PATCH /api/users/:id/role (Admin only — change primary role)
router.patch('/:id/role', authenticate, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = [...Object.values(UserRole), 'GM'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const oldUser = await prisma.user.findUnique({ where: { id }, include: { employee: true } });
    const user = await prisma.user.update({ where: { id }, data: { role } });

    if (oldUser?.employee) {
      await prisma.employeeStatusHistory.create({
        data: {
          employeeId: oldUser.employee.id,
          changeType: 'ROLE_CHANGE',
          oldValue: oldUser.role,
          newValue: role,
          changedBy: req.user!.userId,
          notes: 'Primary role changed by admin'
        }
      });
    }

    return res.json({ success: true, data: { id: user.id, role: user.role } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
});

// POST /api/users/:id/roles — Add additional role (multi-role)
router.post('/:id/roles', authenticate, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = [...Object.values(UserRole), 'GM'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const userRole = await prisma.userRole.upsert({
      where: { userId_role: { userId: id, role } },
      update: {},
      create: { userId: id, role, assignedBy: req.user!.userId }
    });
    return res.status(201).json({ success: true, data: userRole });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to add role' });
  }
});

// DELETE /api/users/:id/roles/:role — Remove additional role
router.delete('/:id/roles/:role', authenticate, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, role } = req.params;
    await prisma.userRole.deleteMany({ where: { userId: id, role } });
    return res.json({ success: true, message: 'Role removed' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to remove role' });
  }
});

// GET /api/users/:id/roles — All roles for a user
router.get('/:id/roles', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const [user, roles] = await Promise.all([
      prisma.user.findUnique({ where: { id }, select: { role: true } }),
      prisma.userRole.findMany({ where: { userId: id } })
    ]);
    const allRoles = Array.from(new Set([user?.role, ...roles.map(r => r.role)])).filter(Boolean);
    return res.json({ success: true, data: { primaryRole: user?.role, additionalRoles: roles, allRoles } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch roles' });
  }
});

// GET /api/users/:id/journey — Full employee journey (Admin / HR / GM / Manager)
router.get('/:id/journey', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.HR, UserRole.MANAGER, 'GM'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    let user = await prisma.user.findUnique({ where: { id }, include: { employee: true } });
    if (!user) {
      const emp = await prisma.employee.findUnique({ where: { id }, include: { user: true } });
      if (emp?.user) {
        user = { ...emp.user, employee: emp } as any;
      }
    }
    if (!user?.employee) return res.status(404).json({ success: false, message: 'Employee not found' });
    const employeeId = user.employee.id;
    const resolvedUserId = user.id;

    const [statusHistory, leaveRequests, exitRequests, gatePassHistory, attendanceRecords, authorityConnections, auditLogs] = await Promise.all([
      prisma.employeeStatusHistory.findMany({ where: { employeeId }, orderBy: { createdAt: 'desc' } }),
      prisma.leaveRequest.findMany({
        where: { employeeId },
        include: { leaveType: true, approvals: { include: { approver: { include: { employee: true } } } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.exitRequest.findMany({
        where: { employeeId },
        include: { approvals: { include: { approver: { include: { employee: true } } } }, gatePass: { include: { gateLogs: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.gatePass.findMany({ where: { employeeId }, include: { gateLogs: true }, orderBy: { createdAt: 'desc' } }),
      prisma.attendance.findMany({ where: { employeeId }, orderBy: { date: 'desc' }, take: 90 }),
      prisma.authorityConnection.findMany({
        where: { userId: resolvedUserId },
        include: { authorityUser: { include: { employee: true } } },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.auditLog.findMany({ where: { userId: resolvedUserId }, orderBy: { createdAt: 'desc' }, take: 100 })
    ]);

    return res.json({
      success: true,
      data: {
        employee: user.employee,
        user: { id: user.id, email: user.email, role: user.role, isActive: user.isActive, createdAt: user.createdAt },
        statusHistory, leaveRequests, exitRequests, gatePassHistory, attendanceRecords, authorityConnections, auditLogs
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch employee journey' });
  }
});

// GET /api/users/company/summary — Company-wide KPIs (Admin / HR / GM)
router.get('/company/summary', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.HR, 'GM'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalEmployees, activeEmployees, inactiveUsers, totalManagers, totalHR, totalSecurity, presentToday, onLeaveToday, currentlyOutside, pendingLeave, pendingExit, lateReturns, criticalCases, departments] = await Promise.all([
      prisma.employee.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({ where: { role: 'MANAGER', isActive: true } }),
      prisma.user.count({ where: { role: 'HR', isActive: true } }),
      prisma.user.count({ where: { role: 'SECURITY_GUARD', isActive: true } }),
      prisma.attendance.count({ where: { date: { gte: today, lt: tomorrow }, status: 'PRESENT' } }),
      prisma.attendance.count({ where: { date: { gte: today, lt: tomorrow }, status: 'ON_LEAVE' } }),
      prisma.gateLog.count({ where: { exitStatus: 'EXITED', returnStatus: 'PENDING' } }),
      prisma.leaveRequest.count({ where: { status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_GM', 'PENDING_SUPER_ADMIN'] } } }),
      prisma.exitRequest.count({ where: { status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_GM'] } } }),
      prisma.gateLog.count({ where: { returnStatus: { in: ['LATE_RETURN', 'OVERDUE', 'CRITICAL'] } } }),
      prisma.leaveRequest.count({ where: { isCritical: true, status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_GM'] } } }),
      prisma.department.findMany({
        include: {
          employees: {
            select: {
              id: true,
              attendance: { where: { date: { gte: today, lt: tomorrow } }, select: { status: true } },
              gateLogs: { where: { exitStatus: 'EXITED', returnStatus: 'PENDING' }, select: { id: true, returnStatus: true } }
            }
          }
        }
      })
    ]);

    const departmentSummary = departments.map(dept => {
      const total = dept.employees.length;
      const present = dept.employees.filter(e => e.attendance.some(a => a.status === 'PRESENT')).length;
      const onLeave = dept.employees.filter(e => e.attendance.some(a => a.status === 'ON_LEAVE')).length;
      const outside = dept.employees.reduce((s, e) => s + e.gateLogs.length, 0);
      const late = dept.employees.reduce((s, e) => s + e.gateLogs.filter(g => ['LATE_RETURN', 'OVERDUE', 'CRITICAL'].includes(g.returnStatus)).length, 0);
      return { id: dept.id, name: dept.name, code: dept.code, total, present, absent: total - present - onLeave, onLeave, outside, late };
    });

    return res.json({
      success: true,
      data: {
        overview: { totalEmployees, activeEmployees, inactiveUsers, totalManagers, totalHR, totalSecurity, presentToday, onLeaveToday, absentToday: activeEmployees - presentToday - onLeaveToday, currentlyOutside, pendingLeave, pendingExit, lateReturns, criticalCases },
        departmentSummary
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch company summary' });
  }
});

export default router;

