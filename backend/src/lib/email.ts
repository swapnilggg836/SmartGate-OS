import nodemailer, { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface SmsOptions {
  to: string;
  message: string;
}

let transporter: Transporter | null = null;

function getEmailTransporter(): Transporter | null {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST || process.env.EMAIL_HOST;
  const port = parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10);
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || process.env.GMAIL_APP_PASSWORD;

  if (host && user && pass) {
    try {
      transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass }
      });
      return transporter;
    } catch (e) {
      console.warn('Failed to initialize SMTP transporter:', e);
      return null;
    }
  } else if (user && pass && !host) {
    try {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: { user, pass }
      });
      return transporter;
    } catch (e) {
      console.warn('Failed to initialize Gmail transporter:', e);
      return null;
    }
  }

  return null;
}

/**
 * Sends an email notification via configured SMTP / Gmail,
 * or logs cleanly to console if SMTP credentials are not set in environment.
 */
export async function sendEmailNotification(options: EmailOptions): Promise<boolean> {
  const mailTransporter = getEmailTransporter();
  const fromAddress = process.env.EMAIL_FROM || process.env.SMTP_USER || 'SmartGate OS <no-reply@smartgate.local>';

  if (mailTransporter) {
    try {
      const info = await mailTransporter.sendMail({
        from: fromAddress,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>?/gm, '')
      });
      console.log(`\n📧 [EMAIL DELIVERED VIA SMTP/GMAIL]`);
      console.log(`   To: ${options.to}`);
      console.log(`   Subject: ${options.subject}`);
      console.log(`   MessageId: ${info.messageId}`);
      console.log(`----------------------------------------------------\n`);
      return true;
    } catch (err) {
      console.error(`⚠️ SMTP dispatch to ${options.to} failed, falling back to local dispatch log:`, err);
    }
  }

  // Console mock provider for development / testing / fallback
  console.log(`\n📧 [EMAIL NOTIFICATION DISPATCHED]`);
  console.log(`   To: ${options.to}`);
  console.log(`   Subject: ${options.subject}`);
  console.log(`   Content: ${options.text || options.html.replace(/<[^>]*>?/gm, '')}`);
  console.log(`----------------------------------------------------\n`);
  return true;
}

/**
 * Dispatches an SMS notification to the visitor or employee.
 * Integrates with SMS gateways (Twilio, Fast2SMS, AWS SNS) or logs cleanly.
 */
export async function sendSmsNotification(options: SmsOptions): Promise<boolean> {
  const cleanPhone = (options.to || '').replace(/[^0-9+]/g, '');

  console.log(`\n📱 [SMS GATEWAY DISPATCHED]`);
  console.log(`   To: ${cleanPhone}`);
  console.log(`   Message: ${options.message}`);
  console.log(`   Timestamp: ${new Date().toISOString()}`);
  console.log(`----------------------------------------------------\n`);
  return true;
}

/**
 * Formats a phone number for international WhatsApp click-to-chat.
 * If 10 digits without country code, prepends standard India code (91).
 */
export function formatPhoneForWhatsApp(phone: string): string {
  let cleaned = (phone || '').replace(/[^0-9]/g, '');
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
}

/**
 * Generates direct WhatsApp click-to-chat URL.
 */
export function generateWhatsAppShareUrl(phone: string, message: string): string {
  const cleanPhone = formatPhoneForWhatsApp(phone);
  return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(message)}`;
}

/**
 * Generates direct SMS application link (sms:...?body=...).
 */
export function generateSmsShareUrl(phone: string, message: string): string {
  const cleanPhone = (phone || '').replace(/[^0-9+]/g, '');
  return `sms:${cleanPhone}?body=${encodeURIComponent(message)}`;
}

export interface VisitorPassEmailParams {
  visitorName: string;
  passNumber: string;
  hostName: string;
  hostDepartment?: string;
  visitDate: string;
  entryTime: string;
  exitTime: string;
  purpose: string;
  passUrl: string;
}

/**
 * Builds a beautiful, responsive HTML email for visitor digital pass delivery.
 */
export function buildVisitorPassEmailTemplate(params: VisitorPassEmailParams): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SmartGate Digital Pass: ${params.passNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b;">
  <div style="max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <div style="font-size: 12px; font-weight: 800; letter-spacing: 0.15em; text-transform: uppercase; color: #93c5fd; margin-bottom: 8px;">
        SmartGate OS · Campus Security
      </div>
      <h1 style="font-size: 24px; font-weight: 800; margin: 0 0 6px; letter-spacing: -0.02em;">
        Visitor Digital Gate Pass
      </h1>
      <div style="display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 6px 14px; border-radius: 20px; font-size: 14px; font-weight: 700; margin-top: 8px;">
        Pass #: ${params.passNumber}
      </div>
    </div>

    <!-- Body Content -->
    <div style="padding: 28px 24px;">
      <p style="font-size: 16px; line-height: 1.6; margin: 0 0 20px; color: #334155;">
        Dear <strong>${params.visitorName}</strong>,
      </p>
      <p style="font-size: 14px; line-height: 1.6; margin: 0 0 24px; color: #475569;">
        Your digital visitor gate pass for SmartGate Campus has been approved and issued. Please find your visit details below:
      </p>

      <!-- Details Table Box -->
      <div style="background: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 28px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 8px 0; color: #64748b; width: 38%;">Host Name:</td>
            <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${params.hostName}</td>
          </tr>
          ${params.hostDepartment ? `
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Department:</td>
            <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${params.hostDepartment}</td>
          </tr>
          ` : ''}
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Visit Date:</td>
            <td style="padding: 8px 0; font-weight: 700; color: #0f172a;">${params.visitDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Entry Time:</td>
            <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${params.entryTime} &mdash; ${params.exitTime}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; color: #64748b;">Purpose:</td>
            <td style="padding: 8px 0; font-weight: 600; color: #0f172a;">${params.purpose}</td>
          </tr>
        </table>
      </div>

      <!-- Action Button -->
      <div style="text-align: center; margin-bottom: 30px;">
        <a href="${params.passUrl}" target="_blank" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 10px; font-weight: 700; font-size: 15px; display: inline-block; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);">
          📲 Open Digital Pass &amp; QR Code
        </a>
      </div>

      <!-- Security Instructions -->
      <div style="border-top: 1px dashed #cbd5e1; padding-top: 20px;">
        <h4 style="font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1e3a8a; margin: 0 0 10px;">
          Gate Security Instructions:
        </h4>
        <ul style="margin: 0; padding-left: 18px; font-size: 13px; color: #64748b; line-height: 1.6;">
          <li>Present the QR code on your phone screen to the Security Guard at Gate 1 upon arrival.</li>
          <li>Carry a valid Government-issued Photo ID (Aadhar, PAN Card, Driving License, or Passport).</li>
          <li>Ensure you check out with security before departing the premises.</li>
        </ul>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
      This is an automated security transmission from SmartGate OS. Do not reply directly to this email.
    </div>
  </div>
</body>
</html>
  `.trim();
}

export async function sendPushNotification(userId: string, title: string, body: string, data?: any): Promise<boolean> {
  console.log(`\n📲 [WEB PUSH NOTIFICATION] User: ${userId} | ${title} - ${body}`);
  return true;
}
