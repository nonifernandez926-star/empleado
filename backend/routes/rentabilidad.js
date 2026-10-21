const express = require('express');
const router = express.Router();
const Gasto = require('../models/Gasto');
const { requiereAdmin } = require('../middleware/auth');
const { calcular } = require('../utils/rentabilidad');

const CATEGORIAS = ['alquiler', 'sueldos', 'servicios', 'marketing', 'insumos', 'impuestos', 'otros'];

// GET /api/rentabilidad?dias=30
router.get('/', requiereAdmin, async (req, res) => {
  try {
    const dias = [7, 30, 90, 365].includes(Number(req.query.dias)) ? Number(req.query.dias) : 30;
    res.json(await calcular(req.negocio, dias));
  } catch (error) {
    console.error('Error calculando rentabilidad:', error);
    res.status(500).json({ error: 'No se pudo calcular la rentabilidad' });
  }
});

// ---- Gastos del negocio ----
router.get('/gastos', requiereAdmin, async (req, res) => {
  try {
    const gastos = await Gasto.find({ negocioId: req.negocio._id }).sort({ activo: -1, createdAt: -1 }).limit(200).lean();
    const mensual = gastos.filter((g) => g.activo && g.frecuencia === 'mensual').reduce((a, g) => a + g.monto, 0);
    res.json({ gastos, totalMensual: mensual });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudieron cargar los gastos' });
  }
});

function limpiar(body) {
  const concepto = String(body.concepto || '').trim().slice(0, 80);
  const monto = Number(body.monto);
  if (!concepto) return { error: 'Escribí en qué es el gasto.' };
  if (!Number.isFinite(monto) || monto < 0 || monto > 1e9) return { error: 'El monto tiene que ser un número de 0 en adelante.' };
  const datos = { concepto, monto, categoria: CATEGORIAS.includes(body.categoria) ? body.categoria : 'otros', frecuencia: body.frecuencia === 'unico' ? 'unico' : 'mensual' };
  if (body.desde) { const d = new Date(body.desde); if (!isNaN(d)) datos.desde = d; }
  if (body.activo !== undefined) datos.activo = !!body.activo;
  return { datos };
}

router.post('/gastos', requiereAdmin, async (req, res) => {
  try {
    const r = limpiar(req.body || {});
    if (r.error) return res.status(400).json({ error: r.error });
    if ((await Gasto.countDocuments({ negocioId: req.negocio._id })) >= 200) return res.status(400).json({ error: 'Llegaste al máximo de gastos cargados.' });
    res.status(201).json(await Gasto.create({ negocioId: req.negocio._id, ...r.datos }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo guardar el gasto' });
  }
});

router.put('/gastos/:id', requiereAdmin, async (req, res) => {
  try {
    const r = limpiar({ concepto: 'x', monto: 0, ...req.body });
    if (req.body.concepto !== undefined || req.body.monto !== undefined) { const v = limpiar(req.body); if (v.error) return res.status(400).json({ error: v.error }); }
    const cambios = {};
    ['concepto', 'monto', 'categoria', 'frecuencia', 'desde', 'activo'].forEach((k) => { if (req.body[k] !== undefined && r.datos[k] !== undefined) cambios[k] = r.datos[k]; });
    const g = await Gasto.findOneAndUpdate({ _id: req.params.id, negocioId: req.negocio._id }, { $set: cambios }, { new: true });
    if (!g) return res.status(404).json({ error: 'Gasto no encontrado' });
    res.json(g);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo actualizar el gasto' });
  }
});

router.delete('/gastos/:id', requiereAdmin, async (req, res) => {
  try {
    const g = await Gasto.findOneAndDelete({ _id: req.params.id, negocioId: req.negocio._id });
    if (!g) return res.status(404).json({ error: 'Gasto no encontrado' });
    res.json({ ok: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo borrar el gasto' });
  }
});

module.exports = router;
