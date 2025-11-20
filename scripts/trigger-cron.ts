#!/usr/bin/env tsx
/**
 * Manually trigger the check-notifications cron job for testing
 */

async function triggerCron() {
  const CRON_SECRET = process.env.CRON_SECRET || 'test-cron-secret-local';
  const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  console.log('🔔 Triggering notification cron job...');
  console.log(`   URL: ${BASE_URL}/api/cron/check-notifications`);

  try {
    const response = await fetch(`${BASE_URL}/api/cron/check-notifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`
      }
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Cron job completed successfully!');
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.error('❌ Cron job failed:');
      console.error(JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error triggering cron:', error);
  }
}

triggerCron();
