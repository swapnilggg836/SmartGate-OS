import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { sendEmailNotification } from '../../lib/email';
import { emitToUser } from '../../lib/socket';

const router = Router();

// Helper: Auto-create ContactSubmission table in MySQL if it does not exist
async function ensureContactTable() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS \`ContactSubmission\` (
        \`id\` VARCHAR(191) NOT NULL PRIMARY KEY,
        \`name\` VARCHAR(191) NOT NULL,
        \`email\` VARCHAR(191) NOT NULL,
        \`phone\` VARCHAR(50) NULL,
        \`subject\` VARCHAR(255) NOT NULL,
        \`message\` TEXT NOT NULL,
        \`isRead\` BOOLEAN NOT NULL DEFAULT FALSE,
        \`repliedAt\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        INDEX \`ContactSubmission_isRead_idx\` (\`isRead\`),
        INDEX \`ContactSubmission_createdAt_idx\` (\`createdAt\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `);
  } catch (e: any) {
    console.warn('ensureContactTable warning:', e?.message || e);
  }
}

// ── POST /api/contacts  ── Public: submit contact form ──────────────────────
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, phone, subject, message } = req.body;

    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return res.status(400).json({ success: false, message: 'Name, email, subject and message are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedSubject = subject.trim();
    const trimmedName = name.trim();
    const trimmedPhone = phone?.trim() || null;
    const trimmedMessage = message.trim();

    // Auto-create table if not exists
    await ensureContactTable();

    // 1. Save submission to database
    const submission = await prisma.contactSubmission.create({
      data: {
        name: trimmedName,
        email: trimmedEmail,
        phone: trimmedPhone,
        subject: trimmedSubject,
        message: trimmedMessage,
      }
    });

    // 2. Find all Super Admins to send in-app notifications
    const superAdmins = await prisma.user.findMany({
      where: { role: 'SUPER_ADMIN' },
      select: { id: true, email: true }
    });

    // 3. Create in-app notification for each Super Admin
    for (const admin of superAdmins) {
      try {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: `📬 New Contact: ${trimmedSubject.slice(0, 40)}`,
            message: `From: ${trimmedName} (${trimmedEmail}${trimmedPhone ? `, Tel: ${trimmedPhone}` : ''})\nMessage: ${trimmedMessage.slice(0, 150)}...`,
            type: 'INFO',
            priority: 'HIGH',
            metadata: JSON.stringify({
              contactId: submission.id,
              name: trimmedName,
              email: trimmedEmail,
              phone: trimmedPhone,
              subject: trimmedSubject,
              link: '/admin/contacts'
            })
          }
        });

        // Real-time socket alert
        emitToUser(admin.id, 'notification', {
          title: `📬 New Contact Inquiry: ${trimmedSubject}`,
          message: `From ${trimmedName} (${trimmedEmail})`
        });
      } catch (notifErr) {
        console.warn('Failed to notify super admin:', admin.id, notifErr);
      }
    }

    // 4. Send emails (wrapped in try/catch so email transport failure never breaks submission)
    try {
      const emailHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; borderRadius: 8px;">
          <div style="background: #1e3a8a; color: white; padding: 16px; borderRadius: 6px 6px 0 0; margin: -20px -20px 20px -20px;">
            <h2 style="margin: 0; font-size: 1.25rem;">📬 New SmartGate OS Contact Submission</h2>
          </div>
          <table style="border-collapse: collapse; width: 100%; margin-bottom: 20px;">
            <tr><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc; width: 30%;">Sender Name</td><td style="padding: 10px; border: 1px solid #e2e8f0;">${trimmedName}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Email</td><td style="padding: 10px; border: 1px solid #e2e8f0;"><a href="mailto:${trimmedEmail}">${trimmedEmail}</a></td></tr>
            <tr><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Phone</td><td style="padding: 10px; border: 1px solid #e2e8f0;">${trimmedPhone || 'Not provided'}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Subject</td><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; color: #1e3a8a;">${trimmedSubject}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Message</td><td style="padding: 10px; border: 1px solid #e2e8f0; white-space: pre-wrap;">${trimmedMessage}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #e2e8f0; font-weight: bold; background: #f8fafc;">Submitted At</td><td style="padding: 10px; border: 1px solid #e2e8f0;">${new Date().toLocaleString()}</td></tr>
          </table>
          <p style="color: #64748b; font-size: 0.85rem; border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px;">
            Submitted via SmartGate OS Contact Form · Trend Technologies
          </p>
        </div>
      `;

      // Email Sunil Punekar (official & fallback)
      await sendEmailNotification({
        to: 'sunilpunekar@trendtechnologies.com.sg',
        subject: `[SmartGate OS] New Contact: ${trimmedSubject}`,
        html: emailHtml,
        text: `New contact from ${trimmedName} <${trimmedEmail}>\nPhone: ${trimmedPhone || 'N/A'}\nSubject: ${trimmedSubject}\n\n${trimmedMessage}`
      });

      await sendEmailNotification({
        to: 'punekarsunil1995@gmail.com',
        subject: `[SmartGate OS] New Contact: ${trimmedSubject}`,
        html: emailHtml,
        text: `New contact from ${trimmedName} <${trimmedEmail}>\nPhone: ${trimmedPhone || 'N/A'}\nSubject: ${trimmedSubject}\n\n${trimmedMessage}`
      });

      // Email all Super Admins
      for (const admin of superAdmins) {
        if (admin.email && admin.email !== 'punekarsunil1995@gmail.com' && admin.email !== 'sunilpunekar@trendtechnologies.com.sg') {
          await sendEmailNotification({
            to: admin.email,
            subject: `[SmartGate OS Admin] Contact Form: ${trimmedSubject}`,
            html: emailHtml,
            text: `Contact from ${trimmedName} <${trimmedEmail}>\nSubject: ${trimmedSubject}\n\n${trimmedMessage}`
          });
        }
      }
    } catch (emailErr) {
      console.error('Email dispatch error (non-fatal):', emailErr);
    }

    res.status(201).json({
      success: true,
      message: 'Your message has been sent successfully. We will get back to you soon.',
      data: { id: submission.id }
    });
  } catch (err: any) {
    console.error('Contact form error:', err);
    res.status(500).json({ success: false, message: 'Failed to submit contact form. Please try again.' });
  }
});

// ── GET /api/contacts  ── Super Admin: list all submissions ─────────────────
router.get('/', authenticate, requireRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await ensureContactTable();
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const unreadOnly = req.query.unread === 'true';

    const where = unreadOnly ? { isRead: false } : {};

    const [submissions, total] = await Promise.all([
      prisma.contactSubmission.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.contactSubmission.count({ where })
    ]);

    // Check if any submission email belongs to a registered user
    const uniqueEmails = [...new Set(submissions.map(s => s.email.toLowerCase()))];
    const registeredUsers = await prisma.user.findMany({
      where: { email: { in: uniqueEmails } },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        employee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            employeeCode: true,
            designation: true,
            department: {
              select: { name: true }
            }
          }
        }
      }
    });

    const userMap = new Map(registeredUsers.map(u => [
      u.email.toLowerCase(),
      {
        ...u,
        employee: u.employee ? {
          ...u.employee,
          department: u.employee.department?.name || ''
        } : null
      }
    ]));

    const enrichedSubmissions = submissions.map(sub => ({
      ...sub,
      matchedUser: userMap.get(sub.email.toLowerCase()) || null
    }));

    res.json({
      success: true,
      data: {
        submissions: enrichedSubmissions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/contacts/:id/read  ── Mark as read ───────────────────────────
router.patch('/:id/read', authenticate, requireRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const submission = await prisma.contactSubmission.update({
      where: { id: req.params.id },
      data: { isRead: true }
    });
    res.json({ success: true, data: submission });
  } catch {
    res.status(404).json({ success: false, message: 'Contact submission not found.' });
  }
});

// ── DELETE /api/contacts/:id  ── Super Admin: delete submission ─────────────
router.delete('/:id', authenticate, requireRoles('SUPER_ADMIN'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.contactSubmission.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Submission deleted.' });
  } catch {
    res.status(404).json({ success: false, message: 'Contact submission not found.' });
  }
});

export default router;

