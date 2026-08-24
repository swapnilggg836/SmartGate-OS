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

const app = express();

app.use(cors({
  origin: config.corsOrigin,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Smart Leave, Exit Permission & Gate Pass Management System',
    timestamp: new Date().toISOString()
  });
});

// API Routes
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

// Global Error Handler
app.use(errorHandler);

export default app;
