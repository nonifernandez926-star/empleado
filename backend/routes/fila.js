const express = require('express');
const router = express.Router();
const Turno = require('../models/Turno');
const Negocio = require('../models/Negocio');
const { requiereAdmin } = require('../middleware/auth');
const { ahoraArgentina, calcularFilaDelDia, estadoDeMisTurnos } = require('../utils/fila');

// GET /api/fila -> la fila de HOY para el dueño (una cola por profesional)
router.get('/', requiereAdmin, async (req, res) => {
  try {
    const { fecha } = ahoraArgentina();
    const turnos = await Turno.find({ negocioId: req.negocio._id, fecha, esPrueba: { $ne: true } }).sort({ hora: 1 });
    const pendientesDeConfirmar = turnos.filter((t) => t.estado === 'pendiente').length;
    const colas = calcularFilaDelDia(turnos.filter((t) => t.estado !== 'rechazado' && t.estado !== 'pendiente'), new Date());

    const dato = (t) => ({ id: t._id, nombreCliente: t.nombreCliente, hora: t.hora, motivo: t.motivo, duracionMinutos: t.duracionMinutos });
    res.json({
      fecha,
      pendientesDeConfirmar,
      colas: colas.map((c) => ({
        profesional: c.profesional,
        atendiendo: c.atendiendo ? { ...dato(c.atendiendo.turno), transcurridos: c.atendiendo.transcurridos, restantes: c.atendiendo.restantes, demorado: c.atendiendo.demorado } : null,
        esperando: c.cola.map((x) => ({ ...dato(x.turno), posicion: x.posicion, horaEstimada: x.horaEstimada, esperaMinutos: x.esperaMinutos, atrasoMinutos: x.atrasoMinutos, puedeAdelantar: x.puedeAdelantar })),
        atendidos: c.atendidos,
        ausentes: c.ausentes,
        cancelados: c.cancelados,
      })),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al armar la fila del día' });
  }
});

// PUT /api/fila/:id/atencion -> el dueño avanza la fila: iniciar, finalizar, ausente o reiniciar
router.put('/:id/atencion', requiereAdmin, async (req, res) => {
  try {
    const { accion } = req.body;
    if (!['iniciar', 'finalizar', 'ausente', 'reiniciar'].includes(accion)) {
      return res.status(400).json({ error: 'Acción inválida' });
    }
    const turno = await Turno.findOne({ _id: req.params.id, negocioId: req.negocio._id });
    if (!turno) return res.status(404).json({ error: 'Turno no encontrado' });
    if (turno.estado !== 'confirmado') return res.status(400).json({ error: 'Solo se puede atender un turno confirmado' });

    const ahora = new Date();
    if (accion === 'iniciar') {
      // Si ya estaba atendiendo a otro cliente del mismo profesional, lo damos por terminado
      await Turno.updateMany(
        { negocioId: req.negocio._id, fecha: turno.fecha, profesional: turno.profesional || '', atencion: 'en_atencion', _id: { $ne: turno._id } },
        { atencion: 'atendido', finAtencion: ahora }
      );
      turno.atencion = 'en_atencion';
      turno.inicioAtencion = ahora;
      turno.finAtencion = undefined;
    } else if (accion === 'finalizar') {
      turno.atencion = 'atendido';
      turno.finAtencion = ahora;
    } else if (accion === 'ausente') {
      turno.atencion = 'ausente';
    } else {
      turno.atencion = 'esperando';
      turno.inicioAtencion = undefined;
      turno.finAtencion = undefined;
    }
    await turno.save();
    res.json({ mensaje: 'Fila actualizada', turno });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo actualizar la fila' });
  }
});

// GET /api/fila/mia/:codigoPublico/:sesionClienteId -> lo que ve el CLIENTE en su chat:
// su lugar en la fila de hoy. No devuelve datos de otras personas.
router.get('/mia/:codigoPublico/:sesionClienteId', async (req, res) => {
  try {
    const negocio = await Negocio.findOne({ codigoPublico: req.params.codigoPublico, activo: true }).select('_id tipoOperacion');
    if (!negocio || negocio.tipoOperacion !== 'turnos') return res.json({ turnos: [] });

    const { fecha } = ahoraArgentina();
    const turnos = await Turno.find({ negocioId: negocio._id, fecha, esPrueba: { $ne: true } });
    res.json({ turnos: estadoDeMisTurnos(turnos, req.params.sesionClienteId, new Date()) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo consultar la fila' });
  }
});

module.exports = router;
