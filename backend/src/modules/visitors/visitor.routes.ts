import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { logAudit } from '../../lib/audit';
import { emitToUser, emitToRole } from '../../lib/socket';
import { sendEmailNotification } from '../../lib/email';
import { UserRole } from '@smart-gate/types';

const router = Router();

// ?? Helpers ??????????????????????????????????????????????????????????????????

async function generateVisitId(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.visitorVisit.count();
  return `VIS-${year}-${String(count + 1).padStart(5, '0')}`;
}

async function generatePassNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const count = await prisma.visitorPass.count();
  return `VP-${year}-${String(count + 1).padStart(5, '0')}`;
}

function generateQrToken(): string {
  return crypto.randomUUID();
}

const HOST_SELECT = {
  id: true, email: true, role: true, isActive: true,
  employee: {
    select: {
      id: true, firstName: true, lastName: true, designation: true, avatarUrl: true,
      department: { select: { id: true, name: true } },
    },
  },
};

const VISIT_INCLUDE = {
  visitor: true,
  hostUser: { select: HOST_SELECT },
  department: { select: { id: true, name: true } },
  createdByUser: { select: { id: true, email: true, employee: { select: { firstName: true, lastName: true } } } },
  groupMembers: { include: { visitor: true } },
  visitorPass: true,
  checkIns: {
    include: { securityUser: { select: { id: true, email: true, employee: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: 'desc' as const },
  },
  checkOuts: {
    include: { securityUser: { select: { id: true, email: true, employee: { select: { firstName: true, lastName: true } } } } },
    orderBy: { createdAt: 'desc' as const },
  },
} as const;

async function issueVisitorPass(visitId: string): Promise<any> {
  const visit = await prisma.visitorVisit.findUnique({
    where: { id: visitId },
    include: {
      visitor: true,
      hostUser: { select: { id: true, email: true, employee: { select: { firstName: true, lastName: true } } } },
    },
  });
  if (!visit) return null;

  const passNumber = await generatePassNumber();
  const qrToken = generateQrToken();

  const visitDate = new Date(visit.visitDate);
  const [entryH, entryM] = visit.expectedEntryTime.split(':').map(Number);
  const [exitH, exitM] = visit.expectedExitTime.split(':').map(Number);

  const validFrom = new Date(visitDate);
  validFrom.setHours(Math.max(0, entryH - 1), entryM, 0, 0);

  const validUntil = new Date(visitDate);
  validUntil.setHours(exitH + 2, exitM, 0, 0);

  const pass = await prisma.visitorPass.create({
    data: { passNumber, visitId: visit.id, qrToken, validFrom, validUntil, status: 'ACTIVE' },
  });

  await prisma.visitorVisit.update({ where: { id: visitId }, data: { status: 'APPROVED' } });

  const hostEmp = (visit.hostUser as any)?.employee;
  const hostName = hostEmp ? `${hostEmp.firstName} ${hostEmp.lastName}` : visit.hostUser.email;

  await prisma.notification.create({
    data: {
      userId: visit.hostUserId,
      title: 'Visitor Pass Issued',
      message: `Pass ${passNumber} issued for ${visit.visitor.fullName}. Visit on ${new Date(visit.visitDate).toLocaleDateString()}.`,
      type: 'INFO',
      metadata: JSON.stringify({ visitId: visit.visitId, passNumber }),
    },
  });
  emitToUser(visit.hostUserId, 'visitor:pass_issued', { visitId: visit.visitId, passNumber });
  emitToRole(UserRole.SECURITY_GUARD, 'visitor:new_expected', {
    visitId: visit.visitId, visitorName: visit.visitor.fullName,
    purpose: visit.purpose, expectedEntryTime: visit.expectedEntryTime, passNumber,
  });

  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  if (visit.visitor.email) {
    await sendEmailNotification({
      to: visit.visitor.email,
      subject: `Your Visitor Pass: ${passNumber}`,
      html: `<p>Dear ${visit.visitor.fullName},</p><p>Your visit has been approved.</p><p><strong>Pass:</strong> ${passNumber}<br><strong>Host:</strong> ${hostName}<br><strong>Date:</strong> ${new Date(visit.visitDate).toLocaleDateString()}<br><strong>Entry:</strong> ${visit.expectedEntryTime} &mdash; <strong>Exit:</strong> ${visit.expectedExitTime}</p><p><a href="${frontendUrl}/visitor-pass/${qrToken}">View Pass &amp; QR Code</a></p>`,
    });
  }
  return pass;
}

// ?? Validation Schemas ????????????????????????????????????????????????????????

const visitorBaseSchema = z.object({
  fullName: z.string().min(2),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY']).optional(),
  mobile: z.string().min(7).max(20),
  email: z.string().email().optional().or(z.literal('')),
  organization: z.string().optional(),
  idType: z.enum(['AADHAR', 'PAN', 'PASSPORT', 'DRIVING_LICENSE', 'OTHER']).optional(),
});

const visitDetailsSchema = z.object({
  hostUserId: z.string().min(1),
  departmentId: z.string().optional(),
  purpose: z.string().min(3).max(255),
  description: z.string().optional(),
  visitDate: z.string(),
  expectedEntryTime: z.string().regex(/^\d{2}:\d{2}$/),
  expectedExitTime: z.string().regex(/^\d{2}:\d{2}$/),
  numberOfVisitors: z.number().int().min(1).max(50).optional().default(1),
  vehicleNumber: z.string().optional(),
  vehicleType: z.string().optional(),
  requiresParkingSlot: z.boolean().optional().default(false),
  additionalVisitors: z.array(z.object({ fullName: z.string().min(2), mobile: z.string().min(7), gender: z.string().optional() })).optional().default([]),
});

const inviteSchema = visitorBaseSchema.merge(visitDetailsSchema);

const walkInSchema = visitorBaseSchema.merge(
  visitDetailsSchema.extend({
    visitDate: z.string().optional(),
    expectedEntryTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  })
);

const respondSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT', 'WAIT']),
  notes: z.string().optional(),
  rejectionReason: z.string().optional(),
});

