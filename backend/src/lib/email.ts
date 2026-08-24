export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmailNotification(options: EmailOptions): Promise<boolean> {
  // Console mock provider for development / testing, ready for nodemailer/SES integration
  console.log(`\n📧 [EMAIL NOTIFICATION DISPATCHED]`);
  console.log(`   To: ${options.to}`);
  console.log(`   Subject: ${options.subject}`);
  console.log(`   Content: ${options.text || options.html.replace(/<[^>]*>?/gm, '')}`);
  console.log(`----------------------------------------------------\n`);
  return true;
}

export async function sendPushNotification(userId: string, title: string, body: string, data?: any): Promise<boolean> {
  console.log(`\n📲 [WEB PUSH NOTIFICATION] User: ${userId} | ${title} - ${body}`);
  return true;
}
