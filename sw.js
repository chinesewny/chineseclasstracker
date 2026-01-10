const CACHE_NAME = 'chinese-class-v3'; // Updated version
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './js/main.js',
  './js/utils.js',
  './js/api.js',
  './js/ui.js',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Sarabun:wght@300;400;500;600;700&display=swap',
  'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.js',
  'https://cdn.jsdelivr.net/npm/@sweetalert2/theme-dark@4/dark.css',
  'https://img2.pic.in.th/pic/Logoc404dc85753b800c.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((res) => {
      // Return cached version or fetch new
      return res || fetch(e.request).then(response => {
        // Don't cache non-successful responses
        if(!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }
        
        // Clone the response
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(e.request, responseToCache);
        });
        
        return response;
      });
    }).catch(() => {
      // If both cache and network fail, show offline page
      if(e.request.url.indexOf('.html') > -1) {
        return caches.match('./index.html');
      }
    })
  );
});
