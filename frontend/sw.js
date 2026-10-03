// Este archivo corre "en segundo plano", separado de la página del chat. Por eso puede
// mostrar una notificación aunque el cliente tenga el chat cerrado: quien lo despierta
// no es nuestra web, es el sistema operativo, cuando llega un push.

self.addEventListener('push', (event) => {
  let datos = { titulo: 'Tenés un mensaje nuevo', cuerpo: '', url: '/' };
  try { datos = { ...datos, ...event.data.json() }; } catch (error) { /* si no viene JSON, usamos los valores por defecto */ }

  event.waitUntil(
    self.registration.showNotification(datos.titulo, {
      body: datos.cuerpo,
      icon: '/img/icono-192.png',
      badge: '/img/icono-96.png',
      data: { url: datos.url || '/' },
    })
  );
});

// Al tocar la notificación: si ya hay una pestaña de ese chat abierta, la enfoca en vez de
// abrir una nueva (evita juntar 5 pestañas del mismo negocio).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((listaClientes) => {
      const existente = listaClientes.find((c) => c.url.includes(url));
      if (existente) return existente.focus();
      return self.clients.openWindow(url);
    })
  );
});
