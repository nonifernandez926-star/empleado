const express = require('express');
const router = express.Router();
const Negocio = require('../models/Negocio');
const PushSuscripcion = require('../models/PushSuscripcion');
const { VAPID_PUBLIC_KEY, estaConfigurado } = require('../utils/push');

// GET /api/push/clave-publica -> la clave pública VAPID que necesita el navegador del cliente
// para suscribirse. Es pública a propósito (la privada nunca sale del servidor).
router.get('/clave-publica', (req, res) => {
  if (!estaConfigurado()) return res.status(503).json({ error: 'Los avisos push todavía no están configurados.' });
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// POST /api/push/suscribirse -> guarda (o actualiza) la suscripción de este cliente para este negocio.
// La llama el chat del cliente, sin login: se identifica con el mismo sesionClienteId de siempre.
router.post('/suscribirse', async (req, res) => {
  try {
    const { codigoPublico, sesionClienteId, subscription } = req.body;
    if (!codigoPublico || !sesionClienteId || !subscription || !subscription.endpoint) {
      return res.status(400).json({ error: 'Faltan datos de la suscripción.' });
    }

    const negocio = await Negocio.findOne({ codigoPublico, activo: true }).select('_id');
    if (!negocio) return res.status(404).json({ error: 'Negocio no encontrado.' });

    await PushSuscripcion.findOneAndUpdate(
      { negocioId: negocio._id, endpoint: subscription.endpoint },
      { negocioId: negocio._id, sesionClienteId, endpoint: subscription.endpoint, subscription },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo guardar la suscripción.' });
  }
});

module.exports = router;
