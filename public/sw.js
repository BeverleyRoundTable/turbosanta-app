const CACHE_NAME = 'sleigh-shell-v9'; // Bumped to v9: festive music player support
const STATIC_ASSETS = [
    'https://turbosanta-app.pages.dev/icons/site_background.png',
    '/icons/RTBI_Santa.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install: Pre-cache core visual assets and force immediate activation
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

// Activate: Clean up all old caches completely
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: Always pass live data through to the network
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. Live API Data & Webhooks: Always bypass cache directly to network (No stale data!)
    if (
        url.pathname.startsWith('/api') || 
        url.hostname.includes('workers.dev') || 
        url.searchParams.has('api') || 
        url.searchParams.has('table') ||
        url.hostname.includes('santaproxy')
    ) {
        return; // Native network fetch without SW interception
    }

    // 2. HTML Navigations: Network-First (Fallback to offline cache only if network is unavailable)
    if (event.request.mode === 'navigate' || (event.request.headers.get('accept') && event.request.headers.get('accept').includes('text/html'))) {
        event.respondWith(
            fetch(event.request).catch(() => caches.match(event.request))
        );
        return;
    }

    // 3. Static Fonts and Images: Cache-First
    if (
        url.hostname.includes('fonts.googleapis.com') || 
        url.hostname.includes('fonts.gstatic.com') || 
        url.hostname.includes('cdnjs.cloudflare.com') ||
        url.hostname.includes('turbosanta-app.pages.dev')
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
});
