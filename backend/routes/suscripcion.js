const express = require('express');
const router = express.Router();
const Negocio = require('../models/Negocio');
const { requiereAdmin } = require('../middleware/auth');
const { webhookEsValido } = require('../utils/firmaWebhookMP');

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

// GET /api/suscripcion/planes -> info pública de los planes (para mostrar precios en el panel)
router.get('/planes', (req, res) => {
  res.json(PLANES);
});

// POST /api/suscripcion/crear-pago -> genera el link de pago de Mercado Pago para el plan elegido
router.post('/crear-pago', requiereAdmin, async (req, res) => {
  try {
    if (!process.env.MP_ACCESS_TOKEN) {
      return res.status(503).json({ error: 'El cobro con Mercado Pago todavía no está configurado en el servidor.' });
    }

    const { plan } = req.body;
    const planElegido = PLANES[plan];
    if (!planElegido) return res.status(400).json({ error: 'Plan inválido' });

    // Import diferido: si no hay token configurado, ni siquiera hace falta cargar el SDK
    const { client, Preference } = require('../config/mercadopago');
    const preference = new Preference(client);

    const nombreNegocio = req.negocio.formData?.nombreNegocio || 'tu negocio';

    const resultado = await preference.create({
      body: {
        items: [
          {
            title: `Suscripción Empleado Virtual IA - ${planElegido.label} (${nombreNegocio})`,
            quantity: 1,
            unit_price: planElegido.precio,
            currency_id: 'ARS',
          },
        ],
        external_reference: `${req.negocio._id}:${plan}`,
        notification_url: `${process.env.BACKEND_URL}/api/suscripcion/webhook`,
        back_urls: {
          success: `${process.env.FRONTEND_URL}/admin.html?pago=exito`,
          failure: `${process.env.FRONTEND_URL}/admin.html?pago=fallo`,
          pending: `${process.env.FRONTEND_URL}/admin.html?pago=pendiente`,
        },
        auto_return: 'approved',
      },
    });

    res.json({ initPoint: resultado.init_point });
  } catch (error) {
    console.error('Error creando preferencia de pago:', error);
    res.status(500).json({ error: 'No se pudo generar el link de pago' });
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

      if (negocio && planElegido) {
        const ahora = new Date();
        // Si todavía le quedaba tiempo activo, sumamos el plan nuevo a partir de ahí (no se pierde lo pagado antes)
        const baseFecha = negocio.suscripcion.fechaVencimiento && negocio.suscripcion.fechaVencimiento > ahora
          ? new Date(negocio.suscripcion.fechaVencimiento)
          : ahora;

        baseFecha.setMonth(baseFecha.getMonth() + planElegido.meses);

        negocio.suscripcion.estado = 'activa';
        negocio.suscripcion.plan = plan;
        negocio.suscripcion.fechaInicio = negocio.suscripcion.fechaInicio || ahora;
        negocio.suscripcion.fechaVencimiento = baseFecha;
        negocio.suscripcion.ultimoPagoId = String(paymentId);
        await negocio.save();
      }
    }

    res.sendStatus(200);
  } catch (error) {
    console.error('Error procesando webhook de Mercado Pago:', error);
    res.sendStatus(200); // igual respondemos 200 para que MP no reintente en loop
  }
});

module.exports = router;
