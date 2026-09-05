import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { authenticate, AuthenticatedRequest } from '../../middleware/auth';
import { requireRoles } from '../../middleware/rbac';
import { sendEmailNotification } from '../../lib/email';

const router = Router();

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

    const submission = await prisma.contactSubmission.create({
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone?.trim() || null,
        subject: subject.trim(),
        message: message.trim(),
      }
    });

    // Notify Sunil Punekar via email (mocked — replace with real SMTP when available)
    await sendEmailNotification({
      to: 'sunilpunekar@trendtechnologies.com.sg',
      subject: `[SmartGate OS] New Contact: ${subject.trim()}`,
      html: `
        <h2>New Contact Form Submission</h2>
        <table style="border-collapse:collapse;width:100%">
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Name</td><td style="padding:8px;border:1px solid #ddd">${name}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Email</td><td style="padding:8px;border:1px solid #ddd">${email}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Phone</td><td style="padding:8px;border:1px solid #ddd">${phone || 'Not provided'}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Subject</td><td style="padding:8px;border:1px solid #ddd">${subject}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Message</td><td style="padding:8px;border:1px solid #ddd">${message}</td></tr>
          <tr><td style="padding:8px;border:1px solid #ddd;font-weight:600">Submitted At</td><td style="padding:8px;border:1px solid #ddd">${new Date().toLocaleString()}</td></tr>
        </table>
        <p style="margin-top:16px;color:#666">This message was submitted via the SmartGate OS contact form.</p>
      `,
      text: `New contact from ${name} <${email}>\nPhone: ${phone || 'N/A'}\nSubject: ${subject}\n\n${message}`
    });

    // Also notify via backend console (for admin awareness)
    await sendEmailNotification({
      to: 'punekarsunil1995@gmail.com',
      subject: `[SmartGate OS] New Contact: ${subject.trim()}`,
      html: `<p>From: ${name} &lt;${email}&gt;</p><p>${message}</p>`,
      text: `From: ${name} <${email}>\n${message}`
    });

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
router.get('/', authenticate, requireRoles(['SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
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

    res.json({
      success: true,
      data: {
        submissions,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── PATCH /api/contacts/:id/read  ── Mark as read ───────────────────────────
router.patch('/:id/read', authenticate, requireRoles(['SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
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
router.delete('/:id', authenticate, requireRoles(['SUPER_ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    await prisma.contactSubmission.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Submission deleted.' });
  } catch {
    res.status(404).json({ success: false, message: 'Contact submission not found.' });
  }
});

export default router;