const checkInSchema = z.object({
  gate: z.string().optional(),
  idVerified: z.boolean().optional().default(false),
  notes: z.string().optional(),
});

const checkOutSchema = z.object({
  gate: z.string().optional(),
  notes: z.string().optional(),
});

const verifySchema = z.object({ identifier: z.string().min(1) });

// ?? Public: Visitor views their pass by QR token (no auth) ???????????????????
router.get('/pass/:token', async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const pass = await prisma.visitorPass.findUnique({
      where: { qrToken: token },
      include: {
        visit: {
          include: {
            visitor: true,
            hostUser: { select: { email: true, employee: { select: { firstName: true, lastName: true, designation: true, department: { select: { name: true } } } } } },
            department: { select: { name: true } },
          },
        },
      },
    });
    if (!pass) return res.status(404).json({ success: false, message: 'Visitor pass not found.' });
    const hostEmp = (pass.visit.hostUser as any)?.employee;
    return res.json({
      success: true,
      data: {
        passNumber: pass.passNumber, visitId: pass.visit.visitId, qrToken: pass.qrToken,
        validFrom: pass.validFrom, validUntil: pass.validUntil, status: pass.status, visitStatus: pass.visit.status,
        visitorName: pass.visit.visitor.fullName, purpose: pass.visit.purpose,
        visitDate: pass.visit.visitDate, expectedEntryTime: pass.visit.expectedEntryTime, expectedExitTime: pass.visit.expectedExitTime,
        hostName: hostEmp ? `${hostEmp.firstName} ${hostEmp.lastName}` : pass.visit.hostUser.email,
        hostDesignation: hostEmp?.designation || '',
        departmentName: pass.visit.department?.name || hostEmp?.department?.name || '',
        numberOfVisitors: pass.visit.numberOfVisitors,
      },
    });
  } catch (err) { return res.status(500).json({ success: false, message: 'Failed to fetch visitor pass.' }); }
});

