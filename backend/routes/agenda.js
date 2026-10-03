const express = require('express');
const router = express.Router();
const EventoAgenda = require('../models/EventoAgenda');
const { requiereAdmin } = require('../middleware/auth');
const { ahoraArgentina } = require('../utils/fila');
const { obtenerCategoriasAgenda } = require('../data/categoriasAgenda');

const CAMPOS_EDITABLES = ['titulo', 'fecha', 'hora', 'duracionMinutos', 'personaRelacionada', 'categoria', 'notas'];

// GET /api/agenda -> todo lo que el dueño necesita ver: eventos de hoy en adelante (próximos 60 días)
// y tareas pendientes (de cualquier fecha, para que las vencidas no se pierdan) + las que acaba de
// completar hoy, para que no desaparezcan de golpe de la pantalla.
router.get('/', requiereAdmin, async (req, res) => {
  try {
    const { fecha: hoy } = ahoraArgentina();
    const limite = new Date();
    limite.setDate(limite.getDate() + 60);
    const fechaLimite = ahoraArgentina(limite).fecha;

    const [eventos, tareas] = await Promise.all([
      EventoAgenda.find({ negocioId: req.negocio._id, tipo: 'evento', fecha: { $gte: hoy, $lte: fechaLimite } }).sort({ fecha: 1, hora: 1 }),
      EventoAgenda.find({
        negocioId: req.negocio._id,
        tipo: 'tarea',
        $or: [{ completada: false }, { fecha: hoy }],
      }).sort({ completada: 1, fecha: 1 }),
    ]);

    const categoriasSugeridas = obtenerCategoriasAgenda(req.negocio.rubroCategoria, req.negocio.rubroSubrubro);
    res.json({ eventos, tareas, hoy, categoriasSugeridas });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo cargar la agenda.' });
  }
});

// POST /api/agenda -> crea un evento o una tarea (carga manual)
router.post('/', requiereAdmin, async (req, res) => {
  try {
    const { tipo, titulo, fecha } = req.body;
    if (!['evento', 'tarea'].includes(tipo)) return res.status(400).json({ error: 'Tipo inválido: debe ser "evento" o "tarea".' });
    if (!titulo || !titulo.trim()) return res.status(400).json({ error: 'Falta el título.' });
    if (!fecha) return res.status(400).json({ error: 'Falta la fecha.' });

    const item = await EventoAgenda.create({
      negocioId: req.negocio._id,
      tipo,
      titulo: titulo.trim(),
      fecha,
      hora: req.body.hora || '',
      duracionMinutos: req.body.duracionMinutos || undefined,
      personaRelacionada: (req.body.personaRelacionada || '').trim(),
      categoria: (req.body.categoria || '').trim(),
      notas: (req.body.notas || '').trim(),
    });
    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo guardar.' });
  }
});

// PUT /api/agenda/:id -> edita un evento o tarea existente
router.put('/:id', requiereAdmin, async (req, res) => {
  try {
    const item = await EventoAgenda.findOne({ _id: req.params.id, negocioId: req.negocio._id });
    if (!item) return res.status(404).json({ error: 'No encontrado.' });

    CAMPOS_EDITABLES.forEach((campo) => {
      if (req.body[campo] !== undefined) item[campo] = req.body[campo];
    });
    await item.save();
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'No se pudo actualizar.' });
  }
});

// PUT /api/agenda/:id/completar -> tilda o destilda una tarea
router.put('/:id/completar', requiereAdmin, async (req, res) => {
  try {
    const item = await EventoAgenda.findOne({ _id: req.params.id, negocioId: req.negocio._id, tipo: 'tarea' });
    if (!item) return res.status(404).json({ error: 'No encontrada.' });
    item.completada = !item.completada;
    await item.save();
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: 'No se pudo actualizar la tarea.' });
  }
});

// DELETE /api/agenda/:id
router.delete('/:id', requiereAdmin, async (req, res) => {
  try {
    await EventoAgenda.deleteOne({ _id: req.params.id, negocioId: req.negocio._id });
    res.json({ ok: true });
  } catch (error) {
    res.status(500).json({ error: 'No se pudo eliminar.' });
  }
});

module.exports = router;
