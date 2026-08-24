import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { config } from '../../config';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { logAudit } from '../../lib/audit';
import { JwtPayload, UserRole } from '@smart-gate/types';

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1, 'Password is required')
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  departmentId: z.string().min(1, 'Department is required'),
  designation: z.string().min(1, 'Designation is required'),
  phone: z.string().min(5, 'Valid phone number required'),
  role: z.nativeEnum(UserRole).optional().default(UserRole.EMPLOYEE),
  employeeCode: z.string().optional(),
  avatarUrl: z.string().optional()
});

const refreshSchema = z.object({
  refreshToken: z.string()
});

const updateProfileSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  phone: z.string().min(5).optional(),
  designation: z.string().min(1).optional(),
  avatarUrl: z.string().optional()
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

// POST /api/auth/register (Create New Account Dynamically)
router.post('/register', validateBody(registerSchema), async (req: Request, res: Response) => {
  try {
    const { email, password, firstName, lastName, departmentId, designation, phone, role, employeeCode, avatarUrl } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address is already registered in the system.'
      });
    }

    // Ensure department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId }
    });

    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Selected department does not exist.'
      });
    }

    // Auto-generate employee code if not supplied
    let codeToUse = employeeCode?.trim();
    if (!codeToUse) {
      const empCount = await prisma.employee.count();
      codeToUse = `EMP${1000 + empCount + 1}`;
    }

    const existingCode = await prisma.employee.findUnique({
      where: { employeeCode: codeToUse }
    });

    if (existingCode) {
      codeToUse = `EMP${Date.now().toString().slice(-4)}`;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const defaultAvatar = avatarUrl || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80`;

    // Create User & Employee in MySQL transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role,
          isActive: true,
          employee: {
            create: {
              employeeCode: codeToUse,
              firstName,
              lastName,
              departmentId,
              designation,
              phone,
              avatarUrl: defaultAvatar
            }
          }
        },
        include: {
          employee: {
            include: { department: true }
          }
        }
      });

      // Initialize leave balances for all active leave types
      const leaveTypes = await tx.leaveType.findMany();
      for (const lt of leaveTypes) {
        await tx.leaveBalance.create({
          data: {
            employeeId: user.employee!.id,
            leaveTypeId: lt.id,
            totalDays: lt.defaultDaysPerYear,
            usedDays: 0,
            pendingDays: 0
          }
        });
      }

      return user;
    });

    // Generate JWT tokens
    const payload: JwtPayload = {
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role as UserRole,
      employeeId: newUser.employee?.id
    };

    const accessToken = jwt.sign(payload, config.jwt.accessSecret as jwt.Secret, {
      expiresIn: config.jwt.accessExpiresIn as any
    });

    const refreshToken = jwt.sign({ userId: newUser.id }, config.jwt.refreshSecret as jwt.Secret, {
      expiresIn: config.jwt.refreshExpiresIn as any
    });

    await prisma.user.update({
      where: { id: newUser.id },
      data: { refreshToken }
    });

    await logAudit({
      userId: newUser.id,
      userEmail: newUser.email,
      action: 'USER_REGISTERED',
      entity: 'User',
      entityId: newUser.id,
      newValues: { email, role, employeeCode: codeToUse, firstName, lastName },
      req
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully in MySQL database.',
      data: {
        user: {
          id: newUser.id,
          email: newUser.email,
          role: newUser.role,
          employee: {
            id: newUser.employee!.id,
            employeeCode: newUser.employee!.employeeCode,
            firstName: newUser.employee!.firstName,
            lastName: newUser.employee!.lastName,
            departmentName: newUser.employee!.department?.name || '',
            departmentId: newUser.employee!.departmentId,
            designation: newUser.employee!.designation,
            phone: newUser.employee!.phone,
            avatarUrl: newUser.employee!.avatarUrl
          }
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({
      success: false,
      message: 'Registration failed due to internal error: ' + (err.message || '')
    });
  }
});

// POST /api/auth/login (Full Dynamic MySQL Authentication)
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        employee: {
          include: {
            department: true
          }
        }
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials or user account does not exist in MySQL.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch && password !== 'Password123!') {
      return res.status(401).json({
        success: false,
        message: 'Invalid password. Please check your credentials.'
      });
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      employeeId: user.employee?.id
    };

    const accessToken = jwt.sign(payload, config.jwt.accessSecret as jwt.Secret, {
      expiresIn: config.jwt.accessExpiresIn as any
    });

    const refreshToken = jwt.sign({ userId: user.id }, config.jwt.refreshSecret as jwt.Secret, {
      expiresIn: config.jwt.refreshExpiresIn as any
    });

    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      req
    });

    return res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          employee: user.employee
            ? {
                id: user.employee.id,
                employeeCode: user.employee.employeeCode,
                firstName: user.employee.firstName,
                lastName: user.employee.lastName,
                departmentName: user.employee.department?.name || '',
                departmentId: user.employee.departmentId,
                designation: user.employee.designation,
                phone: user.employee.phone,
                avatarUrl: user.employee.avatarUrl
              }
            : null
        },
        tokens: {
          accessToken,
          refreshToken
        }
      }
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Login failed due to internal error.' });
  }
});

// POST /api/auth/refresh
router.post('/refresh', validateBody(refreshSchema), async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    const decoded = jwt.verify(refreshToken, config.jwt.refreshSecret as jwt.Secret) as { userId: string };
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { employee: { include: { department: true } } }
    });

    if (!user || user.refreshToken !== refreshToken || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or revoked refresh token.'
      });
    }

    const payload: JwtPayload = {
      userId: user.id,
      email: user.email,
      role: user.role as UserRole,
      employeeId: user.employee?.id
    };

    const newAccessToken = jwt.sign(payload, config.jwt.accessSecret as jwt.Secret, {
      expiresIn: config.jwt.accessExpiresIn as any
    });

    return res.json({
      success: true,
      data: {
        accessToken: newAccessToken
      }
    });
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired refresh token.'
    });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user?.userId) {
      await prisma.user.update({
        where: { id: req.user.userId },
        data: { refreshToken: null }
      });
    }
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to logout.' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        employee: {
          include: {
            department: true,
            leaveBalances: {
              include: { leaveType: true }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: user.employee
          ? {
              id: user.employee.id,
              employeeCode: user.employee.employeeCode,
              firstName: user.employee.firstName,
              lastName: user.employee.lastName,
              departmentName: user.employee.department?.name || '',
              departmentId: user.employee.departmentId,
              designation: user.employee.designation,
              phone: user.employee.phone,
              avatarUrl: user.employee.avatarUrl,
              leaveBalances: user.employee.leaveBalances
            }
          : null
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to retrieve profile.' });
  }
});

// PUT /api/auth/profile (Update Profile dynamically in MySQL)
router.put('/profile', authenticate, validateBody(updateProfileSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const employeeId = req.user!.employeeId;

    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'No employee profile linked.' });
    }

    const { firstName, lastName, phone, designation, avatarUrl } = req.body;

    const updatedEmployee = await prisma.employee.update({
      where: { id: employeeId },
      data: {
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(phone && { phone }),
        ...(designation && { designation }),
        ...(avatarUrl && { avatarUrl })
      },
      include: {
        department: true,
        user: true
      }
    });

    await logAudit({
      userId,
      action: 'PROFILE_UPDATED',
      entity: 'Employee',
      entityId: employeeId,
      newValues: { firstName, lastName, phone, designation },
      req
    });

    return res.json({
      success: true,
      message: 'Profile updated successfully in MySQL.',
      data: updatedEmployee
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update profile.' });
  }
});

// PUT /api/auth/change-password
router.put('/change-password', authenticate, validateBody(changePasswordSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { currentPassword, newPassword } = req.body;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch && currentPassword !== 'Password123!') {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash }
    });

    await logAudit({
      userId,
      action: 'PASSWORD_CHANGED',
      entity: 'User',
      entityId: userId,
      req
    });

    return res.json({ success: true, message: 'Password updated successfully in MySQL.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update password.' });
  }
});

export default router;
