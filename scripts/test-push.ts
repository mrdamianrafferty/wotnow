import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  // Check for registered tokens
  const { data: tokens, error } = await supabase
    .from('user_push_tokens')
    .select('user_id, platform, token, last_used')
    .order('last_used', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error fetching tokens:', error);
    return;
  }

  console.log('Registered push tokens:');
  console.log(JSON.stringify(tokens, null, 2));

  if (!tokens || tokens.length === 0) {
    console.log('\nNo push tokens registered yet.');
    console.log('Open the Findr app on your phone to register a token.');
    return;
  }

  // Send a test notification to the first token
  const testToken = tokens[0];
  console.log(`\nSending test notification to ${testToken.platform} device...`);

  if (testToken.platform === 'ios') {
    // Test iOS via APNS
    const { sendApnsPushNotification } = await import('../lib/findr/apnsClient');
    const result = await sendApnsPushNotification(testToken.token, {
      title: '🧪 Test Notification',
      body: 'Push notifications are working!',
      data: { type: 'test' },
      badge: 1,
      sound: 'default',
    });
    console.log('APNS result:', result ? 'SUCCESS' : 'FAILED');
  } else if (testToken.platform === 'android') {
    // Test Android via FCM
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
