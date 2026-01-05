// Service Worker KILLER
// Este archivo DESACTIVA cualquier service worker existente

self.addEventListener('install', (event) => {
  console.log('🚫 Service Worker: Instalación bloqueada intencionalmente');
  event.waitUntil(Promise.reject(new Error('Service Worker desactivado')));
});

self.addEventListener('activate', (event) => {
  console.log('🚫 Service Worker: Activación bloqueada intencionalmente');
  event.waitUntil(
    Promise.all([
      caches.keys().then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            console.log('🧹 Eliminando cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }),
      self.registration.unregister().then(() => {
        console.log('✅ Service Worker auto-desregistrado');
      })
    ])
  );
});

self.addEventListener('fetch', (event) => {
  console.log('🚫 Service Worker: Fetch bloqueado');
});

console.log('⚠️ Service Worker killer cargado - Este SW se auto-destruirá');