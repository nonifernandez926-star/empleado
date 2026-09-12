const express = require('express');
const router = express.Router();
const Negocio = require('../models/Negocio');
const { requiereAdmin } = require('../middleware/auth');

const PLANES = {
  '1_mes': { meses: 1, label: '1 mes', precio: Number(process.env.PRECIO_1_MES || 20000) },
  '3_meses': { meses: 3, label: '3 meses', precio: Number(process.env.PRECIO_3_MESES || 54000) },
  '5_meses': { meses: 5, label: '5 meses', precio: Number(process.env.PRECIO_5_MESES || 80000) },
};

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
          success: `${process.env.FRONTEND_URL}/admin.html`,
          failure: `${process.env.FRONTEND_URL}/admin.html`,
          pending: `${process.env.FRONTEND_URL}/admin.html`,
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

    const { client, Payment } = require('../config/mercadopago');
    const payment = new Payment(client);
    const pago = await payment.get({ id: paymentId });

    if (pago.status === 'approved') {
      const [negocioId, plan] = (pago.external_reference || '').split(':');
      const planElegido = PLANES[plan];
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
