import axios from 'axios';
import { prisma } from './prisma';

export interface WhatsAppMessageOptions {
  to: string; // Phone number (e.g. +91 98221 44556, 9822144556)
  message: string;
  recipientName?: string;
  templateName?: string;
  templateVariables?: string[];
  actionUrl?: string;
}

export interface WhatsAppSendResult {
  success: boolean;
  provider: 'META_CLOUD_API' | 'TWILIO' | 'ULTRAMSG' | 'SIMULATOR';
  messageId?: string;
  recipientPhone: string;
  error?: string;
}

/**
 * Normalizes phone numbers to standard E.164 international format.
 * Defaults to India (+91) if 10 digits without country code.
 */
export function normalizePhoneNumber(rawPhone: string, defaultCountry = '+91'): string {
  if (!rawPhone) return '';
  let digits = rawPhone.replace(/[^0-9]/g, '');

  if (digits.length === 10) {
    return `${defaultCountry}${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `${defaultCountry}${digits.slice(1)}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (rawPhone.startsWith('+')) {
    return `+${digits}`;
  }
  return `+${digits}`;
}

/**
 * Dispatches an automated WhatsApp message via configured provider:
 * 1. Meta WhatsApp Cloud API (Production Official)
 * 2. Twilio WhatsApp API (Alternative / Global)
 * 3. UltraMsg API (Instant Webhook)
 * 4. SmartGate Simulator (Local development fallback with live formatting)
 */
export async function sendWhatsAppNotification(options: WhatsAppMessageOptions): Promise<WhatsAppSendResult> {
  const normalizedPhone = normalizePhoneNumber(options.to);
  const cleanDigits = normalizedPhone.replace(/[^0-9]/g, '');

  if (!normalizedPhone || normalizedPhone.length < 8) {
    console.warn(`[WHATSAPP] Skipped dispatch: Invalid phone number "${options.to}"`);
    return {
      success: false,
      provider: 'SIMULATOR',
      recipientPhone: options.to,
      error: 'Invalid phone number'
    };
  }

  // -------------------------------------------------------------
  // Provider 1: Meta WhatsApp Cloud API (Official Graph API)
  // -------------------------------------------------------------
  const metaToken = process.env.WHATSAPP_TOKEN || process.env.META_WA_TOKEN;
  const metaPhoneId = process.env.WHATSAPP_PHONE_ID || process.env.META_WA_PHONE_ID;

  if (metaToken && metaPhoneId) {
    try {
      const url = `https://graph.facebook.com/v19.0/${metaPhoneId}/messages`;
      let payload: any = {
        messaging_product: 'whatsapp',
        to: cleanDigits,
        type: 'text',
        text: { body: options.message }
      };

      if (options.templateName) {
        payload = {
          messaging_product: 'whatsapp',
          to: cleanDigits,
          type: 'template',
          template: {
            name: options.templateName,
            language: { code: 'en' },
            components: options.templateVariables ? [
              {
                type: 'body',
                parameters: options.templateVariables.map(val => ({ type: 'text', text: val }))
              }
            ] : []
          }
        };
      }

      const res = await axios.post(url, payload, {
        headers: {
          Authorization: `Bearer ${metaToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const messageId = res.data?.messages?.[0]?.id;
      console.log(`\n✅ [WHATSAPP DELIVERED VIA META CLOUD API] -> To: ${normalizedPhone} (ID: ${messageId})\n`);

      return {
        success: true,
        provider: 'META_CLOUD_API',
        messageId,
        recipientPhone: normalizedPhone
      };
    } catch (err: any) {
      console.error(`⚠️ Meta WhatsApp Cloud API dispatch to ${normalizedPhone} failed:`, err.response?.data || err.message);
    }
  }

  // -------------------------------------------------------------
  // Provider 2: Twilio WhatsApp API
  // -------------------------------------------------------------
  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioAuth = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886'; // Twilio Sandbox default

  if (twilioSid && twilioAuth) {
    try {
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioAuth}`).toString('base64');
      const params = new URLSearchParams();
      params.append('From', twilioFrom.startsWith('whatsapp:') ? twilioFrom : `whatsapp:${twilioFrom}`);
      params.append('To', `whatsapp:${normalizedPhone}`);
      params.append('Body', options.message);

      const res = await axios.post(
        `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
        params.toString(),
        {
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          timeout: 10000
        }
      );

      const messageId = res.data?.sid;
      console.log(`\n✅ [WHATSAPP DELIVERED VIA TWILIO] -> To: ${normalizedPhone} (SID: ${messageId})\n`);

      return {
        success: true,
        provider: 'TWILIO',
        messageId,
        recipientPhone: normalizedPhone
      };
    } catch (err: any) {
      console.error(`⚠️ Twilio WhatsApp API dispatch to ${normalizedPhone} failed:`, err.response?.data || err.message);
    }
  }

  // -------------------------------------------------------------
  // Provider 3: UltraMsg API
  // -------------------------------------------------------------
  const ultraInstance = process.env.ULTRAMSG_INSTANCE_ID;
  const ultraToken = process.env.ULTRAMSG_TOKEN;

  if (ultraInstance && ultraToken) {
    try {
      const res = await axios.post(
        `https://api.ultramsg.com/${ultraInstance}/messages/chat`,
        {
          token: ultraToken,
          to: cleanDigits,
          body: options.message
        },
        { timeout: 10000 }
      );

      console.log(`\n✅ [WHATSAPP DELIVERED VIA ULTRAMSG] -> To: ${normalizedPhone}\n`);
      return {
        success: true,
        provider: 'ULTRAMSG',
        messageId: String(res.data?.id || ''),
        recipientPhone: normalizedPhone
      };
    } catch (err: any) {
      console.error(`⚠️ UltraMsg dispatch to ${normalizedPhone} failed:`, err.response?.data || err.message);
    }
  }

  // -------------------------------------------------------------
  // Provider 4: SmartGate Simulator (Console Mock Mode)
  // -------------------------------------------------------------
  const border = '═'.repeat(66);
  const divider = '─'.repeat(66);

  console.log(`\n╔${border}╗`);
  console.log(`║ 💬 [WHATSAPP OUTBOUND NOTIFICATION — SMARTGATE SIMULATOR]        ║`);
  console.log(`║ Recipient: ${normalizedPhone.padEnd(20)} Name: ${(options.recipientName || 'User').padEnd(26)} ║`);
  console.log(`║ Status: LIVE SIMULATION (Add WHATSAPP_TOKEN to .env for Meta API)║`);
  console.log(`╟${divider}╢`);
  const lines = options.message.split('\n');
  for (const line of lines) {
    console.log(`║ ${line.slice(0, 64).padEnd(64)} ║`);
  }
  if (options.actionUrl) {
    console.log(`╟${divider}╢`);
    console.log(`║ 👉 Direct Link: ${options.actionUrl.slice(0, 48).padEnd(48)} ║`);
  }
  console.log(`╚${border}╝\n`);

  return {
    success: true,
    provider: 'SIMULATOR',
    messageId: `SIM-${Date.now()}`,
    recipientPhone: normalizedPhone
  };
}

// =============================================================
// Specialized Workflow Helper Functions
// =============================================================

/**
 * 1. Sends Exit Permission Request to Reporting Manager on WhatsApp
 */
export async function notifyManagerExitRequest(params: {
  managerPhone: string;
  managerName: string;
  employeeName: string;
  employeeCode: string;
  departureTime: string;
  returnTime: string;
  reason: string;
  passUrl: string;
}) {
  const message =
    `🚪 *SmartGate OS: Exit Permission Request*\n` +
    `Dear *${params.managerName}*,\n` +
    `Your team member *${params.employeeName}* (*${params.employeeCode}*) has requested an exit pass.\n\n` +
    `📋 *Details:*\n` +
    `• Reason: ${params.reason}\n` +
    `• Departure: ${params.departureTime}\n` +
    `• Expected Return: ${params.returnTime}\n\n` +
    `📱 *Open Approval Console:*\n${params.passUrl}`;

  return sendWhatsAppNotification({
    to: params.managerPhone,
    recipientName: params.managerName,
    message,
    actionUrl: params.passUrl
  });
}

/**
 * 2. Sends Exit Clearance Request to HR Authority on WhatsApp
 */
export async function notifyHRExitClearance(params: {
  hrPhone: string;
  hrName: string;
  managerName: string;
  employeeName: string;
  employeeCode: string;
  departureTime: string;
  returnTime: string;
  passUrl: string;
}) {
  const message =
    `📋 *SmartGate OS: Exit Pass Pending HR Clearance*\n` +
    `Dear *${params.hrName}*,\n` +
    `Manager *${params.managerName}* has APPROVED an exit request for *${params.employeeName}* (*${params.employeeCode}*).\n\n` +
    `Departure: ${params.departureTime} | Expected Return: ${params.returnTime}\n\n` +
    `📱 *Open HR Console to Grant Clearance:*\n${params.passUrl}`;

  return sendWhatsAppNotification({
    to: params.hrPhone,
    recipientName: params.hrName,
    message,
    actionUrl: params.passUrl
  });
}

/**
 * 3. Sends Approved Gate Pass to Employee on WhatsApp
 */
export async function notifyEmployeeGatePassIssued(params: {
  employeePhone: string;
  employeeName: string;
  passNumber: string;
  validWindow: string;
  passUrl: string;
}) {
  const message =
    `✅ *SmartGate OS: Gate Pass Issued!*\n` +
    `Hello *${params.employeeName}*,\n` +
    `Your exit pass has been authorized by your Manager & HR.\n\n` +
    `🎫 Pass Number: *#${params.passNumber}*\n` +
    `⏰ Authorized Window: ${params.validWindow}\n` +
    `📍 Designated Gate: Main Security Gate 1\n\n` +
    `📱 *Open Your Scannable QR Pass:*\n${params.passUrl}\n\n` +
    `Please present this QR code to security at the gate barrier.`;

  return sendWhatsAppNotification({
    to: params.employeePhone,
    recipientName: params.employeeName,
    message,
    actionUrl: params.passUrl
  });
}

/**
 * 4. Notifies Authorities when Employee Exits or Returns at the Security Gate
 */
export async function notifyAuthorityGateMovement(params: {
  authorityPhone: string;
  authorityName: string;
  employeeName: string;
  employeeCode: string;
  type: 'EXITED' | 'RETURNED';
  timestamp: string;
  duration?: string;
  gateName?: string;
}) {
  const isExit = params.type === 'EXITED';
  const icon = isExit ? '🚪' : '🏢';
  const actionText = isExit ? 'EXITED' : 'RETURNED to';

  const message =
    `${icon} *SmartGate OS: Campus Movement Update*\n` +
    `Employee *${params.employeeName}* (*${params.employeeCode}*) has ${actionText} campus via *${params.gateName || 'Main Gate 1'}* at *${params.timestamp}*.\n` +
    (params.duration ? `Total Duration: *${params.duration}*\n` : '') +
    `Gate Pass Status: *${isExit ? 'ACTIVE / OUTSIDE' : 'CLOSED / RETURNED'}*`;

  return sendWhatsAppNotification({
    to: params.authorityPhone,
    recipientName: params.authorityName,
    message
  });
}

/**
 * 5. Sends Visitor Pass to Host Employee ("Whom to Meet") on WhatsApp
 */
export async function notifyHostVisitorPass(params: {
  hostPhone: string;
  hostName: string;
  visitorName: string;
  organization?: string;
  passNumber: string;
  schedule: string;
  purpose: string;
  passUrl: string;
}) {
  const message =
    `👤 *SmartGate OS: Visitor Pass for Your Meeting*\n` +
    `Hello *${params.hostName}*,\n` +
    `A visitor pass has been generated for your guest:\n\n` +
    `🎫 Pass Number: *#${params.passNumber}*\n` +
    `👤 Visitor: *${params.visitorName}* ${params.organization ? `(${params.organization})` : ''}\n` +
    `⏰ Scheduled: ${params.schedule}\n` +
    `📋 Purpose: ${params.purpose}\n\n` +
    `📱 *View Digital QR Pass & Details:*\n${params.passUrl}`;

  return sendWhatsAppNotification({
    to: params.hostPhone,
    recipientName: params.hostName,
    message,
    actionUrl: params.passUrl
  });
}

/**
 * 6. Sends Visitor Pass to Visitor on WhatsApp
 */
export async function notifyVisitorPassIssued(params: {
  visitorPhone: string;
  visitorName: string;
  hostName: string;
  passNumber: string;
  schedule: string;
  passUrl: string;
}) {
  const message =
    `🎫 *SmartGate OS: Campus Visitor Pass*\n` +
    `Hello *${params.visitorName}*,\n` +
    `Your campus pass to meet *${params.hostName}* is ready.\n\n` +
    `🔑 Pass Number: *#${params.passNumber}*\n` +
    `⏰ Allowed Entry: ${params.schedule}\n` +
    `📍 Designated Gate: Main Security Gate 1\n\n` +
    `📱 *Open Scannable Digital QR Badge:*\n${params.passUrl}\n\n` +
    `Show this QR code to security at the gate on arrival.`;

  return sendWhatsAppNotification({
    to: params.visitorPhone,
    recipientName: params.visitorName,
    message,
    actionUrl: params.passUrl
  });
}
