/**
 * Custom Service Worker Extensions for Grow Daisy Push Notifications
 *
 * This file is merged with the auto-generated next-pwa service worker.
 * It handles push notifications, notification clicks, and badge management.
 */

// =============================================================================
// PUSH EVENT - Receive incoming push notifications
// =============================================================================

self.addEventListener('push', function (event) {
  console.log('[ServiceWorker] Push received');

  let data = {};

  // Parse the push payload
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    console.error('[ServiceWorker] Error parsing push data:', e);
    // Try text format as fallback
    data = {
      title: 'Grow Daisy',
      body: event.data ? event.data.text() : 'You have a new notification',
    };
  }

  // Extract notification details
  const title = data.title || 'Grow Daisy';
  const options = {
    body: data.body || '',
    icon: data.icon || '/icons/grow-icon-192.png',
    badge: data.badge || '/icons/grow-badge-72.png',
    tag: data.tag || 'grow-notification',
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
    silent: data.silent || false,
    vibrate: [200, 100, 200], // Vibration pattern for mobile
    timestamp: data.timestamp || Date.now(),
  };

  // If there's a renotify flag and tag, show even if same tag exists
  if (data.renotify) {
    options.renotify = true;
  }

  // Show the notification
  const promiseChain = self.registration.showNotification(title, options);

  event.waitUntil(promiseChain);
});

// =============================================================================
// NOTIFICATION CLICK - Handle notification interactions
// =============================================================================

self.addEventListener('notificationclick', function (event) {
  console.log('[ServiceWorker] Notification click:', event.action);

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // Close the notification
  notification.close();

  // Determine target URL based on action or default
  let targetUrl = data.url || '/grow';

  // Handle specific actions
  switch (action) {
    case 'view':
      // Use the URL from data, or default
      targetUrl = data.url || '/grow';
      break;

    case 'dismiss':
      // Just close the notification - no navigation
      return;

    case 'done':
    case 'harvested':
      // Mark task as done - could POST to an API here
      targetUrl = '/grow/tasks';
      break;

    default:
      // Default click - navigate to the URL in data
      targetUrl = data.url || '/grow';
  }

  // Make URL absolute if relative
  if (targetUrl.startsWith('/')) {
    targetUrl = self.location.origin + targetUrl;
  }

  // Open or focus existing window
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      // Check if there's already a window open with Grow Daisy
      for (const client of clientList) {
        if (client.url.includes('/grow') && 'focus' in client) {
          // Navigate existing window and focus
          return client.navigate(targetUrl).then(() => client.focus());
        }
      }

      // No existing window - open a new one
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// =============================================================================
// NOTIFICATION CLOSE - Handle notification dismissal
// =============================================================================

self.addEventListener('notificationclose', function (event) {
  console.log('[ServiceWorker] Notification closed');

  // Could send analytics about dismissed notifications here
  const data = event.notification.data || {};

  if (data.notificationType) {
    // Optional: Track that notification was dismissed without interaction
    // This could be useful for improving notification content
    console.log('[ServiceWorker] Dismissed:', data.notificationType);
  }
});

// =============================================================================
// PUSH SUBSCRIPTION CHANGE - Handle subscription updates
// =============================================================================

self.addEventListener('pushsubscriptionchange', function (event) {
  console.log('[ServiceWorker] Push subscription changed');

  // When the push subscription changes (e.g., expires), we need to resubscribe
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: self.VAPID_PUBLIC_KEY,
      })
      .then(function (subscription) {
        console.log('[ServiceWorker] Resubscribed:', subscription.endpoint);

        // Send the new subscription to the server
        // This would need the user's auth token, so we'll need to message the main thread
        // For now, just log it - the app will handle resubscription when opened
      })
      .catch(function (error) {
        console.error('[ServiceWorker] Resubscription failed:', error);
      })
  );
});

// =============================================================================
// MESSAGE HANDLING - Communicate with main thread
// =============================================================================

self.addEventListener('message', function (event) {
  console.log('[ServiceWorker] Message received:', event.data);

  if (event.data && event.data.type === 'SET_VAPID_KEY') {
    // Store VAPID key for resubscription
    self.VAPID_PUBLIC_KEY = event.data.key;
  }

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[ServiceWorker] Grow Daisy push notification handlers registered');
