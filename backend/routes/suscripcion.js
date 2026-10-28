const express = require('express');
const router = express.Router();
const Negocio = require('../models/Negocio');
const { requiereAdmin } = require('../middleware/auth');
const { webhookEsValido } = require('../utils/firmaWebhookMP');
const Compra = require('../models/Compra');
const { playConfigurado, verificarCompra, reconocerCompra, hashToken } = require('../utils/playBilling');
const { permitir } = require('../utils/limitador');

// FRONTEND_URL puede traer varias direcciones separadas por coma: para volver del pago se usa la primera
const FRONTEND_PRINCIPAL = (process.env.FRONTEND_URL || '').split(',')[0].trim().replace(/\/$/, '');
const PRECIO_MENSUAL_BASE = Number(process.env.PRECIO_1_MES || 20000);

// Planes que se ofrecen hoy. Los precios finales salen del .env (con estos valores por defecto).
const PLANES = {
  '1_mes': { meses: 1, label: 'Plan Mensual', precio: Number(process.env.PRECIO_1_MES || 20000) },
  '3_meses': { meses: 3, label: 'Plan Trimestral', precio: Number(process.env.PRECIO_3_MESES || 54000) },
  '6_meses': { meses: 6, label: 'Plan Semestral', precio: Number(process.env.PRECIO_6_MESES || 96000) },
};

// Plan viejo que ya no se vende, pero lo dejamos por si un negocio ya pagó uno o llega un webhook tardío.
const PLANES_LEGACY = {
  '5_meses': { meses: 5, label: '5 meses', precio: Number(process.env.PRECIO_5_MESES || 80000) },
};

// A cada plan le calculamos lo que el panel necesita mostrar (precio por mes, descuento y ahorro).
Object.values(PLANES).forEach((plan) => {
  const precioSinDescuento = PRECIO_MENSUAL_BASE * plan.meses;
  plan.precioPorMes = Math.round(plan.precio / plan.meses);
  plan.precioSinDescuento = precioSinDescuento;
  plan.ahorro = Math.max(0, precioSinDescuento - plan.precio);
  plan.descuentoPorcentaje = precioSinDescuento > 0 ? Math.round((plan.ahorro / precioSinDescuento) * 100) : 0;
});

// Ids de los productos "de un solo pago" (consumibles) que hay que crear en Play Console, uno por plan.
const PRODUCTO_POR_PLAN = { '1_mes': 'miasistente_1m', '3_meses': 'miasistente_3m', '6_meses': 'miasistente_6m' };
Object.entries(PRODUCTO_POR_PLAN).forEach(([plan, id]) => { PLANES[plan].productoId = id; });
const PLAN_POR_PRODUCTO = Object.fromEntries(Object.entries(PRODUCTO_POR_PLAN).map(([plan, id]) => [id, plan]));

// Suma los meses de un plan a la suscripción del negocio. Si todavía le quedaba tiempo activo, se suma a partir de ahí (no se pierde lo pagado antes).
// Es lo mismo para Google Play y para un aviso tardío de Mercado Pago. Devuelve { antes, despues } (fechas de vencimiento).
async function sumarPlan(negocio, plan, meses, referenciaPago) {
  const ahora = new Date();
  const antes = negocio.suscripcion.fechaVencimiento || null;
  const base = antes && antes > ahora ? new Date(antes) : ahora;
  const despues = new Date(base);
  despues.setMonth(despues.getMonth() + meses);
  negocio.suscripcion.estado = 'activa';
  negocio.suscripcion.plan = plan;
  negocio.suscripcion.fechaInicio = negocio.suscripcion.fechaInicio || ahora;
  negocio.suscripcion.fechaVencimiento = despues;
  negocio.suscripcion.ultimoPagoId = String(referenciaPago);
  await negocio.save();
  return { antes, despues };
}

// GET /api/suscripcion/planes -> info pública de los planes (para mostrar precios en el panel; el cobro real lo hace Google Play)
router.get('/planes', (req, res) => {
  res.json(PLANES);
});

// POST /api/suscripcion/crear-pago -> YA NO SE USA: se cobra con Google Play Billing (ver /compra). Se deja respondiendo un aviso claro
// por si una versión vieja del panel todavía lo llama.
router.post('/crear-pago', requiereAdmin, (req, res) => {
  res.status(410).json({ error: 'El pago ahora se hace con Google Play, desde la app de Mi Asistente. Actualizá la app y probá de nuevo.' });
});

