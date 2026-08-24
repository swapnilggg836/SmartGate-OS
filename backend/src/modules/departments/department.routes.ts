import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { UserRole } from '@smart-gate/types';

const router = Router();

const createDeptSchema = z.object({
  name: z.string().min(2),
  code: z.string().optional(),
  description: z.string().optional()
});

// GET /api/departments
router.get('/', async (req, res: Response) => {
  try {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { employees: true } } },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: departments });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch departments' });
  }
});

// POST /api/departments (Admin only)
router.post('/', authenticate, requireRoles(UserRole.SUPER_ADMIN), validateBody(createDeptSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { name, code, description } = req.body;
    const dept = await prisma.department.create({
      data: { name, code: code || name.toUpperCase().replace(/\s+/g, '').slice(0, 6), description: description || null } as any
    });
    return res.status(201).json({ success: true, data: dept });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: 'Department name or code already exists' });
  }
});

// PATCH /api/departments/:id (Admin only)
router.patch('/:id', authenticate, requireRoles(UserRole.SUPER_ADMIN), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, description } = req.body;
    const dept = await prisma.department.update({
      where: { id },
      data: { ...(name && { name }), ...(code && { code }), ...(description !== undefined && { description: description || null }) } as any
    });
    return res.json({ success: true, data: dept });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: 'Failed to update department' });
  }
});

export default router;
