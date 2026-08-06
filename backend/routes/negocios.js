const express = require('express');
const router = express.Router();
const multer = require('multer');
const Negocio = require('../models/Negocio');
const { RUBROS } = require('../data/rubros');
const { generarCodigoAdmin, generarCodigoPublico } = require('../utils/generarCodigo');
const { requiereAdmin } = require('../middleware/auth');
const { storage, cloudinary } = require('../config/cloudinary');

const upload = multer({ storage });

function validarSubrubro(subrubroId) {
  for (const cat of RUBROS) {
    const sub = cat.subrubros.find((s) => s.id === subrubroId);
    if (sub) return { categoria: cat.categoria, subrubro: sub.nombre };
  }
  return null;
}

// POST /api/negocios -> registra un negocio nuevo (queda en estado "prueba")
router.post('/', async (req, res) => {
  try {
    const { subrubroId, formData, horarios, personalidad } = req.body;

    const match = validarSubrubro(subrubroId);
    if (!match) return res.status(400).json({ error: 'Subrubro inválido' });

    let codigoAdmin, codigoPublico, existe;
    do {
      codigoAdmin = generarCodigoAdmin();
      existe = await Negocio.findOne({ codigoAdmin });
    } while (existe);
    do {
      codigoPublico = generarCodigoPublico();
      existe = await Negocio.findOne({ codigoPublico });
    } while (existe);

    const negocio = await Negocio.create({
      codigoAdmin,
      codigoPublico,
      rubroCategoria: match.categoria,
      rubroSubrubro: match.subrubro,
      formData: formData || {},
      horarios: horarios || [],
      personalidad: personalidad || {},
      suscripcion: {
        estado: 'prueba',
        limiteMensajesPrueba: 30,
        fechaInicio: new Date(),
      },
    });

    res.status(201).json({
      mensaje: 'Negocio registrado. Guardá tu código de administración, es la única forma de acceder al panel.',
      codigoAdmin: negocio.codigoAdmin,
      codigoPublico: negocio.codigoPublico,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar el negocio' });
  }
});

// POST /api/negocios/fotos -> sube una foto a Cloudinary y la asocia al negocio autenticado
router.post('/fotos', requiereAdmin, upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });

    req.negocio.fotos.push({ url: req.file.path, publicId: req.file.filename });
    await req.negocio.save();

    res.json({ url: req.file.path });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al subir la foto' });
  }
});

// GET /api/negocios/mi-negocio -> datos del negocio autenticado (para el panel admin)
router.get('/mi-negocio', requiereAdmin, async (req, res) => {
  res.json(req.negocio);
});

// PUT /api/negocios/mi-negocio -> actualiza info, horarios o personalidad
router.put('/mi-negocio', requiereAdmin, async (req, res) => {
  try {
    const { formData, horarios, personalidad } = req.body;

    if (formData) req.negocio.formData = { ...req.negocio.formData, ...formData };
    if (horarios) req.negocio.horarios = horarios;
    if (personalidad) req.negocio.personalidad = { ...req.negocio.personalidad.toObject(), ...personalidad };

    await req.negocio.save();
    res.json({ mensaje: 'Negocio actualizado correctamente', negocio: req.negocio });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el negocio' });
  }
});

module.exports = router;
