import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { seedDatabase } from '../../services/seed.service';

const router = Router();

// GET /api/setup/status - Inspect DB connection and data stats
router.get('/status', async (req: Request, res: Response) => {
  try {
    const [userCount, deptCount, leaveTypeCount, passCount] = await Promise.all([
      prisma.user.count(),
      prisma.department.count(),
      prisma.leaveType.count(),
      prisma.gatePass.count()
    ]);

    return res.json({
      success: true,
      database: 'connected',
      isSeeded: userCount > 0,
      stats: {
        users: userCount,
        departments: deptCount,
        leaveTypes: leaveTypeCount,
        gatePasses: passCount
      },
      message: userCount > 0
        ? 'Database is connected and populated with data.'
        : 'Database is connected but EMPTY. Call POST /api/setup/seed to seed demo accounts.'
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      database: 'error',
      message: 'Database connection failed: ' + (err.message || 'Unknown error'),
      tip: 'Verify DATABASE_URL in Render environment settings with ssl-mode=REQUIRED.'
    });
  }
});

// POST /api/setup/seed - One-click seed endpoint to populate initial accounts
router.post('/seed', async (req: Request, res: Response) => {
  try {
    const userCount = await prisma.user.count();
    const force = req.query.force === 'true' || req.body?.force === true;

    if (userCount > 0 && !force) {
      return res.json({
        success: true,
        message: 'Database already has existing data (' + userCount + ' users). Add ?force=true to clean & re-seed.',
        accounts: [
          { role: 'SUPER_ADMIN', email: 'admin@enterprise.com', password: 'Password123!' },
          { role: 'HR', email: 'hr@enterprise.com', password: 'Password123!' },
          { role: 'MANAGER', email: 'manager@enterprise.com', password: 'Password123!' },
          { role: 'EMPLOYEE', email: 'employee@enterprise.com', password: 'Password123!' },
          { role: 'EMPLOYEE', email: 'priya@enterprise.com', password: 'Password123!' },
          { role: 'SECURITY_GUARD', email: 'security@enterprise.com', password: 'Password123!' }
        ]
      });
    }

    const result = await seedDatabase(prisma, force || userCount === 0);

    return res.json({
      success: true,
      message: 'Database seeded successfully!',
      details: result,
      accounts: [
        { role: 'SUPER_ADMIN', email: 'admin@enterprise.com', password: 'Password123!' },
        { role: 'HR', email: 'hr@enterprise.com', password: 'Password123!' },
        { role: 'MANAGER', email: 'manager@enterprise.com', password: 'Password123!' },
        { role: 'EMPLOYEE', email: 'employee@enterprise.com', password: 'Password123!' },
        { role: 'EMPLOYEE', email: 'priya@enterprise.com', password: 'Password123!' },
        { role: 'SECURITY_GUARD', email: 'security@enterprise.com', password: 'Password123!' }
      ]
    });
  } catch (err: any) {
    console.error('Seed endpoint error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to seed database: ' + (err.message || 'Unknown error')
    });
  }
});

export default router;
