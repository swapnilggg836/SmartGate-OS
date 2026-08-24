import { Router, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { UserRole } from '@smart-gate/types';

const router = Router();

// GET /api/audit-logs (Admin / HR)
router.get('/', authenticate, requireRoles(UserRole.SUPER_ADMIN, UserRole.HR), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { action, entity, search } = req.query;

    const where: any = {};
    if (action) where.action = String(action);
    if (entity) where.entity = String(entity);
    if (search) {
      const s = String(search);
      where.OR = [
        { userEmail: { contains: s } },
        { action: { contains: s } },
        { entityId: { contains: s } }
      ];
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          include: { employee: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch audit logs' });
  }
});

export default router;
