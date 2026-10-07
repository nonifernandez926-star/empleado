const express = require('express');
const router = express.Router();
const Negocio = require('../models/Negocio');
const PushSuscripcion = require('../models/PushSuscripcion');
const { VAPID_PUBLIC_KEY, estaConfigurado, enviarPush } = require('../utils/push');
const { SESION_DUENO } = require('../utils/avisos');
const { requiereAdmin } = require('../middleware/auth');
const { nombreDispositivo } = require('../utils/dispositivo');

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

// ---------- Avisos para el DUEÑO (celular con el panel cerrado) ----------

// GET /api/push/dueno/estado -> cuántos dispositivos del dueño reciben avisos
router.get('/dueno/estado', requiereAdmin, async (req, res) => {
  const dispositivos = await PushSuscripcion.find({ negocioId: req.negocio._id, sesionClienteId: SESION_DUENO }).select('endpoint dispositivo createdAt');
  res.json({ configurado: estaConfigurado(), dispositivos: dispositivos.map((d) => ({ endpoint: d.endpoint, nombre: d.dispositivo, desde: d.createdAt })) });
});

// POST /api/push/dueno/suscribirse { subscription }
router.post('/dueno/suscribirse', requiereAdmin, async (req, res) => {
  try {
    if (!estaConfigurado()) return res.status(503).json({ error: 'Los avisos al celular todavía no están configurados en el servidor.' });
    const { subscription } = req.body || {};
    if (typeof subscription?.endpoint !== 'string' || !/^https:\/\/[^\s]{10,1000}$/.test(subscription.endpoint) || typeof subscription.keys?.p256dh !== 'string' || typeof subscription.keys?.auth !== 'string') {
      return res.status(400).json({ error: 'Faltan datos de la suscripción.' });
    }
    const yaExiste = await PushSuscripcion.exists({ negocioId: req.negocio._id, endpoint: subscription.endpoint });
    if (!yaExiste && (await PushSuscripcion.countDocuments({ negocioId: req.negocio._id, sesionClienteId: SESION_DUENO })) >= 10) {
      return res.status(400).json({ error: 'Ya tenés muchos dispositivos con avisos. Desactivá alguno primero.' });
    }
    const limpia = { endpoint: subscription.endpoint, keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth } };
    await PushSuscripcion.findOneAndUpdate(
      { negocioId: req.negocio._id, endpoint: subscription.endpoint },
      { negocioId: req.negocio._id, sesionClienteId: SESION_DUENO, endpoint: subscription.endpoint, subscription: limpia, dispositivo: nombreDispositivo(req.headers['user-agent']) },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo activar los avisos en este dispositivo.' });
  }
});

// POST /api/push/dueno/cancelar { endpoint }   |   POST /api/push/dueno/cancelar-todos
router.post('/dueno/cancelar', requiereAdmin, async (req, res) => {
  await PushSuscripcion.deleteOne({ endpoint: String(req.body?.endpoint || ''), negocioId: req.negocio._id, sesionClienteId: SESION_DUENO });
  res.json({ ok: true });
});
router.post('/dueno/cancelar-todos', requiereAdmin, async (req, res) => {
  const r = await PushSuscripcion.deleteMany({ negocioId: req.negocio._id, sesionClienteId: SESION_DUENO });
  res.json({ ok: true, eliminados: r.deletedCount });
});

// POST /api/push/dueno/probar -> manda un aviso de prueba a los dispositivos del dueño
router.post('/dueno/probar', requiereAdmin, async (req, res) => {
  const subs = await PushSuscripcion.find({ negocioId: req.negocio._id, sesionClienteId: SESION_DUENO });
  let enviados = 0;
  for (const s of subs) {
    const r = await enviarPush(s.subscription, { titulo: 'Así te van a llegar los avisos', cuerpo: 'Pedidos, turnos, reseñas y más, aunque tengas el panel cerrado.', url: '/admin.html', tag: 'prueba', rol: 'dueno' });
    if (r.ok) enviados++; else if (r.expirada) await PushSuscripcion.deleteOne({ _id: s._id });
  }
  res.json({ enviados });
});

module.exports = router;
