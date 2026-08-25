import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { validateBody } from '../../middleware/validate';
import { logAudit } from '../../lib/audit';
import { emitToUser } from '../../lib/socket';
import { UserRole, ConnectionType, ConnectionStatus } from '@smart-gate/types';

const router = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Validation schemas
// ─────────────────────────────────────────────────────────────────────────────

const connectSchema = z.object({
  authorityUserId: z.string().min(1, 'Authority user ID required'),
  connectionType: z.nativeEnum(ConnectionType)
});

const respondSchema = z.object({
  status: z.enum(['ACTIVE', 'REJECTED']),
  rejectionReason: z.string().optional()
});

const delegateSchema = z.object({
  toUserId: z.string().min(1),
  connectionType: z.nativeEnum(ConnectionType),
  startDate: z.string(),
  endDate: z.string(),
  reason: z.string().optional()
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: resolve effective authority (checks temporary delegation first)
// ─────────────────────────────────────────────────────────────────────────────

export async function resolveEffectiveAuthority(
  authorityUserId: string,
  connectionType: string
): Promise<string> {
  const now = new Date();
  const delegation = await prisma.temporaryDelegation.findFirst({
    where: {
      fromUserId: authorityUserId,
      connectionType,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now }
    }
  });
  return delegation ? delegation.toUserId : authorityUserId;
}

// Helper: sync denormalized authority fields on Employee after connection change
async function syncEmployeeAuthority(
  juniorUserId: string,
  connectionType: string,
  authorityUserId: string | null
) {
  const employee = await prisma.employee.findUnique({ where: { userId: juniorUserId } });
  if (!employee) return;

  const update: any = {};
  if (connectionType === ConnectionType.REPORTING_MANAGER) update.managerId = authorityUserId;
  if (connectionType === ConnectionType.HR_AUTHORITY) update.hrAuthorityId = authorityUserId;
  if (connectionType === ConnectionType.GM_AUTHORITY) update.gmAuthorityId = authorityUserId;

  if (Object.keys(update).length > 0) {
    await prisma.employee.update({ where: { userId: juniorUserId }, data: update });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/authority/search — Search users to connect as authority
// ─────────────────────────────────────────────────────────────────────────────

router.get('/search', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { q, connectionType } = req.query;
    if (!q || String(q).trim().length < 2) {
      return res.json({ success: true, data: [] });
    }

    const s = String(q).toLowerCase();

    // Determine which roles can be authority for a given connectionType
    let allowedRoles: string[] = [
      UserRole.MANAGER, UserRole.HR, UserRole.GM, UserRole.SUPER_ADMIN
    ];
    if (connectionType === ConnectionType.REPORTING_MANAGER) {
      allowedRoles = [UserRole.MANAGER, UserRole.SUPER_ADMIN, UserRole.GM];
    } else if (connectionType === ConnectionType.HR_AUTHORITY) {
      allowedRoles = [UserRole.HR, UserRole.SUPER_ADMIN];
    } else if (connectionType === ConnectionType.GM_AUTHORITY) {
      allowedRoles = [UserRole.GM, UserRole.SUPER_ADMIN];
    }

    const users = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: allowedRoles },
        id: { not: req.user!.userId }, // exclude self
        employee: {
          OR: [
            { firstName: { contains: s } },
            { lastName: { contains: s } },
            { employeeCode: { contains: s } },
            { designation: { contains: s } }
          ]
        }
      },
      include: {
        employee: {
          include: { department: true }
        }
      },
      take: 10
    });

    const result = users.map(u => ({
      id: u.id,
      email: u.email,
      role: u.role,
      employee: u.employee
        ? {
            id: u.employee.id,
            employeeCode: u.employee.employeeCode,
            firstName: u.employee.firstName,
            lastName: u.employee.lastName,
            designation: u.employee.designation,
            department: u.employee.department?.name,
            avatarUrl: u.employee.avatarUrl
          }
        : null
    }));

    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Search failed' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/authority/my-connections — My current authorities (above me)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/my-connections', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const connections = await prisma.authorityConnection.findMany({
      where: { userId: req.user!.userId },
      include: {
        authorityUser: {
          include: {
            employee: { include: { department: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: connections });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch connections' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/authority/pending-connections — Connections awaiting MY response
// ─────────────────────────────────────────────────────────────────────────────

router.get('/pending-connections', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const connections = await prisma.authorityConnection.findMany({
      where: {
        authorityUserId: req.user!.userId,
        status: ConnectionStatus.PENDING
      },
      include: {
        user: {
          include: {
            employee: { include: { department: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: connections });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch pending connections' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/authority/my-juniors — People directly connected under me
// ─────────────────────────────────────────────────────────────────────────────

router.get('/my-juniors', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { connectionType } = req.query;

    const where: any = {
      authorityUserId: req.user!.userId,
      status: ConnectionStatus.ACTIVE
    };
    if (connectionType) where.connectionType = String(connectionType);

    const connections = await prisma.authorityConnection.findMany({
      where,
      include: {
        user: {
          include: {
            employee: {
              include: {
                department: true,
                leaveRequests: {
                  where: { status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_GM'] } },
                  select: { id: true, status: true }
                },
                exitRequests: {
                  where: { status: { in: ['PENDING_MANAGER', 'PENDING_HR', 'PENDING_GM'] } },
                  select: { id: true, status: true }
                }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return res.json({ success: true, data: connections });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch juniors' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/authority/connect — Send a connection request
// ─────────────────────────────────────────────────────────────────────────────

router.post('/connect', authenticate, validateBody(connectSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { authorityUserId, connectionType } = req.body;

    // Prevent connecting to self
    if (authorityUserId === req.user!.userId) {
      return res.status(400).json({ success: false, message: 'Cannot connect to yourself' });
    }

    // Check if connection already exists
    const existing = await prisma.authorityConnection.findFirst({
      where: {
        userId: req.user!.userId,
        authorityUserId,
        connectionType,
        status: { in: [ConnectionStatus.PENDING, ConnectionStatus.ACTIVE] }
      }
    });

    if (existing) {
      return res.status(409).json({
        success: false,
        message: 'A connection of this type already exists or is pending'
      });
    }

    // Deactivate any existing active connection of same type for this user
    await prisma.authorityConnection.updateMany({
      where: {
        userId: req.user!.userId,
        connectionType,
        status: ConnectionStatus.ACTIVE
      },
      data: { status: ConnectionStatus.INACTIVE, endDate: new Date() }
    });

    // Create new pending connection
    const connection = await prisma.authorityConnection.create({
      data: {
        userId: req.user!.userId,
        authorityUserId,
        connectionType,
        status: ConnectionStatus.PENDING
      },
      include: {
        authorityUser: {
          include: { employee: true }
        }
      }
    });

    // Notify the authority user
    const juniorEmployee = await prisma.employee.findUnique({
      where: { userId: req.user!.userId }
    });

    await prisma.notification.create({
      data: {
        userId: authorityUserId,
        title: 'Authority Connection Request',
        message: `${juniorEmployee?.firstName} ${juniorEmployee?.lastName} (${juniorEmployee?.employeeCode}) has sent you a ${connectionType.replace('_', ' ')} connection request.`,
        type: 'AUTHORITY_REQUEST',
        priority: 'NORMAL',
        metadata: JSON.stringify({ connectionId: connection.id, connectionType })
      }
    });

    emitToUser(authorityUserId, 'authority_request', {
      connectionId: connection.id,
      from: juniorEmployee?.firstName + ' ' + juniorEmployee?.lastName,
      connectionType
    });

    await logAudit({
      userId: req.user!.userId,
      action: 'AUTHORITY_CONNECTION_REQUESTED',
      entity: 'AuthorityConnection',
      entityId: connection.id,
      newValues: { authorityUserId, connectionType },
      req
    });

    return res.status(201).json({ success: true, data: connection });
  } catch (err: any) {
    console.error('Connect authority error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send connection request' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/authority/:id/respond — Accept or reject a connection request
// ─────────────────────────────────────────────────────────────────────────────

router.patch('/:id/respond', authenticate, validateBody(respondSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason } = req.body;

    const connection = await prisma.authorityConnection.findUnique({ where: { id } });
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection not found' });
    }
    if (connection.authorityUserId !== req.user!.userId) {
      return res.status(403).json({ success: false, message: 'Not authorized to respond to this request' });
    }
    if (connection.status !== ConnectionStatus.PENDING) {
      return res.status(400).json({ success: false, message: 'Connection is not in PENDING state' });
    }

    const updatedConnection = await prisma.authorityConnection.update({
      where: { id },
      data: {
        status,
        startDate: status === ConnectionStatus.ACTIVE ? new Date() : undefined,
        rejectionReason: status === ConnectionStatus.REJECTED ? (rejectionReason || null) : null
      }
    });

    // If accepted, sync denormalized authority on Employee
    if (status === ConnectionStatus.ACTIVE) {
      await syncEmployeeAuthority(connection.userId, connection.connectionType, connection.authorityUserId);

      // Record in status history
      const juniorEmployee = await prisma.employee.findUnique({ where: { userId: connection.userId } });
      if (juniorEmployee) {
        await prisma.employeeStatusHistory.create({
          data: {
            employeeId: juniorEmployee.id,
            changeType: 'AUTHORITY_CHANGE',
            newValue: JSON.stringify({
              type: connection.connectionType,
              authorityUserId: connection.authorityUserId
            }),
            changedBy: req.user!.userId,
            notes: `${connection.connectionType} connection accepted`
          }
        });
      }
    }

    // Notify the junior
    const notifType = status === ConnectionStatus.ACTIVE ? 'AUTHORITY_ACCEPTED' : 'AUTHORITY_REJECTED';
    const notifMsg = status === ConnectionStatus.ACTIVE
      ? `Your ${connection.connectionType.replace('_', ' ')} connection request has been accepted.`
      : `Your ${connection.connectionType.replace('_', ' ')} connection request was declined.${rejectionReason ? ' Reason: ' + rejectionReason : ''}`;

    await prisma.notification.create({
      data: {
        userId: connection.userId,
        title: status === ConnectionStatus.ACTIVE ? 'Connection Accepted' : 'Connection Declined',
        message: notifMsg,
        type: notifType,
        priority: 'NORMAL',
        metadata: JSON.stringify({ connectionId: id, connectionType: connection.connectionType })
      }
    });

    emitToUser(connection.userId, 'authority_response', {
      connectionId: id,
      status,
      connectionType: connection.connectionType
    });

    await logAudit({
      userId: req.user!.userId,
      action: `AUTHORITY_CONNECTION_${status}`,
      entity: 'AuthorityConnection',
      entityId: id,
      newValues: { status, rejectionReason },
      req
    });

    return res.json({ success: true, data: updatedConnection });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to respond to connection' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/authority/:id/deactivate — Deactivate an active connection
// ─────────────────────────────────────────────────────────────────────────────

router.patch('/:id/deactivate', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const connection = await prisma.authorityConnection.findUnique({ where: { id } });
    if (!connection) {
      return res.status(404).json({ success: false, message: 'Connection not found' });
    }

    // Only the junior, authority, or admin can deactivate
    const isAdmin = req.user!.role === UserRole.SUPER_ADMIN;
    const isParty = [connection.userId, connection.authorityUserId].includes(req.user!.userId);
    if (!isAdmin && !isParty) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const updated = await prisma.authorityConnection.update({
      where: { id },
      data: {
        status: ConnectionStatus.INACTIVE,
        endDate: new Date(),
        reason: reason || null
      }
    });

    // Clear denormalized field on Employee
    await syncEmployeeAuthority(connection.userId, connection.connectionType, null);

    // Mark junior as NEEDS_REASSIGNMENT if admin-deactivated
    if (isAdmin) {
      await prisma.authorityConnection.updateMany({
        where: {
          userId: connection.userId,
          connectionType: connection.connectionType,
          status: ConnectionStatus.INACTIVE,
          id
        },
        data: { status: ConnectionStatus.NEEDS_REASSIGNMENT }
      });
      await prisma.authorityConnection.update({
        where: { id },
        data: { status: ConnectionStatus.NEEDS_REASSIGNMENT }
      });
    }

    await logAudit({
      userId: req.user!.userId,
      action: 'AUTHORITY_CONNECTION_DEACTIVATED',
      entity: 'AuthorityConnection',
      entityId: id,
      newValues: { reason },
      req
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to deactivate connection' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/authority/delegate — Create a temporary delegation
// ─────────────────────────────────────────────────────────────────────────────

router.post('/delegate', authenticate, validateBody(delegateSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { toUserId, connectionType, startDate, endDate, reason } = req.body;

    if (toUserId === req.user!.userId) {
      return res.status(400).json({ success: false, message: 'Cannot delegate to yourself' });
    }

    // Deactivate existing active delegation of same type
    await prisma.temporaryDelegation.updateMany({
      where: {
        fromUserId: req.user!.userId,
        connectionType,
        isActive: true
      },
      data: { isActive: false }
    });

    const delegation = await prisma.temporaryDelegation.create({
      data: {
        fromUserId: req.user!.userId,
        toUserId,
        connectionType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || null,
        isActive: true
      },
      include: {
        toUser: {
          include: { employee: true }
        }
      }
    });

    // Notify the delegate
    const fromEmployee = await prisma.employee.findUnique({ where: { userId: req.user!.userId } });
    await prisma.notification.create({
      data: {
        userId: toUserId,
        title: 'Temporary Authority Delegation',
        message: `${fromEmployee?.firstName} ${fromEmployee?.lastName} has delegated their ${connectionType.replace('_', ' ')} authority to you from ${startDate} to ${endDate}.`,
        type: 'INFO',
        priority: 'HIGH',
        metadata: JSON.stringify({ delegationId: delegation.id, connectionType })
      }
    });

    emitToUser(toUserId, 'delegation_received', { delegationId: delegation.id, connectionType });

    await logAudit({
      userId: req.user!.userId,
      action: 'TEMPORARY_DELEGATION_CREATED',
      entity: 'TemporaryDelegation',
      entityId: delegation.id,
      newValues: { toUserId, connectionType, startDate, endDate },
      req
    });

    return res.status(201).json({ success: true, data: delegation });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to create delegation' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/authority/my-delegations — My active delegations
// ─────────────────────────────────────────────────────────────────────────────

router.get('/my-delegations', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const delegations = await prisma.temporaryDelegation.findMany({
      where: {
        OR: [
          { fromUserId: req.user!.userId },
          { toUserId: req.user!.userId }
        ]
      },
      include: {
        fromUser: { include: { employee: true } },
        toUser: { include: { employee: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: delegations });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch delegations' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/authority/admin/all — Admin: view all connections (SUPER_ADMIN only)
// ─────────────────────────────────────────────────────────────────────────────

router.get('/admin/all', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { status, connectionType, userId } = req.query;
    const where: any = {};
    if (status) where.status = String(status);
    if (connectionType) where.connectionType = String(connectionType);
    if (userId) where.OR = [{ userId: String(userId) }, { authorityUserId: String(userId) }];

    const connections = await prisma.authorityConnection.findMany({
      where,
      include: {
        user: { include: { employee: { include: { department: true } } } },
        authorityUser: { include: { employee: { include: { department: true } } } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    return res.json({ success: true, data: connections });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch all connections' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/authority/admin/reassign — Admin: force-reassign authority
// ─────────────────────────────────────────────────────────────────────────────

router.post('/admin/reassign', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (req.user!.role !== UserRole.SUPER_ADMIN) {
      return res.status(403).json({ success: false, message: 'Admin access required' });
    }

    const { juniorUserId, newAuthorityUserId, connectionType, notes } = req.body;

    // Deactivate existing connection
    await prisma.authorityConnection.updateMany({
      where: {
        userId: juniorUserId,
        connectionType,
        status: { in: [ConnectionStatus.ACTIVE, ConnectionStatus.NEEDS_REASSIGNMENT] }
      },
      data: { status: ConnectionStatus.INACTIVE, endDate: new Date() }
    });

    // Create new active connection directly
    const newConnection = await prisma.authorityConnection.create({
      data: {
        userId: juniorUserId,
        authorityUserId: newAuthorityUserId,
        connectionType,
        status: ConnectionStatus.ACTIVE,
        startDate: new Date()
      }
    });

    await syncEmployeeAuthority(juniorUserId, connectionType, newAuthorityUserId);

    // Record in history
    const juniorEmployee = await prisma.employee.findUnique({ where: { userId: juniorUserId } });
    if (juniorEmployee) {
      await prisma.employeeStatusHistory.create({
        data: {
          employeeId: juniorEmployee.id,
          changeType: 'AUTHORITY_CHANGE',
          newValue: JSON.stringify({ type: connectionType, authorityUserId: newAuthorityUserId }),
          changedBy: req.user!.userId,
          notes: notes || 'Admin forced reassignment'
        }
      });
    }

    // Notify the junior
    await prisma.notification.create({
      data: {
        userId: juniorUserId,
        title: 'Authority Reassigned',
        message: `Your ${connectionType.replace('_', ' ')} has been reassigned by the system administrator.`,
        type: 'INFO',
        priority: 'HIGH',
        metadata: JSON.stringify({ connectionId: newConnection.id, connectionType })
      }
    });

    await logAudit({
      userId: req.user!.userId,
      action: 'AUTHORITY_ADMIN_REASSIGN',
      entity: 'AuthorityConnection',
      entityId: newConnection.id,
      newValues: { juniorUserId, newAuthorityUserId, connectionType },
      req
    });

    return res.status(201).json({ success: true, data: newConnection });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: 'Failed to reassign authority' });
  }
});

export default router;
