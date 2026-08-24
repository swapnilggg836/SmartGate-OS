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

// PATCH /api/users/:id/status (Admin only — activate/deactivate)
router.patch('/:id/status', authenticate, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ success: false, message: 'isActive must be a boolean' });
    }
    const user = await prisma.user.update({ where: { id }, data: { isActive } });
    return res.json({ success: true, data: { id: user.id, isActive: user.isActive } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
});

// PATCH /api/users/:id/role (Admin only — change role)
router.patch('/:id/role', authenticate, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;
    const validRoles = Object.values(UserRole);
    if (!validRoles.includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    const user = await prisma.user.update({ where: { id }, data: { role } });
    return res.json({ success: true, data: { id: user.id, role: user.role } });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update user role' });
  }
});

export default router;
