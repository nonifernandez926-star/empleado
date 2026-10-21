const express = require('express');
const router = express.Router();
const Producto = require('../models/Producto');
const CasoCalidad = require('../models/CasoCalidad');
const Reclamo = require('../models/Reclamo');
const PreguntaFrecuente = require('../models/PreguntaFrecuente');
const { requiereAdmin } = require('../middleware/auth');

// GET /api/atencion -> lo que hoy necesita la atención del dueño (solo números, es liviano)
router.get('/', requiereAdmin, async (req, res) => {
  try {
    const negocioId = req.negocio._id;
    const vinculado = !!(req.negocio.miZona && req.negocio.miZona.vinculado);
    const [agotados, bajos, calidad, reclamos, preguntas] = await Promise.all([
      Producto.countDocuments({ negocioId, activo: true, alertaStock: 'agotado' }),
      Producto.countDocuments({ negocioId, activo: true, alertaStock: 'bajo' }),
      CasoCalidad.aggregate([{ $match: { negocioId, estado: 'nuevo' } }, { $group: { _id: '$severidad', n: { $sum: 1 } } }]),
      vinculado ? Reclamo.countDocuments({ negocioId, estado: { $in: ['nuevo', 'en_revision'] } }) : 0,
      PreguntaFrecuente.countDocuments({ negocioId, respuesta: '' }),
    ]);
    const c = {}; calidad.forEach((x) => { c[x._id] = x.n; });
    res.json({
      stock: { agotados, bajos },
      calidad: { total: (c.alta || 0) + (c.media || 0) + (c.baja || 0), alta: c.alta || 0 },
      reclamos: { disponible: vinculado, abiertos: reclamos },
      preguntas,
    });
  } catch (error) {
    console.error('Error en /atencion:', error);
    res.status(500).json({ error: 'No se pudo consultar' });
  }
});

module.exports = router;
