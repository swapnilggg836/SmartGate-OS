import { Request } from 'express';
import { prisma } from './prisma';

export interface CreateAuditLogParams {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  entity: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  req?: Request;
}

export async function logAudit(params: CreateAuditLogParams) {
  try {
    const ipAddress = params.req?.ip || params.req?.socket?.remoteAddress || '127.0.0.1';
    const userAgent = params.req?.headers['user-agent'] || 'system';

    await prisma.auditLog.create({
      data: {
        userId: params.userId || (params.req as any)?.user?.userId || null,
        userEmail: params.userEmail || (params.req as any)?.user?.email || null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        oldValues: params.oldValues ? JSON.stringify(params.oldValues) : null,
        newValues: params.newValues ? JSON.stringify(params.newValues) : null,
        ipAddress: String(ipAddress),
        userAgent: String(userAgent)
      }
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
