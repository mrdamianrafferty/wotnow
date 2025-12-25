/**
 * Send test push notifications to all 3 apps
 *
 * Usage:
 *   npx tsx scripts/send-test-notification.ts [deviceToken]
 *
 * If no device token provided, sends to 'all-users' topic
 */

import admin from 'firebase-admin';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Find service account key
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const serviceAccountFiles = fs.readdirSync(projectRoot).filter(f =>
  f.includes('firebase-adminsdk') && f.endsWith('.json')
);

if (serviceAccountFiles.length === 0) {
  console.error('❌ No Firebase service account key found in project root');
  console.error('   Download from: https://console.firebase.google.com/project/wotnow-daisy-apps/settings/serviceaccounts/adminsdk');
  process.exit(1);
}

const serviceAccountPath = path.join(projectRoot, serviceAccountFiles[0]);
console.log(`📄 Using service account: ${serviceAccountFiles[0]}`);

// Initialize Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const deviceToken = process.argv[2];

async function sendNotification() {
  const timestamp = new Date().toLocaleTimeString();

  if (deviceToken) {
    // Send to specific device
    console.log(`\n📱 Sending to device token: ${deviceToken.substring(0, 20)}...`);

    const message: admin.messaging.Message = {
      token: deviceToken,
      notification: {
        title: '🎉 Push Notifications Working!',
        body: `Test notification sent at ${timestamp}`,
      },
      data: {
        type: 'test',
        timestamp: new Date().toISOString(),
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
        payload: {
          aps: {
            alert: {
              title: '🎉 Push Notifications Working!',
              body: `Test notification sent at ${timestamp}`,
            },
            badge: 1,
            sound: 'default',
            'mutable-content': 1,
          },
        },
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
    };

    try {
      const response = await admin.messaging().send(message);
      console.log('✅ Successfully sent:', response);
    } catch (error: any) {
      console.error('❌ Error sending:', error.message);
    }
  } else {
    // Send to topics for each app
    console.log('\n📣 No device token provided. Sending to app topics...');
    console.log('   (Devices must be subscribed to receive these)\n');

    const apps = [
      { name: 'Findr', topic: 'findr-all' },
      { name: 'Go Daisy', topic: 'godaisy-all' },
      { name: 'Grow Daisy', topic: 'growdaisy-all' },
    ];

    for (const app of apps) {
      const message: admin.messaging.Message = {
        topic: app.topic,
        notification: {
          title: `${app.name}: Push Test`,
          body: `Test notification at ${timestamp}`,
        },
        data: {
          type: 'test',
          app: app.name.toLowerCase().replace(' ', ''),
          timestamp: new Date().toISOString(),
        },
        apns: {
          headers: {
            'apns-priority': '10',
            'apns-push-type': 'alert',
          },
          payload: {
            aps: {
              alert: {
                title: `${app.name}: Push Test`,
                body: `Test notification at ${timestamp}`,
              },
              badge: 1,
              sound: 'default',
              'mutable-content': 1,
            },
          },
        },
      };

      try {
        const response = await admin.messaging().send(message);
        console.log(`✅ ${app.name}: Sent to topic '${app.topic}' - ${response}`);
      } catch (error: any) {
        console.log(`⚠️  ${app.name}: ${error.message}`);
      }
    }

    console.log('\n💡 To send to a specific device:');
    console.log('   1. Run the app on a device');
    console.log('   2. Copy the device token from Xcode console');
    console.log('   3. Run: npx tsx scripts/send-test-notification.ts <token>');
  }
}

sendNotification()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
