let admin = null;

const initFCM = () => {
  try {
    if (!process.env.FCM_SERVICE_ACCOUNT) {
      console.log('FCM: No service account provided - push notifications disabled');
      return;
    }

    // Parse and fix escaped newlines in private key
    const raw = process.env.FCM_SERVICE_ACCOUNT;
    const serviceAccount = JSON.parse(raw);
    serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

    admin = require('firebase-admin');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('FCM: Firebase Admin initialized');
  } catch (err) {
    console.error('FCM init error:', err.message);
  }
};

const sendPushNotification = async (tokens, title, body, data = {}) => {
  if (!admin) {
    console.log(`FCM [DISABLED] To: ${tokens.length} devices | ${title}: ${body}`);
    return { success: true, disabled: true };
  }

  try {
    const message = {
      notification: { title, body },
      data: Object.fromEntries(
        Object.entries(data).map(([k, v]) => [k, String(v)])
      ),
      tokens: Array.isArray(tokens) ? tokens : [tokens]
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`FCM: Sent to ${response.successCount}/${tokens.length} devices`);
    return { success: true, successCount: response.successCount };
  } catch (err) {
    console.error('FCM send error:', err.message);
    return { success: false, error: err.message };
  }
};

module.exports = { initFCM, sendPushNotification };
