import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { validateBody } from '../../middleware/validate';
import { UserRole } from '@smart-gate/types';

const router = Router();

const verifyPassSchema = z.object({
  identifier: z.string().min(1).optional(), // Can be PassNumber, EmployeeCode, or QR JSON string
  query: z.string().min(1).optional(),       // alias for identifier
}).refine(d => d.identifier || d.query, { message: 'identifier or query required' });

// GET /api/gate-passes/today (Security / HR / Admin)
router.get('/today', authenticate, requireRoles(UserRole.SECURITY_GUARD, UserRole.HR, UserRole.SUPER_ADMIN, UserRole.MANAGER), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const passes = await prisma.gatePass.findMany({
      where: {
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      include: {
        employee: {
          include: {
            department: true
          }
        },
        exitRequest: true,
        gateLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: passes });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch today gate passes' });
  }
});

// GET /api/gate-passes/my-active (Employee)
router.get('/my-active', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'No employee record linked.' });
    }

    const activePass = await prisma.gatePass.findFirst({
      where: {
        employeeId,
        status: { in: ['ACTIVE', 'USED'] }
      },
      include: {
        exitRequest: {
          include: {
            approvals: {
              include: { approver: { include: { employee: true } } }
            }
          }
        },
        employee: {
          include: { department: true }
        },
        gateLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, data: activePass });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch active gate pass' });
  }
});

// GET /api/gate-passes/my-passes (Employee — all their passes)
router.get('/my-passes', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const employeeId = req.user!.employeeId;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'No employee record linked.' });
    }
    const passes = await prisma.gatePass.findMany({
      where: { employeeId },
      include: {
        exitRequest: { include: { approvals: { include: { approver: { include: { employee: true } } } } } },
        employee: { include: { department: true } },
        gateLogs: { orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: passes });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch gate passes' });
  }
});

router.get('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const pass = await prisma.gatePass.findUnique({
      where: { id },
      include: {
        employee: { include: { department: true } },
        exitRequest: true,
        gateLogs: true
      }
    });

    if (!pass) {
      return res.status(404).json({ success: false, message: 'Gate pass not found' });
    }

    return res.json({ success: true, data: pass });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch gate pass' });
  }
});

// POST /api/gate-passes/verify (Security guard verify via QR or Search)
router.post('/verify', authenticate, requireRoles(UserRole.SECURITY_GUARD, UserRole.HR, UserRole.SUPER_ADMIN), validateBody(verifyPassSchema), async (req: AuthenticatedRequest, res: Response) => {
  try {
    let identifier = (req.body.identifier || req.body.query || '').trim();

    // Check if identifier is JSON payload from QR code
    let passNumberToFind = identifier;
    let employeeCodeToFind = identifier;

    if (identifier.startsWith('{') && identifier.endsWith('}')) {
      try {
        const parsed = JSON.parse(identifier);
        if (parsed.passNumber) passNumberToFind = parsed.passNumber;
        if (parsed.employeeCode) employeeCodeToFind = parsed.employeeCode;
      } catch (e) {
        // Not JSON, continue with raw string
      }
    }

    const gatePass = await prisma.gatePass.findFirst({
      where: {
        OR: [
          { passNumber: passNumberToFind },
          { id: identifier },
          { employee: { employeeCode: employeeCodeToFind } }
        ]
      },
      include: {
        employee: {
          include: {
            department: true
          }
        },
        exitRequest: {
          include: {
            approvals: {
              include: { approver: { include: { employee: true } } }
            }
          }
        },
        gateLogs: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!gatePass) {
      return res.status(404).json({
        success: false,
        verified: false,
        message: `No Gate Pass found matching "${identifier}". Please check Pass Number or Employee ID.`
      });
    }

    const gatePassData = gatePass as any;
    const isExpired = new Date() > new Date(gatePassData.validUntil);
    const isValid = gatePassData.status === 'ACTIVE' && !isExpired;

    return res.json({
      success: true,
      verified: true,
      isValid,
      data: {
        id: gatePassData.id,
        passNumber: gatePassData.passNumber,
        status: gatePassData.status,
        isExpired,
        validFrom: gatePassData.validFrom,
        validUntil: gatePassData.validUntil,
        employee: {
          id: gatePassData.employee.id,
          firstName: gatePassData.employee.firstName,
          lastName: gatePassData.employee.lastName,
          employeeCode: gatePassData.employee.employeeCode,
          department: gatePassData.employee.department,
          designation: gatePassData.employee.designation,
          phone: gatePassData.employee.phone,
          avatarUrl: gatePassData.employee.avatarUrl
        },
        exitRequest: {
          exitDate: gatePassData.exitRequest.exitDate,
          exitTime: gatePassData.exitRequest.exitTime,
          expectedReturnTime: gatePassData.exitRequest.expectedReturnTime,
          destination: gatePassData.exitRequest.destination,
          reason: gatePassData.exitRequest.reason,
          description: gatePassData.exitRequest.description,
          requiresHrApproval: gatePassData.exitRequest.requiresHrApproval
        },
        gateLogs: gatePassData.gateLogs
      }
    });
  } catch (err: any) {
    console.error('Verify pass error:', err);
    return res.status(500).json({ success: false, message: 'Gate pass verification failed.' });
  }
});

export default router;
