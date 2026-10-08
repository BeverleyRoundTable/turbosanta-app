const CACHE_NAME = 'sleigh-shell-v5'; // Bumped to v4 to force clients to update
const API_CACHE = 'sleigh-api-cache-v1';
const STATIC_ASSETS = [
    'https://brt-23f.pages.dev/icons/site_background.png',
    'https://brt-23f.pages.dev/icons/RTBI_Santa.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install: Pre-cache core visual assets and force the new worker to take over
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate: Clean up the old dummy caches and claim the clients
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME && key !== API_CACHE).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: Serve from cache or network to keep the PWA working offline
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. Stale-while-revalidate Strategy for the Sleigh API and Proxy Data
    // Ensures instant loading of the last known location/routes offline, then updates behind the scenes.
    if (url.hostname.includes('santaproxy') || url.searchParams.has('api')) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const networkFetch = fetch(event.request).then((response) => {
                    const clone = response.clone();
                    caches.open(API_CACHE).then((cache) => cache.put(event.request, clone));
                    return response;
                }).catch(() => cachedResponse); 
                
                return cachedResponse || networkFetch;
            })
        );
        return; // Stop here so it doesn't fall through to the rules below
    }

    // 2. Cache-First Strategy for Fonts and Static Images
    if (
        url.hostname.includes('fonts.googleapis.com') || 
        url.hostname.includes('fonts.gstatic.com') || 
        url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('brt-23f.pages.dev') // Switched from GitHub to Pages
    ) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                return cached || fetch(event.request).then((response) => {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    return response;
                });
            })
        );
        return;
    }

    // 3. Stale-While-Revalidate Strategy for HTML Navigations
    if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
        event.respondWith(
            caches.match(event.request).then((cachedResponse) => {
                const networkFetch = fetch(event.request).then((response) => {
                    if (response.status === 200) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                }).catch(() => null);
                
                return cachedResponse || networkFetch;
            })
        );
        return;
    }
});
