// src/services/notificationService.js

let admin = null;

// ─── Initialize Firebase (lazy) ───
function getFirebaseAdmin() {
  if (admin) return admin;

  try {
    admin = require('firebase-admin');

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        }),
      });
    }
    return admin;
  } catch (err) {
    console.warn('Firebase not configured:', err.message);
    return null;
  }
}

// ─── Send push notification to a single device ───
async function sendToDevice(token, title, body, data = {}) {
  const fb = getFirebaseAdmin();
  if (!fb) return { success: false, error: 'Firebase not configured' };

  try {
    const message = {
      token,
      notification: { title, body },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: 'pulse_breaking',
          sound: 'default',
          color: '#6d5dfc',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const result = await fb.messaging().send(message);
    return { success: true, messageId: result };
  } catch (err) {
    console.error('Push notification error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Send to a topic (e.g., "breaking", "crypto", "stocks") ───
async function sendToTopic(topic, title, body, data = {}) {
  const fb = getFirebaseAdmin();
  if (!fb) return { success: false, error: 'Firebase not configured' };

  try {
    const message = {
      topic,
      notification: { title, body },
      data: {
        ...data,
        click_action: 'FLUTTER_NOTIFICATION_CLICK',
      },
      android: {
        priority: 'high',
        notification: {
          channelId: `pulse_${topic}`,
          sound: 'default',
          color: '#6d5dfc',
        },
      },
      apns: {
        payload: {
          aps: { sound: 'default', badge: 1 },
        },
      },
    };

    const result = await fb.messaging().send(message);
    return { success: true, messageId: result };
  } catch (err) {
    console.error('Topic push error:', err.message);
    return { success: false, error: err.message };
  }
}

// ─── Subscribe device to topic ───
async function subscribeToTopic(token, topic) {
  const fb = getFirebaseAdmin();
  if (!fb) return { success: false };

  try {
    await fb.messaging().subscribeToTopic([token], topic);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Unsubscribe device from topic ───
async function unsubscribeFromTopic(token, topic) {
  const fb = getFirebaseAdmin();
  if (!fb) return { success: false };

  try {
    await fb.messaging().unsubscribeFromTopic([token], topic);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

// ─── Send breaking news alert to all subscribers ───
async function sendBreakingNewsAlert(headline, summary, articleId) {
  return sendToTopic('breaking', `⚡ ${headline}`, summary, {
    type: 'breaking',
    articleId,
  });
}

module.exports = {
  sendToDevice,
  sendToTopic,
  subscribeToTopic,
  unsubscribeFromTopic,
  sendBreakingNewsAlert,
};
