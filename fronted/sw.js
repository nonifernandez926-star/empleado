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
