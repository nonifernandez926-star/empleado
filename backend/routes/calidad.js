const express = require('express');
const router = express.Router();
const CasoCalidad = require('../models/CasoCalidad');
const EvaluacionCalidad = require('../models/EvaluacionCalidad');
const PreguntaFrecuente = require('../models/PreguntaFrecuente');
const Conversacion = require('../models/Conversacion');
const { requiereAdmin } = require('../middleware/auth');
const { permitir } = require('../utils/limitador');
const { evaluarNegocio } = require('../utils/calidad');

const publico = (c) => ({
  id: c._id, tipo: c.tipo, severidad: c.severidad, titulo: c.titulo, detalle: c.detalle, mensajeCliente: c.mensajeCliente, respuestaAsistente: c.respuestaAsistente,
  veces: c.veces, atajo: c.atajo, estado: c.estado, origen: c.origen, fecha: c.createdAt,
});

// GET /api/calidad -> cómo está el asistente + los casos para revisar
router.get('/', requiereAdmin, async (req, res) => {
  try {
    const negocioId = req.negocio._id;
    const [casos, historial, conteos, preguntasSinResponder, conversacionesSemana] = await Promise.all([
      CasoCalidad.find({ negocioId, estado: 'nuevo' }).sort({ createdAt: -1 }).limit(60).lean(),
      EvaluacionCalidad.find({ negocioId }).sort({ createdAt: -1 }).limit(12).lean(),
      CasoCalidad.aggregate([{ $match: { negocioId } }, { $group: { _id: '$estado', n: { $sum: 1 } } }]),
      PreguntaFrecuente.countDocuments({ negocioId, respuesta: '' }),
      Conversacion.countDocuments({ negocioId, updatedAt: { $gte: new Date(Date.now() - 7 * 86400000) } }),
    ]);
    const orden = { alta: 0, media: 1, baja: 2 };
    casos.sort((a, b) => orden[a.severidad] - orden[b.severidad]);
    const c = {}; conteos.forEach((x) => { c[x._id] = x.n; });
    const cal = req.negocio.calidad || {};
    res.json({
      config: { auto: cal.auto !== false, frecuencia: cal.frecuencia || 'semanal' },
      ultima: cal.ultimaEvaluacion ? { fecha: cal.ultimaEvaluacion, puntaje: cal.ultimoPuntaje, resumen: cal.ultimoResumen || '', conversaciones: cal.ultimasRevisadas || 0, conIA: cal.usoIA !== false } : null,
      historial: historial.reverse().map((h) => ({ fecha: h.createdAt, puntaje: h.puntaje })),
      conteos: { nuevo: c.nuevo || 0, resuelto: c.resuelto || 0, ignorado: c.ignorado || 0 },
      porSeveridad: { alta: casos.filter((x) => x.severidad === 'alta').length, media: casos.filter((x) => x.severidad === 'media').length, baja: casos.filter((x) => x.severidad === 'baja').length },
      preguntasSinResponder, conversacionesSemana,
      casos: casos.map(publico),
    });
  } catch (error) {
    console.error('Error en calidad:', error);
    res.status(500).json({ error: 'No se pudo cargar el control de calidad' });
  }
});

// GET /api/calidad/casos?estado=resuelto|ignorado
router.get('/casos', requiereAdmin, async (req, res) => {
  try {
    const estado = ['resuelto', 'ignorado'].includes(req.query.estado) ? req.query.estado : 'nuevo';
    const casos = await CasoCalidad.find({ negocioId: req.negocio._id, estado }).sort({ updatedAt: -1 }).limit(60).lean();
    res.json(casos.map(publico));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudieron cargar los casos' });
  }
});

// POST /api/calidad/evaluar -> revisa ahora las últimas conversaciones
router.post('/evaluar', requiereAdmin, async (req, res) => {
  try {
    if (!permitir(`calidad|${req.negocio._id}`, 3, 3600 * 1000)) return res.status(429).json({ error: 'Ya revisaste hace poco. Probá de nuevo en un rato.' });
    const resultado = await evaluarNegocio(req.negocio, { disparo: 'manual', dias: 14 });
    res.json(resultado);
  } catch (error) {
    console.error('Error evaluando calidad:', error);
    res.status(500).json({ error: 'No se pudo completar la revisión. Probá de nuevo.' });
  }
});

// PUT /api/calidad/casos/:id { estado: 'resuelto' | 'ignorado' | 'nuevo' }
router.put('/casos/:id', requiereAdmin, async (req, res) => {
  try {
    if (!['resuelto', 'ignorado', 'nuevo'].includes(req.body?.estado)) return res.status(400).json({ error: 'Estado inválido' });
    const c = await CasoCalidad.findOneAndUpdate({ _id: req.params.id, negocioId: req.negocio._id }, { $set: { estado: req.body.estado } }, { new: true });
    if (!c) return res.status(404).json({ error: 'Caso no encontrado' });
    res.json(publico(c));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo actualizar el caso' });
  }
});

// POST /api/calidad/casos/:id/faq { respuesta }  -> atajo: el dueño responde la pregunta y el asistente la aprende
router.post('/casos/:id/faq', requiereAdmin, async (req, res) => {
  try {
    const respuesta = String(req.body?.respuesta || '').trim().slice(0, 1200);
    if (respuesta.length < 3) return res.status(400).json({ error: 'Escribí la respuesta para guardarla.' });
    const caso = await CasoCalidad.findOne({ _id: req.params.id, negocioId: req.negocio._id });
    if (!caso) return res.status(404).json({ error: 'Caso no encontrado' });
    const pregunta = String((caso.atajo && caso.atajo.pregunta) || caso.mensajeCliente || caso.titulo).trim().slice(0, 300);
    let faq = await PreguntaFrecuente.findOne({ negocioId: req.negocio._id, pregunta });
    if (faq) { faq.respuesta = respuesta; await faq.save(); }
    else faq = await PreguntaFrecuente.create({ negocioId: req.negocio._id, pregunta, respuesta });
    caso.estado = 'resuelto'; await caso.save();
    res.json({ ok: true, caso: publico(caso) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo guardar la respuesta' });
  }
});

module.exports = router;
