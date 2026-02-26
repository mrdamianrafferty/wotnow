import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Optional CLI arg: filter by app name (findr, godaisy, growdaisy)
const appFilter = process.argv[2]?.toLowerCase();
const bundleIdMap: Record<string, string> = {
  findr: 'eu.fishfindr.app',
  godaisy: 'io.godaisy.app',
  growdaisy: 'io.growdaisy.app',
};

async function main() {
  // Build query
  let query = supabase
    .from('user_push_tokens')
    .select('user_id, platform, token, last_used, bundle_id')
    .order('last_used', { ascending: false })
    .limit(10);

  // Filter by bundle_id if app name provided
  if (appFilter && bundleIdMap[appFilter]) {
    const bundleId = bundleIdMap[appFilter];
    console.log(`Filtering tokens for app: ${appFilter} (${bundleId})\n`);
    query = query.eq('bundle_id', bundleId);
  } else if (appFilter) {
    console.log(`Unknown app "${appFilter}". Valid options: findr, godaisy, growdaisy\n`);
    return;
  }

  const { data: tokens, error } = await query;

  if (error) {
    console.error('Error fetching tokens:', error);
    return;
  }

  console.log('Registered push tokens:');
  for (const t of tokens || []) {
    console.log(`  user: ${t.user_id.substring(0, 8)}...  platform: ${t.platform}  bundle: ${t.bundle_id || '(legacy/null)'}  last_used: ${t.last_used}`);
  }

  if (!tokens || tokens.length === 0) {
    console.log('\nNo push tokens registered yet.');
    console.log('Open the app on your phone to register a token.');
    return;
  }

  // Send a test notification to the first token
  const testToken = tokens[0];
  console.log(`\nSending test notification to ${testToken.platform} device (bundle: ${testToken.bundle_id || 'legacy'})...`);

  if (testToken.platform === 'ios') {
    // Route to the correct APNS client based on bundle_id
    let result = false;

    switch (testToken.bundle_id) {
      case 'io.growdaisy.app': {
        const { sendGrowApnsPushNotification } = await import('../lib/grow/apnsClient');
        result = await sendGrowApnsPushNotification(testToken.token, {
          title: '🧪 Test Notification',
          body: `Push notifications are working! (Grow Daisy)`,
          data: { type: 'test' },
          badge: 1,
          sound: 'default',
        });
        break;
      }
      case 'io.godaisy.app': {
        const { sendGoDaisyApnsPushNotification } = await import('../lib/godaisy/apnsClient');
        result = await sendGoDaisyApnsPushNotification(testToken.token, {
          title: '🧪 Test Notification',
          body: `Push notifications are working! (Go Daisy)`,
          data: { type: 'test' },
          badge: 1,
          sound: 'default',
        });
        break;
      }
      case 'eu.fishfindr.app':
      default: {
        const { sendApnsPushNotification } = await import('../lib/findr/apnsClient');
        result = await sendApnsPushNotification(testToken.token, {
          title: '🧪 Test Notification',
          body: `Push notifications are working! (Findr)`,
          data: { type: 'test' },
          badge: 1,
          sound: 'default',
        });
        break;
      }
    }

    console.log('APNS result:', result ? 'SUCCESS' : 'FAILED');
  } else if (testToken.platform === 'android') {
    // Test Android via FCM (FCM doesn't need bundle_id routing)
    const { sendFcmPushNotification } = await import('../lib/notifications/fcmClient');
    const result = await sendFcmPushNotification(testToken.token, {
      title: '🧪 Test Notification',
      body: 'Push notifications are working!',
      data: { type: 'test' },
    });
    console.log('FCM result:', result ? 'SUCCESS' : 'FAILED');
  }
}

main().catch(console.error);
