
const CACHE_NAME = 'kardex-pro-cache-v2';
const urlsToCache = [
  // Core assets
  '/',
  'index.html',
  'manifest.json',
  'icon-192.svg',
  'icon-512.svg',
  'index.tsx', // Cache the main script
  
  // External dependencies (CDNs)
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap',
  'https://esm.sh/react@19.0.0',
  'https://esm.sh/react-dom@19.0.0',
  'https://esm.sh/lucide-react@0.475.0?external=react,react-dom',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching core assets');
        return cache.addAll(urlsToCache).catch(err => {
          console.error('Failed to cache one or more resources:', err);
        });
      })
  );
});

self.addEventListener('fetch', event => {
  // We only want to cache GET requests.
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      // Try to get the resource from the cache.
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        // If it's in the cache, return it.
        return cachedResponse;
      }

      // If it's not in the cache, try to fetch it from the network.
      try {
        const networkResponse = await fetch(event.request);
        // If the fetch is successful, clone the response and store it in the cache.
        if (networkResponse.ok) {
          const responseToCache = networkResponse.clone();
          cache.put(event.request, responseToCache);
        }
        return networkResponse;
      } catch (error) {
        // If the fetch fails (e.g., the user is offline), you can return a fallback response.
        console.error('Fetch failed; returning offline page instead.', error);
        // For now, we just let the browser handle the error.
        // A more advanced implementation could return a fallback offline page:
        // return caches.match('/offline.html');
        return new Response('Network error occurred', {
          status: 408,
          headers: { 'Content-Type': 'text/plain' },
        });
      }
    })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});