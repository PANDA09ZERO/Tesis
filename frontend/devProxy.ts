import type { ProxyOptions } from 'vite';

// Solo Vite en desarrollo: el navegador ya habla con su mismo origen.
// No trasladar su Origin de LAN a un backend con CORS de producción estricto.
export const configureDevelopmentProxy: NonNullable<ProxyOptions['configure']> = proxy => {
  proxy.on('error', (_error, _request, response) => {
    if (!('writeHead' in response) || response.headersSent || response.writableEnded) return;
    response.writeHead(503, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({
      success: false,
      code: 'DEV_BACKEND_UNAVAILABLE',
      message: 'No se pudo conectar con el backend local. Inicia npm run dev en la carpeta backend y pulsa Reintentar.'
    }));
  });
  proxy.on('proxyReq', (proxyRequest, request) => {
    const origin = request.headers.origin;
    const host = request.headers.host;
    if (!origin || !host) return;
    try {
      const url = new URL(origin);
      if (['http:', 'https:'].includes(url.protocol)
        && url.origin === origin
        && url.host.toLowerCase() === host.toLowerCase()) {
        proxyRequest.removeHeader('origin');
      }
    } catch {
      // Mantener orígenes inválidos/ajenos para que el backend los rechace.
    }
  });
};
