// Firebase Messaging Service Worker v2.0
// Production-grade implementation for Agorich Pharma

import { initializeApp, getApps } from 'firebase/app';
import { getMessaging, onBackgroundMessage, getToken } from 'firebase/messaging';

// Firebase configuration from environment
const firebaseConfig = {
  apiKey: self.__WB_ENV?.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: self.__WB_ENV?.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: self.__WB_ENV?.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: self.__WB_ENV?.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: self.__WB_ENV?.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: self.__WB_ENV?.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Initialize Firebase
let app = null;
let messaging = null;

try {
  if (firebaseConfig.apiKey && firebaseConfig.projectId) {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    messaging = getMessaging(app);
    console.log('✅ Firebase initialized in service worker');
  } else {
    console.warn('⚠️ Firebase config missing in service worker');
  }
} catch (error) {
  console.error('❌ Firebase initialization error in service worker:', error);
}

// Handle push events
self.addEventListener('push', (event) => {
  console.log('📬 Push event received');

  if (!event.data) {
    console.log('⚠️ No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    console.log('📋 Push payload:', data);

    // Support multiple payload formats
    const notificationData = data.notification || data.data || data;

    const title = notificationData.title || 'Agorich Pharma';
    const body = notificationData.body || notificationData.message || 'New notification';
    const icon = notificationData.icon || '/agorich-logo.png';
    const badge = notificationData.badge || '/agorich-logo.png';
    const image = notificationData.image || notificationData.image_url || null;
    const tag = notificationData.tag || 'agorich-notification';
    const clickAction = notificationData.click_action || notificationData.url || data.click_action || '/dashboard';

    // Build notification options
    const options = {
      body,
      icon,
      badge,
      tag,
      renotify: true,
      requireInteraction: false,
      data: {
        url: clickAction,
        click_action: clickAction,
        ...notificationData,
      },
      actions: [],
      vibrate: [200, 100, 200],
    };

    // Add image if provided
    if (image) {
      options['image'] = image;
    }

    // Add default open action
    options.actions.push({
      action: 'open',
      title: 'View',
    });

    // Add dismiss action
    options.actions.push({
      action: 'dismiss',
      title: 'Dismiss',
    });

    // Show notification
    const showNotificationPromise = self.registration.showNotification(title, options);

    event.waitUntil(showNotificationPromise);

  } catch (error) {
    console.error('❌ Error handling push event:', error);
  }
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('🖱️ Notification clicked:', event);

  event.notification.close();

  const clickAction = event.notification.data?.url || event.notification.data?.click_action || '/dashboard';
  const action = event.action;

  console.log('📍 Click action:', clickAction, 'Button action:', action);

  // Handle dismiss action
  if (action === 'dismiss') {
    console.log('❌ Notification dismissed');
    return;
  }

  // Handle notification click
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Try to focus existing window
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          console.log('🔄 Focusing existing client');
          client.navigate(clickAction);
          return client.focus();
        }
      }

      // Open new window if none found
      if (clients.openWindow) {
        console.log('🌐 Opening new window:', clickAction);
        return clients.openWindow(clickAction);
      }
    }).catch((error) => {
      console.error('❌ Error handling notification click:', error);
    })
  );
});

// Handle notification close
self.addEventListener('notificationclose', (event) => {
  console.log('🔕 Notification closed');
});

// Handle messages in foreground (when app is open)
if (messaging) {
  onBackgroundMessage(messaging, (payload) => {
    console.log('📱 Foreground message received:', payload);

    // This won't show a notification automatically when app is in foreground
    // The app needs to handle this with onMessage in the client code
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      clients.forEach((client) => {
        client.postMessage({
          type: 'FCM_MESSAGE',
          payload: payload,
        });
      });
    });
  });
}

// Service worker activation
self.addEventListener('activate', (event) => {
  console.log('✨ Service Worker activating');
  event.waitUntil(clients.claim());
});

// Service worker installation
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker installing');
  self.skipWaiting();
});

console.log('🚀 Agorich Pharma Service Worker v2.0 loaded');
