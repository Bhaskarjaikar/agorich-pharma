// Firebase Messaging Service Worker v3.0
// Production-grade implementation for Agorich Pharma
// Optimized for Next.js + Firebase v12.13.0

// Import Firebase libraries using importScripts (required for service workers)
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js');
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js');

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
    app = firebase.apps.length === 0 ? firebase.initializeApp(firebaseConfig) : firebase.apps[0];
    messaging = firebase.messaging();
    console.log('✅ Firebase initialized in service worker');
  } else {
    console.warn('⚠️ Firebase config missing in service worker');
  }
} catch (error) {
  console.error('❌ Firebase initialization error in service worker:', error);
}

// Handle push events (legacy FCM or direct push API)
self.addEventListener('push', (event) => {
  console.log('📬 Push event received');

  if (!event.data) {
    console.log('⚠️ No data in push event');
    return;
  }

  try {
    const data = event.data.json();
    console.log('📋 Push payload:', data);

    // Check if this is a Firebase message (has "firebase" key)
    const isFirebaseMessage = data.firebase || data['google.c.a.e'] === '1';
    
    if (isFirebaseMessage && messaging) {
      // Firebase messages are handled by onBackgroundMessage
      console.log('🔥 Firebase message, handled by onBackgroundMessage');
      return;
    }

    // Handle legacy push notifications
    // Check if app is in foreground before showing notification
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        const hasFocusedClient = clients.some(client => client.focused);
        
        if (!hasFocusedClient) {
          // App is in background or closed, show notification
          const notificationData = data.notification || data.data || data;

          const title = notificationData.title || 'Agorich Pharma';
          const body = notificationData.body || notificationData.message || 'New notification';
          const icon = notificationData.icon || '/agorich-logo.png';
          const clickAction = notificationData.click_action || notificationData.url || '/dashboard';

          const options = {
            body,
            icon,
            data: {
              url: clickAction,
              click_action: clickAction,
              ...notificationData,
            },
            actions: [
              { action: 'open', title: 'View' },
              { action: 'dismiss', title: 'Dismiss' }
            ],
            vibrate: [200, 100, 200],
            tag: 'agorich-notification',
            renotify: true,
          };

          return self.registration.showNotification(title, options);
        } else {
          // App is in foreground, forward to client
          clients.forEach((client) => {
            client.postMessage({
              type: 'PUSH_FOREGROUND_MESSAGE',
              payload: data,
            });
          });
        }
      })
    );

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
    clients.matchAll({ 
      type: 'window', 
      includeUncontrolled: true 
    }).then((clientList) => {
      // Check if there's an existing client with our origin
      const existingClient = clientList.find(client => 
        client.url.startsWith(self.location.origin)
      );

      if (existingClient) {
        console.log('🔄 Focusing existing client');
        // Focus the existing client
        if ('focus' in existingClient) {
          existingClient.focus();
        }
        // Navigate to the click action if needed
        if (existingClient.url !== clickAction && 'navigate' in existingClient) {
          existingClient.navigate(clickAction);
        }
        return;
      }

      // Open new window if no existing client found
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

// Handle background messages (when app is not in foreground)
if (messaging) {
  firebase.messaging().onBackgroundMessage((payload) => {
    console.log('📱 Background message received:', payload);

    // Only show notification if app is not in foreground
    // Check if any client is focused
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const hasFocusedClient = clients.some(client => client.focused);
      
      if (!hasFocusedClient) {
        // App is in background or closed, show notification
        const notificationData = payload.notification || payload.data || payload;
        
        const title = notificationData.title || 'Agorich Pharma';
        const body = notificationData.body || notificationData.message || 'New notification';
        const icon = notificationData.icon || '/agorich-logo.png';
        const clickAction = notificationData.click_action || notificationData.url || '/dashboard';

        const options = {
          body,
          icon,
          data: {
            url: clickAction,
            click_action: clickAction,
            ...notificationData,
          },
          actions: [
            { action: 'open', title: 'View' },
            { action: 'dismiss', title: 'Dismiss' }
          ],
          vibrate: [200, 100, 200],
          tag: 'agorich-notification',
          renotify: true,
        };

        return self.registration.showNotification(title, options);
      } else {
        // App is in foreground, forward message to client for in-app handling
        clients.forEach((client) => {
          client.postMessage({
            type: 'FCM_FOREGROUND_MESSAGE',
            payload: payload,
          });
        });
      }
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