// ?? Controlled host search (min safe data only) ???????????????????????????????
router.get('/search-host', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const q = String(req.query.q || '').trim();
    if (q.length < 2) return res.json({ success: true, data: [] });
    const results = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['EMPLOYEE', 'MANAGER', 'HR', 'GM', 'SUPER_ADMIN'] },
        OR: [
          { employee: { firstName: { contains: q } } },
          { employee: { lastName: { contains: q } } },
          { employee: { employeeCode: { contains: q } } },
        ],
      },
      select: {
        id: true, email: true, role: true, isActive: true,
        employee: {
          select: { id: true, employeeCode: true, firstName: true, lastName: true, designation: true, avatarUrl: true, department: { select: { id: true, name: true } } },
        },
      },
      take: 10,
    });
    return res.json({ success: true, data: results });
  } catch (err) { return res.status(500).json({ success: false, message: 'Host search failed.' }); }
});

// ?? POST /api/visitors/invite ?????????????????????????????????????????????????
router.post('/invite', authenticate, validateBody(inviteSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { fullName, gender, mobile, email, organization, idType, hostUserId, departmentId, purpose, description, visitDate, expectedEntryTime, expectedExitTime, numberOfVisitors, vehicleNumber, vehicleType, requiresParkingSlot, additionalVisitors } = req.body;

    const hostUser = await prisma.user.findUnique({ where: { id: hostUserId, isActive: true }, select: { id: true, email: true } });
    if (!hostUser) return res.status(404).json({ success: false, message: 'Host not found or inactive.' });

    let visitor = await prisma.visitor.findFirst({ where: { mobile } });
    if (!visitor) {
      visitor = await prisma.visitor.create({ data: { fullName, gender: gender || null, mobile, email: email || null, organization: organization || null, idType: idType || null } });
    } else {
      visitor = await prisma.visitor.update({ where: { id: visitor.id }, data: { fullName, email: email || null, organization: organization || null } });
    }

    const visitId = await generateVisitId();
    const isSelfHost = userId === hostUserId;

    const visit = await prisma.visitorVisit.create({
      data: {
        visitId, visitorId: visitor.id, hostUserId, departmentId: departmentId || null,
        purpose, description: description || null, visitDate: new Date(visitDate),
        expectedEntryTime, expectedExitTime, numberOfVisitors: numberOfVisitors || 1,
        vehicleNumber: vehicleNumber || null, vehicleType: vehicleType || null,
        requiresParkingSlot: Boolean(requiresParkingSlot), requiresHostApproval: !isSelfHost,
        visitType: 'PRE_REGISTERED', status: isSelfHost ? 'APPROVED' : 'PENDING_HOST',
        createdByUserId: userId,
      },
      include: VISIT_INCLUDE,
    });

    if (additionalVisitors && additionalVisitors.length > 0) {
      for (const av of additionalVisitors) {
        let avRec = await prisma.visitor.findFirst({ where: { mobile: av.mobile } });
        if (!avRec) avRec = await prisma.visitor.create({ data: { fullName: av.fullName, mobile: av.mobile, gender: av.gender || null } });
        await prisma.visitorGroupMember.create({ data: { visitId: visit.id, visitorId: avRec.id } });
      }
    }

    if (isSelfHost) {
      await issueVisitorPass(visit.id);
    } else {
      await prisma.notification.create({
        data: {
          userId: hostUserId, title: 'New Visitor Invitation',
          message: `${fullName} wants to visit you on ${new Date(visitDate).toLocaleDateString()} at ${expectedEntryTime}. Purpose: ${purpose}`,
          type: 'INFO', metadata: JSON.stringify({ visitId }),
        },
      });
      emitToUser(hostUserId, 'visitor:new_invite', { visitId, visitorName: fullName, purpose, visitDate, expectedEntryTime });
    }

    await logAudit({ userId, action: 'VISITOR_INVITE_CREATED', entity: 'VisitorVisit', entityId: visit.id, newValues: { visitId, visitorName: fullName, hostUserId, purpose }, req });
    return res.status(201).json({ success: true, data: visit });
  } catch (err: any) {
    console.error('Invite visitor error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create visitor invitation.' });
  }
});

