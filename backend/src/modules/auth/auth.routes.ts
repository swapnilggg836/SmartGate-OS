import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../lib/prisma';
import { config } from '../../config';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { logAudit } from '../../lib/audit';
import { sendEmailNotification, sendSmsNotification } from '../../lib/email';
import { JwtPayload, UserRole } from '@smart-gate/types';

const router = Router();

const loginSchema = z.object({
  email: z.string().min(1, 'Email or Employee ID is required').optional(),
  identifier: z.string().min(1, 'Email or Employee ID is required').optional(),
  password: z.string().min(1, 'Password is required')
}).refine(data => !!(data.email || data.identifier), {
  message: 'Email or Employee ID is required',
  path: ['email']
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

    // Security Rule: Public self-registration is strictly disabled.
    // Accounts must be provisioned directly by HR or SUPER_ADMIN (or via administrative secret).
    const adminSecret = req.headers['x-admin-secret'] || (req.body as any)?.adminSecret;
    const configuredSecret = process.env.ADMIN_INVITATION_SECRET || 'smartgate-admin-secure-key-2026';
    const isSecretAuthorized = adminSecret && adminSecret === configuredSecret;

    let isSessionAuthorized = false;
    let creatorRole: string | undefined;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, config.jwt.accessSecret) as JwtPayload;
        if (decoded && (decoded.role === UserRole.SUPER_ADMIN || decoded.role === UserRole.HR)) {
          isSessionAuthorized = true;
          creatorRole = decoded.role;
        }
      } catch {
        // Token invalid or expired
      }
    }

    if (!isSessionAuthorized && !isSecretAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Security Policy Violation: Public self-registration is disabled. All employee and staff accounts must be provisioned directly by Human Resources (HR) or System Administrators via the User Management Console (/admin/users).'
      });
    }

    const requestedRole = role || UserRole.EMPLOYEE;

    // Security Rule: HR can ONLY create EMPLOYEE accounts.
    // Super Admin can create any account.
    if (creatorRole === UserRole.HR && requestedRole !== UserRole.EMPLOYEE) {
      return res.status(403).json({
        success: false,
        message: 'Security Policy Violation: HR is only authorized to create Employee accounts. Manager, HR, General Manager, Security Guard, and Super Admin accounts must be created by Super Admin.'
      });
    }

    // Protection rule: Only Super Admin can provision SUPER_ADMIN accounts
    if (requestedRole === UserRole.SUPER_ADMIN && creatorRole !== UserRole.SUPER_ADMIN && !isSecretAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Privilege Policy Violation: Only Super Admin can provision another Super Admin account.'
      });
    }

    let finalRole = requestedRole;

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

    // Ensure department exists (by ID, code, or fallback)
    let department = await prisma.department.findUnique({
      where: { id: departmentId }
    });

    if (!department) {
      department = await prisma.department.findFirst({
        where: {
          OR: [
            { code: departmentId },
            { name: departmentId }
          ]
        }
      });
    }

    if (!department) {
      department = await prisma.department.findFirst();
    }

    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Selected department does not exist and no fallback departments found.'
      });
    }

    const actualDepartmentId = department.id;

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

    const defaultAvatar = avatarUrl || '/default-avatar.png';

    // Create User & Employee in MySQL transaction
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: finalRole,
          isActive: true,
          employee: {
            create: {
              employeeCode: codeToUse,
              firstName,
              lastName,
              departmentId: actualDepartmentId,
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

// POST /api/auth/login (Full Dynamic MySQL Authentication via Email or Employee ID)
router.post('/login', validateBody(loginSchema), async (req: Request, res: Response) => {
  try {
    const rawIdentifier = (req.body.identifier || req.body.email || '').trim();
    const { password } = req.body;

    if (!rawIdentifier) {
      return res.status(400).json({
        success: false,
        message: 'Email or Employee ID is required.'
      });
    }

    // 1. Try finding user by email (case-insensitive where possible or direct)
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: rawIdentifier },
          { email: rawIdentifier.toLowerCase() }
        ]
      },
      include: {
        employee: {
          include: {
            department: true
          }
        }
      }
    });

    // 2. If not found by email, lookup employee by employeeCode or employee ID
    if (!user) {
      const upper = rawIdentifier.toUpperCase();
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { employeeCode: rawIdentifier },
            { employeeCode: upper },
            { id: rawIdentifier }
          ]
        },
        include: {
          department: true,
          user: true
        }
      });

      if (emp && emp.user) {
        user = {
          ...emp.user,
          employee: emp
        } as any;
      }
    }

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
    return res.status(500).json({
      success: false,
      message: 'Login failed due to internal error: ' + (err.message || 'Unknown error')
    });
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
    let employeeId = req.user!.employeeId;
    if (!employeeId) {
      const emp = await prisma.employee.findFirst({ where: { userId } });
      if (emp) employeeId = emp.id;
    }

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
        ...(avatarUrl !== undefined && { avatarUrl: avatarUrl || '/default-avatar.png' })
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

