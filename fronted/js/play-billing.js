// Compras con Google Play Billing desde la app de Play Store (una Trusted Web Activity).
// Se usan dos APIs del navegador: la Digital Goods API (precios reales y consumir la compra) y la Payment Request API (para pagar).
// Fuera de la app de Play Store (la web común) NO hay forma de pagar: Google exige que todo cobro de bienes digitales pase por Play Billing.
const PLAY_BILLING = 'https://play.google.com/billing';

async function playServicio() {
  try {
    if (typeof window === 'undefined' || !('getDigitalGoodsService' in window)) return null;
    return await window.getDigitalGoodsService(PLAY_BILLING);
  } catch (e) { return null; }
}

async function playDisponible() { return !!(await playServicio()); }

// Precios reales que cobra Google Play en el país de la persona. Devuelve { [productoId]: '$ 20.000' } (vacío si no se pudo)
async function playPrecios(ids) {
  const s = await playServicio();
  if (!s) return {};
  try {
    const detalles = await s.getDetails(ids);
    const salida = {};
    for (const d of detalles || []) {
      const v = Number(d.price && d.price.value);
      if (Number.isFinite(v)) salida[d.itemId] = new Intl.NumberFormat('es-AR', { style: 'currency', currency: (d.price && d.price.currency) || 'ARS', maximumFractionDigits: 0 }).format(v);
    }
    return salida;
  } catch (e) { return {}; }
}

// Abre la pantalla de pago de Google Play. Devuelve { token, terminar(ok) } o lanza un Error con un mensaje claro.
// Después de que el SERVIDOR confirme la compra con Google, hay que llamar a terminar(true) (consume la compra y cierra el pago).
async function playPagar(productoId) {
  const s = await playServicio();
  if (!s) throw new Error('Para comprar un plan abrí Mi Asistente desde la app de Google Play.');
  const pedido = new PaymentRequest(
    [{ supportedMethods: PLAY_BILLING, data: { sku: productoId } }],
    { total: { label: 'Total', amount: { currency: 'ARS', value: '0' } } }
  );
  let respuesta;
  try { respuesta = await pedido.show(); }
  catch (e) {
    if (e && (e.name === 'AbortError' || e.name === 'NotAllowedError')) { const c = new Error('Cancelaste la compra. No se cobró nada.'); c.cancelada = true; throw c; }
    throw new Error('No se pudo abrir Google Play. Probá de nuevo en un momento.');
  }
  const token = respuesta.details && (respuesta.details.purchaseToken || respuesta.details.token);
  if (!token) { try { await respuesta.complete('fail'); } catch (e) { /* nada */ } throw new Error('Google Play no devolvió el comprobante. No se cobró nada.'); }
  return {
    token,
    terminar: async (ok) => {
      try { if (ok) await s.consume(token); } catch (e) { /* si no se pudo consumir, la próxima compra del mismo plan lo va a avisar */ }
      try { await respuesta.complete(ok ? 'success' : 'fail'); } catch (e) { /* nada */ }
    },
  };
}

// ¿Quedó una compra hecha en Google Play que todavía no se activó? (se cortó la conexión justo después de pagar)
// Devuelve { productId, token, consumir() } o null.
async function playCompraPendiente(ids) {
  const s = await playServicio();
  if (!s || !s.listPurchases) return null;
  try {
    const poseidas = (await s.listPurchases()) || [];
    const nuestra = poseidas.find((x) => ids.includes(x.itemId));
    if (!nuestra) return null;
    return { productId: nuestra.itemId, token: nuestra.purchaseToken, consumir: async () => { try { await s.consume(nuestra.purchaseToken); } catch (e) { /* nada */ } } };
  } catch (e) { return null; }
}