// ?? POST /api/visitors/walk-in ????????????????????????????????????????????????
router.post('/walk-in', authenticate, requireRoles(UserRole.SECURITY_GUARD, UserRole.HR, UserRole.SUPER_ADMIN), validateBody(walkInSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { fullName, gender, mobile, email, organization, idType, hostUserId, departmentId, purpose, description, visitDate, expectedEntryTime, expectedExitTime, numberOfVisitors, vehicleNumber, vehicleType, additionalVisitors } = req.body;

    const hostUser = await prisma.user.findUnique({ where: { id: hostUserId, isActive: true }, select: { id: true, email: true, employee: { select: { firstName: true, lastName: true } } } });
    if (!hostUser) return res.status(404).json({ success: false, message: 'Host not found or inactive.' });

    let visitor = await prisma.visitor.findFirst({ where: { mobile } });
    if (!visitor) {
      visitor = await prisma.visitor.create({ data: { fullName, gender: gender || null, mobile, email: email || null, organization: organization || null, idType: idType || null } });
    } else {
      visitor = await prisma.visitor.update({ where: { id: visitor.id }, data: { fullName, email: email || null, organization: organization || null } });
    }

    const visitId = await generateVisitId();
    const today = visitDate ? new Date(visitDate) : new Date();
    const now = new Date();
    const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;  

    const visit = await prisma.visitorVisit.create({
      data: {
        visitId, visitorId: visitor.id, hostUserId, departmentId: departmentId || null,
        purpose, description: description || null, visitDate: today,
        expectedEntryTime: expectedEntryTime || nowTime, expectedExitTime,
        numberOfVisitors: numberOfVisitors || 1, vehicleNumber: vehicleNumber || null, vehicleType: vehicleType || null,
        requiresHostApproval: true, visitType: 'WALK_IN', status: 'PENDING_HOST', createdByUserId: userId,
      },
      include: VISIT_INCLUDE,
    });

    if (additionalVisitors && additionalVisitors.length > 0) {
      for (const av of additionalVisitors) {
        let avRec = await prisma.visitor.findFirst({ where: { mobile: av.mobile } });
        if (!avRec) avRec = await prisma.visitor.create({ data: { fullName: av.fullName, mobile: av.mobile, gender: av.gender || null } });
        await prisma.visitorGroupMember.create({ data: { visitId: visit.id, visitorId: avRec.id } });
      }
    }

    const hostName = (hostUser as any).employee ? `${(hostUser as any).employee.firstName} ${(hostUser as any).employee.lastName}` : hostUser.email;
    await prisma.notification.create({
      data: {
        userId: hostUserId, title: 'Walk-in Visitor Waiting',
        message: `${fullName} is at reception to meet you. Purpose: ${purpose}. Please respond promptly.`,
        type: 'INFO', priority: 'HIGH', metadata: JSON.stringify({ visitId }),
      },
    });
    emitToUser(hostUserId, 'visitor:walkin_waiting', { visitId, visitorName: fullName, purpose });

    await logAudit({ userId, action: 'VISITOR_WALKIN_REGISTERED', entity: 'VisitorVisit', entityId: visit.id, newValues: { visitId, visitorName: fullName, hostUserId, purpose }, req });
    return res.status(201).json({ success: true, data: visit });
  } catch (err: any) {
    console.error('Walk-in error:', err);
    return res.status(500).json({ success: false, message: 'Failed to register walk-in visitor.' });
  }
});

// ?? GET /api/visitors/my-visits ???????????????????????????????????????????????
router.get('/my-visits', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { status, date } = req.query;
    const where: any = { createdByUserId: userId };
    if (status) where.status = String(status);
    if (date) {
      const d = new Date(String(date)); const d2 = new Date(d); d2.setDate(d.getDate() + 1);
      where.visitDate = { gte: d, lt: d2 };
    }
    const visits = await prisma.visitorVisit.findMany({ where, include: VISIT_INCLUDE, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: visits });
  } catch (err) { return res.status(500).json({ success: false, message: 'Failed to fetch your visits.' }); }
});

