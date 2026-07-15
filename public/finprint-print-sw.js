const PRINT_CACHE = 'finprint-generated-print-v1';
const PRINT_PREFIX = '/__finprint_print__/';

self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  if (
    event.request.method === 'GET' &&
    url.origin === self.location.origin &&
    url.pathname.startsWith(PRINT_PREFIX)
  ) {
    event.respondWith(
      caches.open(PRINT_CACHE).then(async (cache) => {
        const response = await cache.match(event.request);
        return response ?? new Response('打印文件已失效，请返回 FinPrint 重新生成。', {
          status: 404,
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'no-store',
          },
        });
      }),
    );
  }
});
