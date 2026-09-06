import { prisma } from './prisma';
import { emitToUser } from './socket';

export interface SendNotificationOptions {
  userId: string;
  title: string;
  message: string;
  type?: string;
  priority?: 'NORMAL' | 'HIGH' | 'CRITICAL';
  metadata?: Record<string, any> | string;
}

/**
 * Creates a notification in the database for the designated user
 * and immediately emits real-time WebSocket events to their personal socket room.
 */
export async function sendNotification({
  userId,
  title,
  message,
  type = 'INFO',
  priority = 'NORMAL',
  metadata
}: SendNotificationOptions) {
  try {
    const metadataStr = typeof metadata === 'object'
      ? JSON.stringify(metadata)
      : (metadata || null);

    const notification = await prisma.notification.create({
      data: {
        userId,
        title,
        message,
        type,
        priority,
        metadata: metadataStr,
        read: false
      }
    });

    // Real-time dispatch to the specific user's private socket channel
    emitToUser(userId, 'notification:new', notification);
    emitToUser(userId, 'notification', notification);

    return notification;
  } catch (err) {
    console.error(`⚠️ Failed to send notification to user ${userId}:`, err);
    return null;
  }
}