// ?? GET /api/visitors/incoming ????????????????????????????????????????????????
router.get('/incoming', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { status } = req.query;
    const where: any = { hostUserId: userId };
    if (status) where.status = String(status);
    const visits = await prisma.visitorVisit.findMany({ where, include: VISIT_INCLUDE, orderBy: { createdAt: 'desc' } });
    return res.json({ success: true, data: visits });
  } catch (err) { return res.status(500).json({ success: false, message: 'Failed to fetch incoming visits.' }); }
});

// ?? GET /api/visitors/:visitId ????????????????????????????????????????????????
router.get('/:visitId', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { visitId } = req.params;
    const visit = await prisma.visitorVisit.findFirst({
      where: { OR: [{ visitId }, { id: visitId }] },
      include: VISIT_INCLUDE,
    });
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found.' });
    return res.json({ success: true, data: visit });
  } catch (err) { return res.status(500).json({ success: false, message: 'Failed to fetch visit.' }); }
});

// ?? PATCH /api/visitors/:visitId/respond ??????????????????????????????????????
router.patch('/:visitId/respond', authenticate, validateBody(respondSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { visitId } = req.params;
    const { action, notes, rejectionReason } = req.body;

    const visit = await prisma.visitorVisit.findFirst({ where: { OR: [{ visitId }, { id: visitId }] }, include: { visitor: true } });
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found.' });

    const canRespond = visit.hostUserId === userId || ['SUPER_ADMIN', 'HR'].includes(req.user!.role);
    if (!canRespond) return res.status(403).json({ success: false, message: 'Only the host can respond to this visit.' });
    if (!['PENDING_HOST', 'WAITING'].includes(visit.status)) return res.status(400).json({ success: false, message: `Visit is already ${visit.status}.` });

    let newStatus = visit.status;
    let pass = null;

    if (action === 'APPROVE') {
      pass = await issueVisitorPass(visit.id);
      newStatus = 'APPROVED';
    } else if (action === 'REJECT') {
      newStatus = 'REJECTED';
      await prisma.visitorVisit.update({ where: { id: visit.id }, data: { status: 'REJECTED', rejectionReason: rejectionReason || null, hostNotes: notes || null } });
      emitToRole(UserRole.SECURITY_GUARD, 'visitor:rejected', { visitId: visit.visitId, visitorName: visit.visitor.fullName, rejectionReason });
    } else if (action === 'WAIT') {
      newStatus = 'WAITING';
      await prisma.visitorVisit.update({ where: { id: visit.id }, data: { status: 'WAITING', hostNotes: notes || null } });
      emitToRole(UserRole.SECURITY_GUARD, 'visitor:waiting', { visitId: visit.visitId, visitorName: visit.visitor.fullName });
    }

    await prisma.visitorAuditLog.create({ data: { visitId: visit.id, userId, action: `HOST_${action}`, details: rejectionReason || notes || null } });
    await logAudit({ userId, action: `VISITOR_HOST_${action}`, entity: 'VisitorVisit', entityId: visit.id, newValues: { status: newStatus }, req });
    return res.json({ success: true, message: `Visit ${action}d.`, status: newStatus, pass });
  } catch (err: any) {
    console.error('Respond error:', err);
    return res.status(500).json({ success: false, message: 'Failed to respond to visit.' });
  }
});