// POST /api/suscripcion/compra   { productId, purchaseToken }
// La app compra con Google Play Billing y manda acá el comprobante. El SERVIDOR le pregunta a Google si la compra es real antes de
// sumar nada. Cada comprobante sirve una sola vez. Los meses se suman al vencimiento actual (no se pierde lo que quedaba).
router.post('/compra', requiereAdmin, async (req, res) => {
  try {
    const negocio = req.negocio;
    if (!permitir(`compra:${negocio._id}`, 30, 3600 * 1000)) return res.status(429).json({ error: 'Demasiados intentos. Esperá un rato y probá de nuevo.' });
    const { productId, purchaseToken } = req.body || {};
    const plan = PLAN_POR_PRODUCTO[String(productId)];
    if (!plan) return res.status(400).json({ error: 'Producto inválido.' });
    if (typeof purchaseToken !== 'string' || purchaseToken.length < 10 || purchaseToken.length > 4096) return res.status(400).json({ error: 'Comprobante inválido.' });
    if (!playConfigurado()) return res.status(503).json({ error: 'El cobro con Google Play todavía no está configurado en el servidor.' });

    const tokenHash = hashToken(purchaseToken);
    const previa = await Compra.findOne({ tokenHash }).lean();
    if (previa) {
      if (previa.negocioId !== String(negocio._id)) return res.status(409).json({ error: 'Este comprobante ya fue usado.' });
      return res.json({ ok: true, yaAcreditada: true, vence: previa.venceDespues, consumir: true }); // reintento de la app: no se suma otra vez
    }

    let g;
    try { g = await verificarCompra(productId, purchaseToken); }
    catch (e) { console.error('No se pudo consultar a Google Play:', e.message); return res.status(502).json({ error: 'No pudimos verificar la compra con Google en este momento. No se perdió: probá de nuevo en unos minutos.' }); }
    if (g.pendiente) return res.status(202).json({ pendiente: true, error: 'Tu pago está pendiente en Google Play. Cuando se confirme, activamos el plan.' });
    if (!g.valida) return res.status(400).json({ error: g.motivo || 'Google no confirmó esta compra.' });

    const meses = PLANES[plan].meses;
    let compra;
    try {
      compra = await Compra.create({ tokenHash, productoId: productId, orderId: g.orderId, negocioId: String(negocio._id), plan, meses });
    } catch (e) {
      if (e.code === 11000) return res.json({ ok: true, yaAcreditada: true, consumir: true }); // dos pedidos a la vez: el otro la acreditó
      throw e;
    }
    let v;
    try { v = await sumarPlan(negocio, plan, meses, `play:${g.orderId || tokenHash.slice(0, 16)}`); }
    catch (e) { await Compra.deleteOne({ _id: compra._id }); throw e; } // no se acreditó: se libera el comprobante para reintentar
    await Compra.updateOne({ _id: compra._id }, { $set: { venciaAntes: v.antes, venceDespues: v.despues } });
    try { if (!g.reconocida) await reconocerCompra(productId, purchaseToken); }
    catch (e) { console.error('No se pudo reconocer la compra (Google la reembolsa si pasan 3 días):', e.message); }
    res.json({ ok: true, vence: v.despues, consumir: true });
  } catch (e) {
    console.error('Error acreditando la compra:', e);
    res.status(500).json({ error: 'No se pudo activar el plan. Si Google te cobró, no pierdas el comprobante: escribinos desde Ayuda.' });
  }
});

// POST /api/suscripcion/webhook -> Mercado Pago avisa acá cuando un pago cambia de estado
router.post('/webhook', async (req, res) => {
  try {
    if (!process.env.MP_ACCESS_TOKEN) return res.sendStatus(200);

    const paymentId = req.body?.data?.id || req.query['data.id'];
    if (!paymentId) return res.sendStatus(200); // notificación de otro tipo, la ignoramos

    // Sin esto, cualquiera podría llamar a esta URL e "inventar" un pago aprobado.
    // La Clave secreta se configura en el Panel de Mercado Pago → Tus integraciones → tu app → Webhooks.
    if (!process.env.MP_WEBHOOK_SECRET) {
      console.warn('MP_WEBHOOK_SECRET no está configurado: el webhook de Mercado Pago no está protegido.');
    }
    const firmaOk = webhookEsValido({
      xSignature: req.headers['x-signature'],
      xRequestId: req.headers['x-request-id'],
      dataId: String(paymentId),
      secret: process.env.MP_WEBHOOK_SECRET,
    });
    if (!firmaOk) {
      console.warn('Webhook de Mercado Pago rechazado: la firma no coincide.');
      return res.sendStatus(401);
    }

    const { client, Payment } = require('../config/mercadopago');
    const payment = new Payment(client);
    const pago = await payment.get({ id: paymentId });

    if (pago.status === 'approved') {
      const [negocioId, plan] = (pago.external_reference || '').split(':');
      const planElegido = PLANES[plan] || PLANES_LEGACY[plan];
      const negocio = await Negocio.findById(negocioId);

      // Mercado Pago puede avisar dos veces del mismo pago: si ya fue el último acreditado, no se suma otra vez
      if (negocio && planElegido && negocio.suscripcion.ultimoPagoId !== String(paymentId)) await sumarPlan(negocio, plan, planElegido.meses, paymentId);
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error procesando webhook de Mercado Pago:', error);
    res.sendStatus(200); // igual respondemos 200 para que MP no reintente en loop
  }
});

module.exports = router;
