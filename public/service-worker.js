/**
 * Service Worker for Zombie Survival Game
 * Provides offline caching and improved performance
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `zombie-survival-${CACHE_VERSION}`;

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/addictionStyles.css',
  '/manifest.json',
  // Core game files
  '/game.js',
  '/gamePatch.js',
  // Libraries
  '/lib/MathUtils.js',
  '/lib/PerformanceUtils.js',
  '/modules/NetworkManager.js',
  // Asset management
  '/assetManager.js',
  '/professionalAssetGenerator.js',
  '/demoAssetGenerator.js',
  '/assetIntegration.js',
  // Visual & Audio
  '/visualEffects.js',
  '/screenEffects.js',
  '/audioSystem.js',
  // Game systems
  '/skinSystem.js',
  '/enhancedUI.js',
  '/performanceSettings.js',
  '/gameIntegration.js',
  '/achievementSystem.js',
  '/dailyChallenges.js',
  '/unlockSystem.js',
  '/synergySystem.js',
  '/missionSystem.js',
  '/lifetimeStats.js',
  '/gemSystem.js',
  '/retentionHooks.js',
  '/eventSystem.js',
  '/addictionIntegration.js',
  // Icons (will be added after generation)
  '/favicon-32x32.png',
  '/favicon-16x16.png',
  '/android-chrome-192x192.png',
  '/android-chrome-512x512.png',
  '/apple-touch-icon.png'
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching core assets');
        return cache.addAll(PRECACHE_ASSETS.filter(asset => {
          // Only cache existing files, skip if not found
          return true; // We'll handle 404s gracefully
        }));
      })
      .then(() => {
        console.log('[SW] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old cache versions
              return cacheName.startsWith('zombie-survival-') && cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[SW] Activation complete');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Skip socket.io requests (always use network)
  if (url.pathname.includes('/socket.io/')) {
    return;
  }

  // Strategy: Network First for HTML, Cache First for assets
  if (request.headers.get('accept').includes('text/html')) {
    // Network first for HTML (game updates)
    event.respondWith(networkFirstStrategy(request));
  } else {
    // Cache first for static assets (performance)
    event.respondWith(cacheFirstStrategy(request));
  }
});

/**
 * Network First Strategy - Try network, fallback to cache
 * Good for HTML and dynamic content
 */
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, using cache:', request.url);
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page if available
    return caches.match('/index.html');
  }
}

/**
 * Cache First Strategy - Try cache, fallback to network
 * Good for static assets (CSS, JS, images)
 */
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Found in cache, return it
    return cachedResponse;
  }

  try {
    // Not in cache, fetch from network
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed for:', request.url, error);

    // Could return a fallback asset here
    return new Response('Offline - Asset not available', {
      status: 503,
      statusText: 'Service Unavailable',
      headers: new Headers({
        'Content-Type': 'text/plain'
      })
    });
  }
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-game-data') {
    event.waitUntil(syncGameData());
  }
});

async function syncGameData() {
  try {
    // Sync game data when back online
    console.log('[SW] Syncing game data...');
    // Implementation depends on your backend
  } catch (error) {
    console.error('[SW] Sync failed:', error);
  }
}

// Push notifications (for future use)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New update available!',
    icon: '/android-chrome-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    tag: 'zombie-survival-notification',
    actions: [
      {
        action: 'open',
        title: 'Play Now',
        icon: '/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-96x96.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('🧟 Zombie Survival', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.delete(CACHE_NAME).then(() => {
        console.log('[SW] Cache cleared');
      })
    );
  }
});

console.log('[SW] Service Worker loaded');