// ?? PATCH /api/visitors/:visitId/cancel ???????????????????????????????????????
router.patch('/:visitId/cancel', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { visitId } = req.params;
    const { reason } = req.body;

    const visit = await prisma.visitorVisit.findFirst({ where: { OR: [{ visitId }, { id: visitId }] }, include: { visitor: true, visitorPass: true } });
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found.' });

    const canCancel = visit.createdByUserId === userId || visit.hostUserId === userId || ['SUPER_ADMIN', 'HR'].includes(req.user!.role);
    if (!canCancel) return res.status(403).json({ success: false, message: 'Not authorized to cancel.' });
    if (['CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'].includes(visit.status)) return res.status(400).json({ success: false, message: `Cannot cancel a ${visit.status} visit.` });

    await prisma.$transaction(async (tx) => {
      await tx.visitorVisit.update({ where: { id: visit.id }, data: { status: 'CANCELLED', rejectionReason: reason || null } });
      if (visit.visitorPass) await tx.visitorPass.update({ where: { id: visit.visitorPass.id }, data: { status: 'CANCELLED' } });
    });
    emitToRole(UserRole.SECURITY_GUARD, 'visitor:cancelled', { visitId: visit.visitId, visitorName: visit.visitor.fullName });
    await prisma.visitorAuditLog.create({ data: { visitId: visit.id, userId, action: 'CANCELLED', details: reason || null } });
    await logAudit({ userId, action: 'VISITOR_CANCELLED', entity: 'VisitorVisit', entityId: visit.id, newValues: { reason }, req });
    return res.json({ success: true, message: 'Visit cancelled.' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Failed to cancel visit.' }); }
});

// ?? Security Routes ???????????????????????????????????????????????????????????

// POST /api/visitors/security/verify
router.post('/security/verify', authenticate, requireRoles(UserRole.SECURITY_GUARD, UserRole.HR, UserRole.SUPER_ADMIN), validateBody(verifySchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { identifier } = req.body;
    // Try by qrToken or passNumber
    const pass = await prisma.visitorPass.findFirst({
      where: { OR: [{ qrToken: identifier }, { passNumber: identifier }] },
      include: { visit: { include: VISIT_INCLUDE } },
    });
    if (pass) {
      const now = new Date();
      const warnings: string[] = [];
      if (pass.status === 'EXPIRED') warnings.push('Pass is EXPIRED');
      if (pass.status === 'CANCELLED') warnings.push('Pass is CANCELLED');
      if (now < new Date(pass.validFrom)) warnings.push('Pass is not yet valid');
      if (now > new Date(pass.validUntil)) warnings.push('Pass validity window has passed');
      if (['CHECKED_OUT', 'COMPLETED'].includes(pass.visit.status)) warnings.push('Visitor has already exited');
      return res.json({ success: true, type: 'pass', data: pass, warnings });
    }
    // Try by visitId
    const byVisitId = await prisma.visitorVisit.findFirst({ where: { visitId: identifier }, include: VISIT_INCLUDE });
    if (byVisitId) return res.json({ success: true, type: 'visit', data: byVisitId, warnings: [] });
    // Try by mobile (today's visits)
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const byMobile = await prisma.visitorVisit.findFirst({
      where: { visitor: { mobile: identifier }, visitDate: { gte: todayStart } },
      include: VISIT_INCLUDE, orderBy: { createdAt: 'desc' },
    });
    if (byMobile) return res.json({ success: true, type: 'visit', data: byMobile, warnings: [] });
    return res.status(404).json({ success: false, message: 'No visitor record found.' });
  } catch (err) { return res.status(500).json({ success: false, message: 'Verification failed.' }); }
});

// GET /api/visitors/security/today
router.get('/security/today', authenticate, requireRoles(UserRole.SECURITY_GUARD, UserRole.HR, UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const visits = await prisma.visitorVisit.findMany({ where: { visitDate: { gte: today, lt: tomorrow } }, include: VISIT_INCLUDE, orderBy: { expectedEntryTime: 'asc' } });
    return res.json({ success: true, data: visits });
  } catch (err) { return res.status(500).json({ success: false, message: 'Failed to fetch today visitors.' }); }
});

// GET /api/visitors/security/inside
router.get('/security/inside', authenticate, requireRoles(UserRole.SECURITY_GUARD, UserRole.HR, UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const visits = await prisma.visitorVisit.findMany({ where: { status: { in: ['CHECKED_IN', 'OVERDUE'] } }, include: VISIT_INCLUDE, orderBy: { updatedAt: 'asc' } });
    return res.json({ success: true, data: visits });
  } catch (err) { return res.status(500).json({ success: false, message: 'Failed to fetch visitors inside.' }); }
});

