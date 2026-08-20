// Vercel Serverless Function для отправки Push Уведомлений N1K∅

const webpush = require('web-push');

// VAPID ключи (получены из web-push generate-vapid-keys)
const vapidKeys = {
  publicKey: 'BO7gzbXFlUvJzea4rQozVRifl2evB6j-zwdBh7rGMBxiT2-UArp-abTloC5iQZ4IPRFcB9bAn1cFbALudJ67EYs',
  privateKey: process.env.VAPID_PRIVATE_KEY || 'your-private-key-here'
};

if (!vapidKeys.privateKey || vapidKeys.privateKey === 'your-private-key-here') {
  console.error('VAPID_PRIVATE_KEY environment variable not set');
}

webpush.setVapidDetails(
  'mailto:admin@niko-vert.vercel.app',
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Firebase Admin SDK инициализация (для доступа к Firestore)
const admin = require('firebase-admin');

// Используем Environment Variable для Service Account Key
const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountKey) {
  console.error('FIREBASE_SERVICE_ACCOUNT_KEY environment variable not set');
}

const serviceAccount = serviceAccountKey ? JSON.parse(serviceAccountKey) : null;

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://niko-vert-default-rtdb.firebaseio.com'
  });
} else {
  // Fallback для локального тестирования
  try {
    const localServiceAccount = require('./firebase-service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(localServiceAccount),
      databaseURL: 'https://niko-vert-default-rtdb.firebaseio.com'
    });
  } catch (e) {
    console.error('No Firebase credentials available');
  }
}

const db = admin.firestore();

export default async function handler(req, res) {
  // Только POST запросы
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { trackId, track } = req.body;

    console.log('📤 Push notification request received:', { trackId, track });

    if (!trackId || !track) {
      console.error('❌ Missing trackId or track data');
      return res.status(400).json({ error: 'Missing trackId or track data' });
    }

    console.log('🔑 VAPID keys configured:', !!vapidKeys.privateKey);
    console.log('🔥 Firebase initialized:', !!serviceAccount);

    // Получаем все активные подписки из Firestore
    const subscriptionsSnapshot = await db.collection('push_subscriptions').get();

    if (subscriptionsSnapshot.empty) {
      console.log('⚠️ No push subscriptions found in Firestore');
      return res.status(200).json({ message: 'No subscriptions to notify' });
    }

    console.log(`✅ Found ${subscriptionsSnapshot.size} subscriptions`);

    const notifications = [];
    const failedSubscriptions = [];

    subscriptionsSnapshot.forEach(doc => {
      const subscriptionData = doc.data();
      const subscription = subscriptionData.subscription;

      // Формируем красивое уведомление с обложкой трека
      const notificationPayload = {
        title: '🎵 New Track!',
        body: `${track.artist || ''} - ${track.title}`,
        icon: 'https://niko-vert.vercel.app/icon-192.png',
        badge: 'https://niko-vert.vercel.app/badge-72.png',
        image: track.cover || null,
        data: {
          url: `https://niko-vert.vercel.app/NIKO.html?track=${trackId}`,
          trackId: trackId
        },
        tag: `new-track-${trackId}`,
        requireInteraction: true
      };

      notifications.push(
        webpush.sendNotification(subscription, JSON.stringify(notificationPayload))
          .then(() => {
            console.log('✅ Push sent successfully to:', doc.id);
          })
          .catch(error => {
            console.error('❌ Push failed for:', doc.id, error.message, error.statusCode);

            // Если подписка недействительна (410 Gone) - удаляем её
            if (error.statusCode === 410 || error.statusCode === 404) {
              console.log('🗑️ Removing invalid subscription:', doc.id);
              failedSubscriptions.push(doc.id);
            }
          })
      );
    });

    await Promise.all(notifications);

    // Удаляем недействительные подписки
    if (failedSubscriptions.length > 0) {
      const batch = db.batch();
      failedSubscriptions.forEach(id => {
        const ref = db.collection('push_subscriptions').doc(id);
        batch.delete(ref);
      });
      await batch.commit();
      console.log(`🗑️ Removed ${failedSubscriptions.length} invalid subscriptions`);
    }

    const successCount = notifications.length - failedSubscriptions.length;
    console.log(`✅ Sent ${successCount} push notifications`);

    return res.status(200).json({
      success: true,
      sent: successCount,
      failed: failedSubscriptions.length
    });

  } catch (error) {
    console.error('Error sending push notifications:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
