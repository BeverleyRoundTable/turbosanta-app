const CACHE_NAME = 'sleigh-shell-v10';
const STATIC_ASSETS = [
    '/icons/site_background.png',
    '/icons/RTBI_Santa.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Install: Best-effort pre-cache of essential visual shell assets without failing SW activation
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            Promise.allSettled(STATIC_ASSETS.map((asset) => cache.add(asset)))
        )
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
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

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

    // 3. Static Fonts, Hashed Bundles & Media: Cache-First (never Cache-First unhashed .js/.css)
    const isFontCdn =
        url.hostname === 'fonts.googleapis.com' ||
        url.hostname === 'fonts.gstatic.com' ||
        url.hostname === 'cdnjs.cloudflare.com';
    const isSameOrPagesOrigin =
        url.origin === self.location.origin ||
        url.hostname === 'turbosanta-app.pages.dev';
    const isHashedAsset = url.origin === self.location.origin && url.pathname.startsWith('/assets/');
    const isStaticMedia = /\.(?:png|jpe?g|webp|gif|svg|ico|mp3|wav|woff2?)$/i.test(url.pathname);

    if (isFontCdn || (isSameOrPagesOrigin && (isHashedAsset || isStaticMedia))) {
        event.respondWith(
            caches.match(event.request).then((cached) => {
                if (cached) return cached;
                return fetch(event.request).then((response) => {
                    if (response && response.ok && (response.type === 'basic' || response.type === 'cors')) {
                        const clone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                    }
                    return response;
                });
            })
        );
    }
});
