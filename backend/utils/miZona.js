// Avisa a Mi Zona cuando el dueño cambia el estado de un pedido, para que le llegue una notificación al cliente.
// Es "mejor esfuerzo": si Mi Zona no está configurada o no responde, el cambio de estado igual se guarda y nada se rompe.
// Configuración (en el servidor de Mi Asistente):
//   MIZONA_API_URL  dirección del servidor de Mi Zona terminada en /api, ej. https://tu-mizona.onrender.com/api
//   INTEGRACION_KEY la misma clave compartida que ya usa la integración
async function avisarPedidoActualizado(pedido, negocio) {
  const base = process.env.MIZONA_API_URL;
  const clave = process.env.INTEGRACION_KEY;
  if (!base || !clave || typeof fetch !== 'function') return;
  if (!pedido || pedido.esPrueba || !pedido.sesionClienteId) return;
  try {
    const control = new AbortController();
    const corte = setTimeout(() => control.abort(), 10000);
    await fetch(`${base.replace(/\/+$/, '')}/integracion/pedido-estado`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-integracion-key': clave },
      body: JSON.stringify({
        sesionClienteId: pedido.sesionClienteId,
        pedidoId: String(pedido._id),
        estado: pedido.estado,
        negocio: negocio?.nombre || '',
        codigoPublico: negocio?.codigoPublico || '',
      }),
      signal: control.signal,
    });
    clearTimeout(corte);
  } catch (e) {
    console.warn('No se pudo avisar a Mi Zona del cambio de estado del pedido:', e.message);
  }
}

module.exports = { avisarPedidoActualizado };
