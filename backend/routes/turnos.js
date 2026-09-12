const express = require('express');
const router = express.Router();
const Turno = require('../models/Turno');
const { requiereAdmin } = require('../middleware/auth');
const { calcularHorariosDisponibles } = require('../utils/turnos');

// GET /api/turnos -> lista todos los turnos del negocio autenticado (más próximos primero)
router.get('/', requiereAdmin, async (req, res) => {
  try {
    const turnos = await Turno.find({ negocioId: req.negocio._id }).sort({ fecha: 1, hora: 1 });
    res.json(turnos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener los turnos' });
  }
});

// GET /api/turnos/disponibilidad?fecha=YYYY-MM-DD&motivo=xxx&profesional=xxx
// Le sirve al panel para mostrar (o probar) qué horarios quedan libres, con la misma lógica que usa el asistente.
router.get('/disponibilidad', requiereAdmin, async (req, res) => {
  try {
    const { fecha, motivo, profesional } = req.query;
    if (!fecha) return res.status(400).json({ error: 'Falta la fecha' });

    const motivoConfig = (req.negocio.configTurnos?.motivos || []).find((m) => m.nombre === motivo);
    const duracionMinutos = motivoConfig ? motivoConfig.duracionMinutos : 30;

    const turnosExistentes = await Turno.find({
      negocioId: req.negocio._id,
      fecha,
      estado: { $in: ['pendiente', 'confirmado'] },
    });

    const horarios = calcularHorariosDisponibles({
      negocio: req.negocio,
      fecha,
      duracionMinutos,
      profesional: profesional || '',
      turnosExistentes,
      ahora: new Date(),
    });

    res.json({ horarios, duracionMinutos });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al calcular disponibilidad' });
  }
});

// POST /api/turnos -> el DUEÑO carga un turno a mano (lo bloquea porque se lo dieron por otro medio)
router.post('/', requiereAdmin, async (req, res) => {
  try {
    const { fecha, hora, duracionMinutos, motivo, profesional, nombreCliente, telefonoCliente, notas } = req.body;
    if (!fecha || !hora || !nombreCliente) {
      return res.status(400).json({ error: 'Fecha, hora y nombre del cliente son obligatorios' });
    }

    const turno = await Turno.create({
      negocioId: req.negocio._id,
      fecha,
      hora,
      duracionMinutos: duracionMinutos || 30,
      motivo: motivo || '',
      profesional: profesional || '',
      nombreCliente,
      telefonoCliente: telefonoCliente || '',
      notas: notas || '',
      estado: 'confirmado',
      origen: 'dueño',
    });

    res.status(201).json(turno);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ error: 'Ya hay un turno ocupando ese horario' });
    }
    console.error(error);
    res.status(500).json({ error: 'Error al crear el turno' });
  }
});

// PUT /api/turnos/:id/estado -> aprobar, rechazar o cancelar un turno
router.put('/:id/estado', requiereAdmin, async (req, res) => {
  try {
    const { estado } = req.body;
    if (!['pendiente', 'confirmado', 'rechazado', 'cancelado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    const turno = await Turno.findOne({ _id: req.params.id, negocioId: req.negocio._id });
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });

    turno.estado = estado;
    await turno.save();

    res.json({ mensaje: 'Estado actualizado', turno });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el turno' });
  }
});

// DELETE /api/turnos/bulk?rango=dia|semana|mes -> borra los turnos de ese período (para limpiar la agenda)
router.delete('/bulk', requiereAdmin, async (req, res) => {
  try {
    const { rango } = req.query;
    if (!['dia', 'semana', 'mes'].includes(rango)) {
      return res.status(400).json({ error: 'Rango inválido' });
    }

    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const hasta = new Date(desde);
    if (rango === 'dia') hasta.setDate(hasta.getDate() + 1);
    if (rango === 'semana') hasta.setDate(hasta.getDate() + 7);
    if (rango === 'mes') hasta.setMonth(hasta.getMonth() + 1);

    const fechaDesde = desde.toISOString().slice(0, 10);
    const fechaHasta = hasta.toISOString().slice(0, 10);

    const resultado = await Turno.deleteMany({
      negocioId: req.negocio._id,
      fecha: { $gte: fechaDesde, $lt: fechaHasta },
    });

    res.json({ mensaje: 'Turnos eliminados', cantidad: resultado.deletedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al borrar los turnos' });
  }
});

// DELETE /api/turnos/:id -> elimina un turno (para no acumular basura de turnos viejos)
router.delete('/:id', requiereAdmin, async (req, res) => {
  try {
    const turno = await Turno.findOneAndDelete({ _id: req.params.id, negocioId: req.negocio._id });
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });
    res.json({ mensaje: 'Turno eliminado' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar el turno' });
  }
});

module.exports = router;
