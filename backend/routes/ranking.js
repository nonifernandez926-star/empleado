const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');
const Conversacion = require('../models/Conversacion');
const { requiereAdmin } = require('../middleware/auth');

const CRITERIOS_VALIDOS = ['dinero', 'compras', 'visitas', 'fidelidad'];

// Devuelve el TOP 10 de clientes de un negocio segun el criterio pedido.
async function calcularTop10(negocioId, criterio) {
  if (criterio === 'visitas') {
    // "Visitas" = cantidad de conversaciones distintas que tuvo ese cliente con el negocio
    const agregado = await Conversacion.aggregate([
      { $match: { negocioId } },
      { $group: { _id: '$sesionClienteId', visitas: { $sum: 1 } } },
      { $sort: { visitas: -1 } },
      { $limit: 10 },
    ]);
    const clientes = await Cliente.find({ negocioId, sesionClienteId: { $in: agregado.map((a) => a._id) } }).lean();
    const porSesion = {};
    clientes.forEach((c) => { porSesion[c.sesionClienteId] = c; });
    return agregado.map((a) => ({
      sesionClienteId: a._id,
      nombre: porSesion[a._id] ? porSesion[a._id].nombre : null,
      valor: a.visitas,
    }));
  }

  let campoOrden = 'totalPedidos';
  if (criterio === 'dinero') campoOrden = 'totalGastado';
  if (criterio === 'fidelidad') campoOrden = 'createdAt'; // mas antiguo = mas fiel

  const orden = criterio === 'fidelidad' ? { [campoOrden]: 1 } : { [campoOrden]: -1 };

  const clientes = await Cliente.find({ negocioId })
    .sort(criterio === 'compras' ? { totalPedidos: -1, totalTurnos: -1 } : orden)
    .limit(10)
    .lean();

  return clientes.map((c) => ({
    sesionClienteId: c.sesionClienteId,
    nombre: c.nombre || null,
    valor: criterio === 'dinero' ? c.totalGastado
      : criterio === 'fidelidad' ? c.createdAt
      : (c.totalPedidos || 0) + (c.totalTurnos || 0),
  }));
}

// GET /api/ranking?criterio=compras -> TOP 10 de clientes del negocio segun el criterio elegido
router.get('/', requiereAdmin, async (req, res) => {
  try {
    const criterio = CRITERIOS_VALIDOS.includes(req.query.criterio) ? req.query.criterio : 'compras';
    const top10 = await calcularTop10(req.negocio._id, criterio);
    res.json({ criterio, top10, config: req.negocio.ranking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al calcular el ranking' });
  }
});

// PUT /api/ranking/config -> el dueño elige el criterio "oficial" (el que usa el asistente para
// avisarle al cliente si esta en el top 3) y el premio (texto + % descuento opcional) por puesto
router.put('/config', requiereAdmin, async (req, res) => {
  try {
    const { criterioActivo, premios } = req.body;
    if (criterioActivo && CRITERIOS_VALIDOS.includes(criterioActivo)) {
      req.negocio.ranking.criterioActivo = criterioActivo;
    }
    if (premios) {
      ['top1', 'top2', 'top3'].forEach((puesto) => {
        if (premios[puesto]) {
          req.negocio.ranking.premios[puesto] = {
            texto: String(premios[puesto].texto || '').trim(),
            descuentoPorcentaje: Math.min(100, Math.max(0, Number(premios[puesto].descuentoPorcentaje) || 0)),
          };
        }
      });
    }
    await req.negocio.save();
    res.json({ mensaje: 'Configuración guardada', negocio: req.negocio });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al guardar la configuración del ranking' });
  }
});

module.exports = router;
module.exports.calcularTop10 = calcularTop10;
