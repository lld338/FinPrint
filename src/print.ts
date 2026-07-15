const PRINT_CACHE = 'finprint-generated-print-v1';
const PRINT_PREFIX = '/__finprint_print__/';

let fallbackPrintUrl: string | null = null;

function createFallbackPrintUrl(blob: Blob) {
  if (fallbackPrintUrl) URL.revokeObjectURL(fallbackPrintUrl);
  fallbackPrintUrl = URL.createObjectURL(blob);
  return fallbackPrintUrl;
}

export async function createPrintUrl(blob: Blob): Promise<string> {
  if (
    !window.isSecureContext ||
    !('serviceWorker' in navigator) ||
    !('caches' in window)
  ) {
    return createFallbackPrintUrl(blob);
  }

  try {
    await navigator.serviceWorker.register('/finprint-print-sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;

    const cache = await caches.open(PRINT_CACHE);
    const oldRequests = await cache.keys();
    await Promise.all(oldRequests.map((request) => cache.delete(request)));

    const printUrl = new URL(
      `${PRINT_PREFIX}${crypto.randomUUID()}.pdf`,
      window.location.origin,
    ).href;

    await cache.put(
      printUrl,
      new Response(blob, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'inline; filename="finprint.pdf"',
          'Cache-Control': 'no-store',
        },
      }),
    );

    return printUrl;
  } catch {
    return createFallbackPrintUrl(blob);
  }
}

export async function clearGeneratedPrintFiles() {
  if ('caches' in window) await caches.delete(PRINT_CACHE);
  if (fallbackPrintUrl) {
    URL.revokeObjectURL(fallbackPrintUrl);
    fallbackPrintUrl = null;
  }
}
