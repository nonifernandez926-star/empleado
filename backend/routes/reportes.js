const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const Negocio = require('../models/Negocio');
const ReporteIA = require('../models/ReporteIA');
const { permitir } = require('../utils/limitador');

const MOTIVOS = ['incorrecta', 'ofensiva', 'danina', 'otro'];

// POST /api/reportes/ia/:codigoPublico { respuesta, motivo, comentario }
// Lo usa el cliente del chat con el botón "Reportar" que hay debajo de cada respuesta de la IA.
router.post('/ia/:codigoPublico', async (req, res) => {
  try {
    if (!permitir(`reporte-ia|${req.ip}`, 15, 3600 * 1000)) return res.status(429).json({ error: 'Enviaste varios reportes seguidos. Probá más tarde.' });
    const respuesta = String(req.body?.respuesta || '').trim().slice(0, 4000);
    if (respuesta.length < 2) return res.status(400).json({ error: 'Falta la respuesta que querés reportar.' });
    const motivo = MOTIVOS.includes(req.body?.motivo) ? req.body.motivo : 'otro';
    const comentario = String(req.body?.comentario || '').trim().slice(0, 500);
    const negocio = await Negocio.findOne({ codigoPublico: req.params.codigoPublico }).select('_id codigoPublico');
    if (!negocio) return res.status(404).json({ error: 'No encontramos este asistente.' });

    await ReporteIA.create({ negocioId: negocio._id, codigoPublico: negocio.codigoPublico, respuesta, motivo, comentario });
    if (process.env.SOPORTE_AVISO_URL) {
      fetch(process.env.SOPORTE_AVISO_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: `Reporte de respuesta de IA (${motivo}) en el asistente ${negocio.codigoPublico}: ${respuesta.slice(0, 200)}` }) }).catch(() => null);
    }
    res.status(201).json({ ok: true });
  } catch (error) {
    console.error('Error guardando reporte de IA:', error.message);
    res.status(500).json({ error: 'No se pudo enviar el reporte. Probá de nuevo.' });
  }
});

// GET /api/reportes/admin?estado=nuevo   (header x-clave-soporte, la misma clave del panel de soporte)
function claveValida(req) {
  const esperada = process.env.SOPORTE_ADMIN_KEY || '';
  const recibida = String(req.headers['x-clave-soporte'] || '');
  if (!esperada || esperada.length < 12 || recibida.length !== esperada.length) return false;
  return crypto.timingSafeEqual(Buffer.from(recibida), Buffer.from(esperada));
}
router.get('/admin', async (req, res) => {
  if (!permitir(`reportes-admin|${req.ip}`, 30, 15 * 60 * 1000)) return res.status(429).json({ error: 'Demasiados intentos.' });
  if (!claveValida(req)) return res.status(401).json({ error: 'Clave incorrecta o sin configurar.' });
  const filtro = req.query.estado === 'revisado' ? { estado: 'revisado' } : { estado: 'nuevo' };
  res.json(await ReporteIA.find(filtro).sort({ createdAt: -1 }).limit(100));
});
router.post('/admin/:id/revisado', async (req, res) => {
  if (!claveValida(req)) return res.status(401).json({ error: 'Clave incorrecta o sin configurar.' });
  await ReporteIA.updateOne({ _id: req.params.id }, { $set: { estado: 'revisado' } });
  res.json({ ok: true });
});

module.exports = router;