// POST /api/visitors/security/check-in/:visitId
router.post('/security/check-in/:visitId', authenticate, requireRoles(UserRole.SECURITY_GUARD, UserRole.HR, UserRole.SUPER_ADMIN), validateBody(checkInSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { visitId } = req.params;
    const { gate, idVerified, notes } = req.body;
    const visit = await prisma.visitorVisit.findFirst({ where: { OR: [{ visitId }, { id: visitId }] }, include: { visitor: true, visitorPass: true, hostUser: { select: { id: true } } } });
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found.' });
    if (!['APPROVED', 'WAITING'].includes(visit.status)) return res.status(400).json({ success: false, message: `Visit is ${visit.status}. Must be APPROVED to check in.` });
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.visitorVisit.update({ where: { id: visit.id }, data: { status: 'CHECKED_IN' } });
      if (visit.visitorPass) await tx.visitorPass.update({ where: { id: visit.visitorPass.id }, data: { status: 'USED' } });
      await tx.visitorCheckIn.create({ data: { visitId: visit.id, passId: visit.visitorPass?.id || null, actualEntryTime: now, securityUserId: userId, gate: gate || null, idVerified: Boolean(idVerified), notes: notes || null } });
      await tx.visitorAuditLog.create({ data: { visitId: visit.id, userId, action: 'CHECKED_IN', details: `Gate: ${gate || 'main'}, ID verified: ${idVerified}`, ipAddress: req.ip || null } });
    });
    await prisma.notification.create({ data: { userId: visit.hostUserId, title: 'Visitor Checked In', message: `${visit.visitor.fullName} has arrived and checked in at ${now.toLocaleTimeString()}.`, type: 'INFO', metadata: JSON.stringify({ visitId: visit.visitId }) } });
    emitToUser(visit.hostUserId, 'visitor:checked_in', { visitId: visit.visitId, visitorName: visit.visitor.fullName });
    return res.json({ success: true, message: 'Visitor checked in.', visitId: visit.visitId });
  } catch (err) { console.error('Check-in error:', err); return res.status(500).json({ success: false, message: 'Check-in failed.' }); }
});

// POST /api/visitors/security/check-out/:visitId
router.post('/security/check-out/:visitId', authenticate, requireRoles(UserRole.SECURITY_GUARD, UserRole.HR, UserRole.SUPER_ADMIN), validateBody(checkOutSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { visitId } = req.params;
    const { gate, notes } = req.body;
    const visit = await prisma.visitorVisit.findFirst({ where: { OR: [{ visitId }, { id: visitId }] }, include: { visitor: true, visitorPass: true, hostUser: { select: { id: true } } } });
    if (!visit) return res.status(404).json({ success: false, message: 'Visit not found.' });
    if (!['CHECKED_IN', 'OVERDUE'].includes(visit.status)) return res.status(400).json({ success: false, message: `Visitor is not checked in. Status: ${visit.status}` });
    const now = new Date();
    await prisma.$transaction(async (tx) => {
      await tx.visitorVisit.update({ where: { id: visit.id }, data: { status: 'COMPLETED' } });
      await tx.visitorCheckOut.create({ data: { visitId: visit.id, passId: visit.visitorPass?.id || null, actualExitTime: now, securityUserId: userId, gate: gate || null, notes: notes || null } });
      await tx.visitorAuditLog.create({ data: { visitId: visit.id, userId, action: 'CHECKED_OUT', details: `Gate: ${gate || 'main'}`, ipAddress: req.ip || null } });
    });
    await prisma.notification.create({ data: { userId: visit.hostUserId, title: 'Visitor Checked Out', message: `${visit.visitor.fullName} has left at ${now.toLocaleTimeString()}.`, type: 'INFO', metadata: JSON.stringify({ visitId: visit.visitId }) } });
    emitToUser(visit.hostUserId, 'visitor:checked_out', { visitId: visit.visitId, visitorName: visit.visitor.fullName });
    return res.json({ success: true, message: 'Visitor checked out.', visitId: visit.visitId });
  } catch (err) { return res.status(500).json({ success: false, message: 'Check-out failed.' }); }
});

