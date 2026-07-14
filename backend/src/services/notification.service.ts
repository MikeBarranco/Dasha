import webpush from 'web-push';
import { prisma } from '../config/db';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BPJoABRvg_dLxoX7MLNLNV3rDpOptuRO4FyHxPejufbVknisivI2KZjZGKWw55Y3rAB-_i9LzpFe-B8qyFfw9vo';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || 'AUst5z6oHl14AGHktnC9R58OJ0u-gOS3-Zst3zEcpIw';

webpush.setVapidDetails(
  'mailto:soporte@dasha.org', // Replace with real email
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

export class NotificationService {
  /**
   * Save a push subscription for a user
   */
  static async saveSubscription(userId: string, subscription: any) {
    // We stringify the subscription since it's an object containing endpoint and keys
    const endpoint = subscription.endpoint;
    
    // Check if it already exists
    const existing = await prisma.pushSubscription.findFirst({
      where: { userId, endpoint }
    });

    if (existing) {
      return existing;
    }

    return await prisma.pushSubscription.create({
      data: {
        userId,
        endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      }
    });
  }

  /**
   * Send an in-app notification and optionally a push notification
   */
  static async sendNotification({
    userId,
    title,
    body,
    type,
    referenceId,
    referenceType,
    link
  }: {
    userId: string;
    title: string;
    body: string;
    type: any; // Using any for NotifType since enum comes from prisma
    referenceId?: string;
    referenceType?: string;
    link?: string;
  }) {
    // 1. Create in-app notification in DB
    const notif = await prisma.notification.create({
      data: {
        userId,
        title,
        body,
        type,
        referenceId,
        referenceType,
        link
      }
    });

    // 2. Try sending push notifications to all active subscriptions of this user
    try {
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId }
      });

      let targetUrl = link;
      if (!targetUrl) {
        targetUrl = referenceType === 'report' ? `/reports/${referenceId}` : '/';
      }

      const pushPayload = JSON.stringify({
        title,
        body,
        icon: '/pwa-192x192.png',
        data: { url: targetUrl }
      });

      const pushPromises = subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          };
          await webpush.sendNotification(pushSubscription, pushPayload);
        } catch (error: any) {
          // If the subscription is no longer valid (e.g. user revoked permission), delete it
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          } else {
            console.error('Error sending push to subscription:', sub.id, error);
          }
        }
      });

      await Promise.all(pushPromises);
    } catch (err) {
      console.error('Error in sendNotification push step:', err);
    }

    return notif;
  }
  static async sendPushToUsersAsync(userIds: string[], pushPayload: string) {
    try {
      // Find all subscriptions for these users
      const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId: { in: userIds } }
      });

      const pushPromises = subscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          };
          await webpush.sendNotification(pushSubscription, pushPayload);
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          } else {
            console.error('Error sending push to subscription:', sub.id, error);
          }
        }
      });

      await Promise.allSettled(pushPromises);
    } catch (err) {
      console.error('Error in sendPushToUsersAsync:', err);
    }
  }

  static async sendWebPushToAll(title: string, body: string, url: string) {
    try {
      const allSubscriptions = await prisma.pushSubscription.findMany();
      if (!allSubscriptions.length) return;

      const pushPayload = JSON.stringify({
        title,
        body,
        icon: '/pwa-192x192.png',
        data: { url }
      });

      const pushPromises = allSubscriptions.map(async (sub) => {
        try {
          const pushSubscription = {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth }
          };
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const webpush = require('web-push');
          await webpush.sendNotification(pushSubscription, pushPayload);
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          }
        }
      });
      await Promise.allSettled(pushPromises);
    } catch (err) {
      console.error('Error sending web push to all:', err);
    }
  }
}
