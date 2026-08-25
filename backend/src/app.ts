import express from 'express';
import cors from 'cors';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './modules/auth/auth.routes';
import userRoutes from './modules/users/user.routes';
import departmentRoutes from './modules/departments/department.routes';
import leaveRoutes from './modules/leave/leave.routes';
import exitRoutes from './modules/exit-requests/exit.routes';
import gatePassRoutes from './modules/gate-passes/gate-pass.routes';
import securityRoutes from './modules/security/security.routes';
import attendanceRoutes from './modules/attendance/attendance.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import auditRoutes from './modules/audit/audit.routes';

import setupRoutes from './modules/setup/setup.routes';
import authorityRoutes from './modules/authority/authority.routes';
import { prisma } from './lib/prisma';

const app = express();

app.use(cors({
  origin: (origin, callback) => {
    // Allow any origin (including Vercel, localhost, Render)
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.options('*', cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health & Diagnostic Check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'disconnected';
  let stats: any = null;
  let error: string | null = null;

  try {
    const [userCount, deptCount] = await Promise.all([
      prisma.user.count(),
      prisma.department.count()
    ]);
    dbStatus = 'connected';
    stats = {
      users: userCount,
      departments: deptCount
    };
  } catch (err: any) {
    dbStatus = 'error';
    error = err.message || 'Database error';
  }

  res.json({
    status: 'online',
    database: dbStatus,
    stats,
    error,
    system: 'Smart Leave, Exit Permission & Gate Pass Management System',
    timestamp: new Date().toISOString()
  });
});

// API Routes
app.use('/api/setup', setupRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/leave', leaveRoutes);
app.use('/api/exit-requests', exitRoutes);
app.use('/api/gate-passes', gatePassRoutes);
app.use('/api/gate-logs', securityRoutes);
app.use('/api/security', securityRoutes); // Alias for frontend /security/* calls
app.use('/api/attendance', attendanceRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/authority', authorityRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;

