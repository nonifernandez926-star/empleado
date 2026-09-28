const express = require('express');
const router = express.Router();
const Cliente = require('../models/Cliente');
const Conversacion = require('../models/Conversacion');
const { requiereAdmin } = require('../middleware/auth');

const CRITERIOS_VALIDOS = ['dinero', 'compras', 'visitas', 'fidelidad'];

// Devuelve el TOP 10 de clientes de un negocio segun el criterio pedido.
async function calcularTop10(negocioId, criterio) {
  if (criterio === 'visitas') {
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
  if (criterio === 'fidelidad') campoOrden = 'createdAt';

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

// GET /api/ranking/activos -> TOP 10 de CADA criterio que el dueño tenga activado a la vez
router.get('/activos', requiereAdmin, async (req, res) => {
  try {
    // Si viene ?criterios=compras,dinero se calculan esos (lo que el dueño está eligiendo en pantalla,
    // todavía sin guardar). Si no viene, se usan los que ya están guardados en el negocio.
    const pedidos = String(req.query.criterios || '').split(',').map((c) => c.trim()).filter((c) => CRITERIOS_VALIDOS.includes(c));
    const guardados = (req.negocio.ranking.criteriosActivos && req.negocio.ranking.criteriosActivos.length)
      ? req.negocio.ranking.criteriosActivos
      : ['compras'];
    const criteriosActivos = pedidos.length ? pedidos : guardados;

    const porCriterio = {};
    for (const criterio of criteriosActivos) {
      porCriterio[criterio] = await calcularTop10(req.negocio._id, criterio);
    }

    res.json({ criteriosActivos, criteriosGuardados: guardados, porCriterio, config: req.negocio.ranking });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al calcular el ranking' });
  }
});

router.put('/config', requiereAdmin, async (req, res) => {
  try {
    const { criteriosActivos, premiosPorCriterio } = req.body;

    if (Array.isArray(criteriosActivos)) {
      const filtrados = criteriosActivos.filter((c) => CRITERIOS_VALIDOS.includes(c));
      req.negocio.ranking.criteriosActivos = filtrados.length ? filtrados : ['compras'];
    }

    if (premiosPorCriterio) {
      CRITERIOS_VALIDOS.forEach((criterio) => {
        if (!premiosPorCriterio[criterio]) return;
        ['top1', 'top2', 'top3'].forEach((puesto) => {
          if (premiosPorCriterio[criterio][puesto]) {
            req.negocio.ranking.premiosPorCriterio[criterio][puesto] = {
              texto: String(premiosPorCriterio[criterio][puesto].texto || '').trim(),
              descuentoPorcentaje: Math.min(100, Math.max(0, Number(premiosPorCriterio[criterio][puesto].descuentoPorcentaje) || 0)),
            };
          }
        });
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
module.exports.CRITERIOS_VALIDOS = CRITERIOS_VALIDOS;
