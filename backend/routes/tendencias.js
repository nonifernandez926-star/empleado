const express = require('express');
const router = express.Router();
const Pedido = require('../models/Pedido');
const Turno = require('../models/Turno');
const Conversacion = require('../models/Conversacion');
const { requiereAdmin } = require('../middleware/auth');
const { ahoraArgentina } = require('../utils/fila');
const { calcularTendencias, sumarDias } = require('../utils/tendencias');

// GET /api/tendencias -> tendencias internas del negocio (fase 8A).
// Todo sale de los datos reales del negocio: no usa internet, no usa IA y no tiene costo extra.
// Nunca cuenta pedidos ni turnos de prueba ("Probar al asistente").
router.get('/', requiereAdmin, async (req, res) => {
  try {
    const negocio = req.negocio;
    const esTurnos = negocio.tipoOperacion === 'turnos';
    const hoy = ahoraArgentina().fecha;

    // 120 días alcanzan para: semana contra semana, últimos 28 días y cambios de precio de los últimos 90 días
    const desdeFecha = sumarDias(hoy, -120);
    const desde = new Date(`${desdeFecha}T00:00:00-03:00`); // Argentina no usa horario de verano
    const desdeConversaciones = new Date(`${sumarDias(hoy, -14)}T00:00:00-03:00`);

    const [pedidos, turnos, conversaciones] = await Promise.all([
      esTurnos ? [] : Pedido.find({ negocioId: negocio._id, esPrueba: { $ne: true }, createdAt: { $gte: desde } }).select('createdAt items total').lean(),
      esTurnos ? Turno.find({ negocioId: negocio._id, esPrueba: { $ne: true }, fecha: { $gte: desdeFecha, $lte: hoy } }).select('fecha hora motivo estado atencion').lean() : [],
      Conversacion.find({ negocioId: negocio._id, createdAt: { $gte: desdeConversaciones } }).select('createdAt').lean(),
    ]);

    res.json(calcularTendencias({ negocio, pedidos, turnos, conversaciones, hoy }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al calcular las tendencias' });
  }
});

module.exports = router;
