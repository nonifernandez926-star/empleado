// Este archivo corre "en segundo plano", separado de la página. Por eso puede mostrar una notificación
// aunque la persona tenga la web cerrada: quien lo despierta no es nuestra web, es el sistema operativo
// cuando llega un push. Sirve para dos públicos:
//  - clientes del chat (avisos de su pedido o de la fila)
//  - el dueño del negocio (pedidos, turnos, comprobantes, reseñas, suscripción...), con rol: 'dueno'

self.addEventListener('push', (event) => {
  let datos = { titulo: 'Tenés un mensaje nuevo', cuerpo: '', url: '/' };
  try { datos = { ...datos, ...event.data.json() }; } catch (error) { /* si no viene JSON, usamos los valores por defecto */ }

  const opciones = {
    body: datos.cuerpo,
    icon: '/img/icono-192.png',
    badge: '/img/icono-96.png',
    data: { url: datos.url || '/', rol: datos.rol || 'cliente' },
  };
  if (datos.tag) { opciones.tag = datos.tag; opciones.renotify = true; } // varios avisos del mismo tipo se agrupan en uno
  if (datos.rol === 'dueno') opciones.vibrate = [120, 60, 120];

  event.waitUntil(self.registration.showNotification(datos.titulo, opciones));
});

// Al tocar la notificación: si ya hay una pestaña abierta la enfoca (y, en el panel del dueño, la lleva a la pantalla del aviso)
// en vez de abrir una nueva (evita juntar 5 pestañas).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const url = data.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((listaClientes) => {
      if (data.rol === 'dueno') {
        const panel = listaClientes.find((c) => c.url.includes('/admin.html'));
        if (panel) {
          const destino = new URL(url, self.location.origin).searchParams.get('ir');
          panel.postMessage({ tipo: 'ir', destino });
          return panel.focus();
        }
        return self.clients.openWindow(url);
      }
      const existente = listaClientes.find((c) => c.url.includes(url));
      if (existente) return existente.focus();
      return self.clients.openWindow(url);
    })
  );
});

// ---------- Caché y modo sin conexión ----------
// Guardamos solo la "estructura" (páginas, estilos, scripts, íconos) para que la app abra rápido y muestre
// una pantalla clara cuando no hay internet. Los datos (pedidos, chats, etc.) viven en la API, en otro dominio:
// NUNCA se guardan acá.
const VERSION = 'v3';
const CACHE = 'mi-asistente-' + VERSION;
const PRECACHE = ['/offline.html', '/css/style.css', '/img/icono-192.png', '/img/icono-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((claves) => Promise.all(claves.filter((k) => k.startsWith('mi-asistente-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // la API y Google no se tocan
  if (url.pathname === '/sw.js') return;

  // Páginas: primero la red; si no hay conexión, la pantalla "Sin conexión"
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match('/offline.html')));
    return;
  }
  // Estilos, scripts, íconos: devolver lo guardado al instante y actualizarlo en segundo plano
  if (/\.(css|js|png|jpg|jpeg|svg|webp|ico|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then((c) => c.match(req).then((guardado) => {
        const red = fetch(req).then((r) => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => guardado);
        return guardado || red;
      }))
    );
  }
});

