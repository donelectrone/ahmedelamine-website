/* ========================================
   DHBNN PWA - Service Worker
   Handles caching for offline functionality and notifications.
   ======================================== */

const CACHE_NAME = 'dhbnn-pwa-v3';

// List of all essential files that need to be cached for the app to work offline.
// In service-worker.js

const urlsToCache = [
    './',
    './index.html',
    './patient-list.html',
    './assessment.html',
    './patient-profile.html',
    // './stats.html', 
    './styles.css',
    './main.js',
    './data-store.js',
    './patient-form.js',
    './assessment-logic.js',
    './patient-list-manager.js',
    './profile-manager.js',
    './utils.js',
    './manifest.json',
    './body.png',
    './icons/icon-192x192.png', 
    './icons/icon-512x512.png'  
];

// --- EVENT LISTENERS ---

// 1. Install Event: Caches all essential app files.
self.addEventListener('install', (event) => {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Service Worker: Caching app shell');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('Service Worker: Failed to cache app shell', error);
            })
    );
});

// 2. Activate Event: Cleans up old, unused caches.
self.addEventListener('activate', (event) => {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Deleting old cache', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

// 3. Fetch Event: Intercepts network requests and serves from cache if available.
self.addEventListener('fetch', (event) => {
    // We only want to cache GET requests for our app files.
    if (event.request.method !== 'GET') {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then((cachedResponse) => {
                // If the resource is in the cache, return it.
                if (cachedResponse) {
                    return cachedResponse;
                }
                // If not in cache, fetch it from the network.
                return fetch(event.request);
            })
            .catch(error => {
                console.error('Service Worker: Error during fetch', error);
                // You could return a fallback offline page here if you had one.
            })
    );
});

// 4. Notification Click Event: Handles what happens when a user clicks a notification.
self.addEventListener('notificationclick', (event) => {
    console.log('Service Worker: Notification clicked.');
    
    // Get the URL to open from the notification's data payload.
    const urlToOpen = event.notification.data.url;
    
    // Close the notification.
    event.notification.close();

    // Tell the browser to open the correct patient profile window.
    event.waitUntil(
        clients.openWindow(urlToOpen)
    );

});