// ?? Admin Routes ??????????????????????????????????????????????????????????????

// GET /api/visitors ? all visits with filters
router.get('/', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.HR, UserRole.GM, UserRole.SECURITY_GUARD), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status, hostUserId, departmentId, date, from, to, visitType, q } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (hostUserId) where.hostUserId = String(hostUserId);
    if (departmentId) where.departmentId = String(departmentId);
    if (visitType) where.visitType = String(visitType);
    if (date) {
      const d = new Date(String(date)); const d2 = new Date(d); d2.setDate(d.getDate() + 1);
      where.visitDate = { gte: d, lt: d2 };
    } else if (from || to) {
      where.visitDate = {};
      if (from) where.visitDate.gte = new Date(String(from));
      if (to) where.visitDate.lte = new Date(String(to));
    }
    if (q) {
      where.OR = [
        { visitId: { contains: String(q) } },
        { visitor: { fullName: { contains: String(q) } } },
        { visitor: { mobile: { contains: String(q) } } },
        { purpose: { contains: String(q) } },
      ];
    }
    const visits = await prisma.visitorVisit.findMany({ where, include: VISIT_INCLUDE, orderBy: { createdAt: 'desc' }, take: 200 });
    return res.json({ success: true, data: visits, total: visits.length });
  } catch (err) { return res.status(500).json({ success: false, message: 'Failed to fetch visitor records.' }); }
});

// GET /api/visitors/stats
router.get('/stats', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.HR, UserRole.GM, UserRole.SECURITY_GUARD), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const [total, todayCount, inside, waiting, completed, rejected, cancelled, expired, overdue] = await Promise.all([
      prisma.visitorVisit.count(),
      prisma.visitorVisit.count({ where: { visitDate: { gte: today, lt: tomorrow } } }),
      prisma.visitorVisit.count({ where: { status: 'CHECKED_IN' } }),
      prisma.visitorVisit.count({ where: { status: 'WAITING' } }),
      prisma.visitorVisit.count({ where: { status: { in: ['COMPLETED', 'CHECKED_OUT'] } } }),
      prisma.visitorVisit.count({ where: { status: 'REJECTED' } }),
      prisma.visitorVisit.count({ where: { status: 'CANCELLED' } }),
      prisma.visitorVisit.count({ where: { status: 'EXPIRED' } }),
      prisma.visitorVisit.count({ where: { status: 'OVERDUE' } }),
    ]);
    return res.json({ success: true, data: { total, today: todayCount, inside, waiting, completed, rejected, cancelled, expired, overdue } });
  } catch (err) { return res.status(500).json({ success: false, message: 'Failed to fetch stats.' }); }
});

// GET /api/visitors/emergency ? who is inside right now
router.get('/emergency', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.HR, UserRole.GM, UserRole.SECURITY_GUARD), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const visits = await prisma.visitorVisit.findMany({
      where: { status: { in: ['CHECKED_IN', 'OVERDUE'] } },
      include: { visitor: true, hostUser: { select: { email: true, employee: { select: { firstName: true, lastName: true } } } }, department: { select: { name: true } }, checkIns: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'asc' },
    });
    const data = visits.map((v) => ({
      visitId: v.visitId,
      visitorName: v.visitor.fullName,
      mobile: v.visitor.mobile,
      hostName: (v.hostUser as any)?.employee ? `${(v.hostUser as any).employee.firstName} ${(v.hostUser as any).employee.lastName}` : (v.hostUser as any)?.email || '',
      department: v.department?.name || '',
      entryTime: (v.checkIns as any)[0]?.actualEntryTime || null,
      expectedExitTime: v.expectedExitTime,
      status: v.status,
      numberOfVisitors: v.numberOfVisitors,
    }));
    return res.json({ success: true, data, total: data.length, generatedAt: new Date().toISOString() });
  } catch (err) { return res.status(500).json({ success: false, message: 'Failed to generate emergency list.' }); }
});

export default router;