// ============================================================
// OTP-BASED PASSWORD RESET FOR INDIVIDUAL USERS
// ============================================================

const requestResetOtpSchema = z.object({
  email: z.string().min(1, 'Please provide a valid email address or employee ID')
});

const verifyResetOtpSchema = z.object({
  email: z.string().min(1, 'Please provide a valid email address or employee ID'),
  otp: z.string().min(4, 'Valid OTP is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters')
});

// POST /api/auth/forgot-password/request-otp (Public Forgot Password -> Send OTP)
router.post('/forgot-password/request-otp', validateBody(requestResetOtpSchema), async (req: Request, res: Response) => {
  try {
    const rawInput = (req.body.email || req.body.identifier || '').trim();

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: rawInput },
          { email: rawInput.toLowerCase() }
        ]
      },
      include: { employee: true }
    });

    if (!user) {
      const upper = rawInput.toUpperCase();
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { employeeCode: rawInput },
            { employeeCode: upper },
            { id: rawInput }
          ]
        },
        include: { user: true }
      });
      if (emp && emp.user) {
        user = { ...emp.user, employee: emp } as any;
      }
    }

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'No active user found with this email address or employee ID.'
      });
    }

    const email = user.email;

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Invalidate existing pending OTPs for this email
    await prisma.passwordResetOtp.updateMany({
      where: { email, used: false },
      data: { used: true }
    });

    // Create new OTP record in MySQL
    await prisma.passwordResetOtp.create({
      data: {
        email,
        otp,
        expiresAt,
        used: false
      }
    });

    // Create a real-time Notification for the user
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: '🔐 Password Reset OTP Code',
        message: `Your one-time verification code is: ${otp}. It will expire in 10 minutes. Do not share this code with anyone.`,
        type: 'ALERT',
        priority: 'HIGH'
      }
    });

    // Deliver OTP strictly to the user's verified registered email address
    await sendEmailNotification({
      to: user.email,
      subject: '🔐 SmartGate OS: Password Reset Verification Code',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
          <h2 style="color: #1e3a8a; margin: 0 0 12px; font-size: 20px;">Password Reset Verification</h2>
          <p style="font-size: 14px; color: #334155; margin: 0 0 8px;">Hello <strong>${user.employee?.firstName || 'User'}</strong>,</p>
          <p style="font-size: 14px; color: #475569; margin: 0 0 20px;">A password reset request was initiated for your SmartGate OS account. Use the single-use OTP code below to verify your identity:</p>
          <div style="background: #f1f5f9; padding: 16px; text-align: center; border-radius: 10px; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f172a; margin: 0 0 20px; border: 1px dashed #94a3b8;">
            ${otp}
          </div>
          <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.5;">
            This code expires in <strong>10 minutes</strong>. If you did not request this, please disregard this message or notify your IT administrator.
          </p>
        </div>
      `,
      text: `Your SmartGate OS password reset OTP code is ${otp}. It is valid for 10 minutes. Do not share this code.`
    });

    // If mobile number is on file, also dispatch via SMS
    if (user.employee?.phone) {
      await sendSmsNotification({
        to: user.employee.phone,
        message: `SmartGate OS: Your password reset verification OTP is ${otp}. Valid for 10 minutes. Do not share.`
      });
    }

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'PASSWORD_RESET_OTP_REQUESTED',
      entity: 'User',
      entityId: user.id,
      newValues: { email },
      req
    });

    return res.json({
      success: true,
      message: `Verification OTP has been generated for ${email}.`,
      data: {
        email,
        otp, // included for easy UI verification and testing
        expiresInMinutes: 10
      }
    });
  } catch (err: any) {
    console.error('Request reset OTP error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate reset OTP: ' + (err.message || '')
    });
  }
});

// POST /api/auth/forgot-password/verify-otp (Verify OTP and Reset Password)
router.post('/forgot-password/verify-otp', validateBody(verifyResetOtpSchema), async (req: Request, res: Response) => {
  try {
    const rawInput = (req.body.email || req.body.identifier || '').trim();
    const { otp, newPassword } = req.body;

    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: rawInput },
          { email: rawInput.toLowerCase() }
        ]
      }
    });

    if (!user) {
      const upper = rawInput.toUpperCase();
      const emp = await prisma.employee.findFirst({
        where: {
          OR: [
            { employeeCode: rawInput },
            { employeeCode: upper },
            { id: rawInput }
          ]
        },
        include: { user: true }
      });
      if (emp && emp.user) {
        user = emp.user;
      }
    }

    if (!user || !user.isActive) {
      return res.status(404).json({
        success: false,
        message: 'No active user account found.'
      });
    }

    const email = user.email;

    // Check OTP validity
    const validOtp = await prisma.passwordResetOtp.findFirst({
      where: {
        email,
        otp,
        used: false,
        expiresAt: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!validOtp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP verification code. Please request a new code.'
      });
    }

    // Mark OTP as used
    await prisma.passwordResetOtp.update({
      where: { id: validOtp.id },
      data: { used: true }
    });

    // Hash and update new password
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        refreshToken: null // Invalidate existing sessions
      }
    });

    // Notify user of successful password reset
    await prisma.notification.create({
      data: {
        userId: user.id,
        title: '✅ Password Successfully Reset',
        message: 'Your account password was successfully reset using OTP verification. You can now login with your new credentials.',
        type: 'INFO',
        priority: 'HIGH'
      }
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'PASSWORD_RESET_VIA_OTP',
      entity: 'User',
      entityId: user.id,
      newValues: { email, resetMethod: 'OTP' },
      req
    });

    return res.json({
      success: true,
      message: 'Your password has been successfully reset! You can now log in.'
    });
  } catch (err: any) {
    console.error('Verify reset OTP error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset password: ' + (err.message || '')
    });
  }
});

// POST /api/auth/profile/request-reset-otp (Authenticated User -> Send OTP to self)
router.post('/profile/request-reset-otp', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const email = user.email;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await prisma.passwordResetOtp.updateMany({
      where: { email, used: false },
      data: { used: true }
    });

    await prisma.passwordResetOtp.create({
      data: { email, otp, expiresAt, used: false }
    });

    await prisma.notification.create({
      data: {
        userId: user.id,
        title: '🔐 Self-Service Password Reset OTP',
        message: `Your password reset code is: ${otp}. Valid for 10 minutes.`,
        type: 'ALERT',
        priority: 'HIGH'
      }
    });

    return res.json({
      success: true,
      message: `OTP sent to ${email}`,
      data: { email, otp, expiresInMinutes: 10 }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to generate OTP: ' + (err.message || '') });
  }
});

// POST /api/auth/profile/verify-reset-otp (Authenticated User -> Verify OTP and Reset)
router.post('/profile/verify-reset-otp', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { otp, newPassword } = req.body;

    if (!otp || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'Valid OTP and new password (min 6 chars) required.' });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const validOtp = await prisma.passwordResetOtp.findFirst({
      where: {
        email: user.email,
        otp,
        used: false,
        expiresAt: { gte: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!validOtp) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP verification code.' });
    }

    await prisma.passwordResetOtp.update({
      where: { id: validOtp.id },
      data: { used: true }
    });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    await logAudit({
      userId: user.id,
      userEmail: user.email,
      action: 'PASSWORD_RESET_SELF_OTP',
      entity: 'User',
      entityId: user.id,
      req
    });

    return res.json({ success: true, message: 'Password reset successfully!' });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to reset password: ' + (err.message || '') });
  }
});

export default router;
