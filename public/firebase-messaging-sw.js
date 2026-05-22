console.log('🚀 Agorich Pharma Enterprise Service Worker starting...');

self.addEventListener('install', (event) => {
  console.log('📦 Service Worker installing.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('✨ Service Worker activating.');
  event.waitUntil(clients.claim());
});

self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event);
  event.notification.close();

  const data = event.notification.data || {};
  const clickAction = data.click_action || data.url || '/dashboard';
  const action = event.action;

  console.log('📍 Click action:', clickAction, 'Button:', action);

  if (action === 'dismiss') {
    console.log('❌ Dismissed');
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log('🔄 Focusing existing client and navigating to:', clickAction);
          client.navigate(clickAction);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        console.log('🌐 Opening new window:', clickAction);
        return clients.openWindow(clickAction);
      }
    })
  );
});

self.addEventListener('push', (event) => {
  console.log('📬 Push event received:', event);

  if (!event.data) {
    console.log('⚠️ No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    console.log('📋 Push payload:', data);

    const notificationData = data.notification || data.data || data;

    const title = notificationData.title || 'Agorich Pharma';
    const body = notificationData.body || notificationData.message || 'New notification';
    const image = notificationData.image || notificationData.image_url || null;
    const icon = notificationData.icon || '/agorich-logo.png';
    const badge = notificationData.badge || '/agorich-logo.png';
    const tag = notificationData.tag || 'agorich-notification';
    const renotify = notificationData.renotify || false;
    const silent = notificationData.silent || false;
    const vibrate = notificationData.vibrate || [200, 100, 200];

    const actions = [];
    if (notificationData.actions && Array.isArray(notificationData.actions)) {
      notificationData.actions.forEach((action, index) => {
        if (index < 2) {
          actions.push({
            action: action.action || `action_${index}`,
            title: action.title || 'Open',
            icon: action.icon || null
          });
        }
      });
    }

    if (notificationData.click_action || notificationData.url) {
      actions.push({
        action: 'open',
        title: 'Open',
        icon: null
      });
    }

    actions.push({
      action: 'dismiss',
      title: 'Dismiss',
      icon: null
    });

    const options = {
      body: body,
      icon: icon,
      badge: badge,
      tag: tag,
      renotify: renotify,
      silent: silent,
      vibrate: vibrate,
      requireInteraction: notificationData.require_interaction || false,
      data: {
        ...notificationData,
        click_action: notificationData.click_action || notificationData.url || '/dashboard'
      },
      actions: actions
    };

    if (image) {
      options.image = image;
    }

    console.log('🔔 Showing notification:', { title, options });
    event.waitUntil(self.registration.showNotification(title, options));

  } catch (error) {
    console.error('❌ Error parsing push data:', error);
  }
});

console.log('✅ Service Worker setup complete - Ready for rich notifications!');