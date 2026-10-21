const express = require('express');
const router = express.Router();
const Reclamo = require('../models/Reclamo');
const { requiereAdmin } = require('../middleware/auth');
const { avisarClienteMiZona } = require('../utils/reclamos');

const publico = (r, completo = false) => ({
  id: r._id, tipo: r.tipo, motivo: r.motivo, producto: r.producto, pedidoRef: r.pedidoRef, monto: r.monto ?? null, esComida: !!r.esComida,
  cliente: r.cliente && r.cliente.usuario ? r.cliente.usuario : 'Cliente de Mi Zona',
  estado: r.estado, fecha: r.createdAt, leido: !!r.leidoDueno, cantFotos: (r.fotos || []).length,
  resumen: String(r.descripcion || '').slice(0, 120),
  ...(completo ? { descripcion: r.descripcion, fotos: (r.fotos || []).map((f) => f.url), decision: r.decision, avisadoAlCliente: r.avisadoAlCliente } : {}),
});

// Esta función solo existe para los negocios cuya cuenta ya está en Mi Zona (la misma cuenta / correo)
const vinculado = (negocio) => !!(negocio.miZona && negocio.miZona.vinculado);

// GET /api/reclamos/estado -> ¿aparece la función? + cuántos hay para revisar
router.get('/estado', requiereAdmin, async (req, res) => {
  try {
    if (!vinculado(req.negocio)) return res.json({ disponible: false, nuevos: 0 });
    const nuevos = await Reclamo.countDocuments({ negocioId: req.negocio._id, estado: { $in: ['nuevo', 'en_revision'] } });
    res.json({ disponible: true, nuevos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo consultar' });
  }
});

// GET /api/reclamos?grupo=abiertos|resueltos
router.get('/', requiereAdmin, async (req, res) => {
  try {
    if (!vinculado(req.negocio)) return res.json({ disponible: false, reclamos: [], conteos: {} });
    const grupo = req.query.grupo === 'resueltos' ? 'resueltos' : 'abiertos';
    const filtro = { negocioId: req.negocio._id, estado: { $in: grupo === 'resueltos' ? ['aceptado', 'rechazado'] : ['nuevo', 'en_revision'] } };
    const [lista, abiertos, resueltos, sinLeer] = await Promise.all([
      Reclamo.find(filtro).sort({ createdAt: -1 }).limit(100).lean(),
      Reclamo.countDocuments({ negocioId: req.negocio._id, estado: { $in: ['nuevo', 'en_revision'] } }),
      Reclamo.countDocuments({ negocioId: req.negocio._id, estado: { $in: ['aceptado', 'rechazado'] } }),
      Reclamo.countDocuments({ negocioId: req.negocio._id, leidoDueno: false }),
    ]);
    res.json({ disponible: true, reclamos: lista.map((r) => publico(r)), conteos: { abiertos, resueltos, sinLeer } });
  } catch (error) {
    console.error('Error listando reclamos:', error);
    res.status(500).json({ error: 'No se pudieron cargar los reclamos' });
  }
});

// GET /api/reclamos/:id  (al abrirlo pasa a "en revisión" y queda leído)
router.get('/:id', requiereAdmin, async (req, res) => {
  try {
    if (!vinculado(req.negocio)) return res.status(403).json({ error: 'Esta función se activa cuando tu negocio está en Mi Zona.' });
    const r = await Reclamo.findOne({ _id: req.params.id, negocioId: req.negocio._id });
    if (!r) return res.status(404).json({ error: 'Reclamo no encontrado' });
    let cambio = false;
    if (!r.leidoDueno) { r.leidoDueno = true; cambio = true; }
    if (r.estado === 'nuevo') { r.estado = 'en_revision'; cambio = true; }
    if (cambio) await r.save();
    res.json(publico(r, true));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo abrir el reclamo' });
  }
});

// PUT /api/reclamos/:id/decision { resultado: 'aceptado'|'rechazado', mensaje, solucion? }
// El dueño decide Y explica: sin mensaje no se puede resolver. El mensaje se envía a la persona en Mi Zona.
router.put('/:id/decision', requiereAdmin, async (req, res) => {
  try {
    if (!vinculado(req.negocio)) return res.status(403).json({ error: 'Esta función se activa cuando tu negocio está en Mi Zona.' });
    const { resultado } = req.body || {};
    const mensaje = String(req.body?.mensaje || '').trim().slice(0, 1000);
    if (!['aceptado', 'rechazado'].includes(resultado)) return res.status(400).json({ error: 'Elegí si aceptás o rechazás el reclamo.' });
    if (mensaje.length < 10) return res.status(400).json({ error: 'Escribí un mensaje para el cliente explicando tu decisión (al menos 10 caracteres).' });
    const r = await Reclamo.findOne({ _id: req.params.id, negocioId: req.negocio._id });
    if (!r) return res.status(404).json({ error: 'Reclamo no encontrado' });
    if (['aceptado', 'rechazado'].includes(r.estado)) return res.status(409).json({ error: 'Este reclamo ya tiene una respuesta.' });
    const SOLUCIONES = ['reembolso', 'cambio', 'reposicion', 'compensacion', 'ninguna'];
    let solucion = resultado === 'aceptado' && SOLUCIONES.includes(req.body?.solucion) ? req.body.solucion : (resultado === 'rechazado' ? 'ninguna' : '');
    if (resultado === 'aceptado' && r.esComida && solucion === 'cambio') solucion = 'reembolso'; // en comida no hay cambio de producto: se devuelve el dinero
    r.estado = resultado; r.leidoDueno = true;
    r.decision = { mensaje, solucion, fecha: new Date() };
    await r.save();
    r.avisadoAlCliente = await avisarClienteMiZona(req.negocio, r); // si Mi Zona no responde, igual la consulta posterior la va a ver
    await r.save();
    res.json(publico(r, true));
  } catch (error) {
    console.error('Error resolviendo reclamo:', error);
    res.status(500).json({ error: 'No se pudo guardar tu respuesta' });
  }
});

module.exports = router;
