const express = require('express');
const router = express.Router();
const multer = require('multer');
const Negocio = require('../models/Negocio');
const { RUBROS } = require('../data/rubros');
const { generarCodigoAdmin, generarCodigoPublico } = require('../utils/generarCodigo');
const { generarToken } = require('../utils/jwt');
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
// Si viene "googleIdToken" en el body, vincula el negocio a esa cuenta de Google
// para que el dueño pueda iniciar sesión con Google en el futuro.
router.post('/', async (req, res) => {
  try {
    const { subrubroId, formData, horarios, personalidad, googleIdToken } = req.body;

    const match = validarSubrubro(subrubroId);
    if (!match) return res.status(400).json({ error: 'Subrubro inválido' });

    let googleId = null;
    let emailPropietario = null;
    if (googleIdToken) {
      try {
        const { verificarIdTokenGoogle } = require('./auth');
        const datosGoogle = await verificarIdTokenGoogle(googleIdToken);
        googleId = datosGoogle.googleId;
        emailPropietario = datosGoogle.email;
      } catch (error) {
        console.error('No se pudo verificar el token de Google al registrar:', error);
        // seguimos igual sin vincular Google, el dueño se queda con el código admin como respaldo
      }
    }

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
      googleId,
      emailPropietario,
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

    const respuesta = {
      mensaje: 'Negocio registrado. Guardá tu código de administración como respaldo, aunque hayas vinculado Google.',
      codigoAdmin: negocio.codigoAdmin,
      codigoPublico: negocio.codigoPublico,
    };

    if (googleId) {
      respuesta.token = generarToken(negocio._id.toString());
      respuesta.googleVinculado = true;
    }

    res.status(201).json(respuesta);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al registrar el negocio' });
  }
});

// POST /api/negocios/fotos -> sube una foto a Cloudinary y la asocia al negocio autenticado
router.post('/fotos', requiereAdmin, upload.single('foto'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });

    const categoria = req.body.categoria || 'general';
    req.negocio.fotos.push({ url: req.file.path, publicId: req.file.filename, categoria });
    await req.negocio.save();

    res.json({ url: req.file.path, categoria });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al subir la foto' });
  }
});

// DELETE /api/negocios/fotos/:publicId -> elimina una foto (de Cloudinary y del negocio)
router.delete('/fotos/:publicId', requiereAdmin, async (req, res) => {
  try {
    const publicId = decodeURIComponent(req.params.publicId);
    await cloudinary.uploader.destroy(publicId).catch(() => null); // si ya no existe en Cloudinary, seguimos igual
    req.negocio.fotos = req.negocio.fotos.filter((f) => f.publicId !== publicId);
    await req.negocio.save();
    res.json({ mensaje: 'Foto eliminada' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar la foto' });
  }
});

// GET /api/negocios/mi-negocio -> datos del negocio autenticado (para el panel admin)
router.get('/mi-negocio', requiereAdmin, async (req, res) => {
  res.json(req.negocio);
});

// PUT /api/negocios/mi-negocio -> actualiza info, horarios o personalidad
router.put('/mi-negocio', requiereAdmin, async (req, res) => {
  try {
    const { formData, horarios, personalidad, disponibilidadHoy } = req.body;

    if (formData) req.negocio.formData = { ...req.negocio.formData, ...formData };
    if (horarios) req.negocio.horarios = horarios;
    if (personalidad) req.negocio.personalidad = { ...req.negocio.personalidad.toObject(), ...personalidad };
    if (disponibilidadHoy !== undefined) req.negocio.disponibilidadHoy = disponibilidadHoy;

    await req.negocio.save();
    res.json({ mensaje: 'Negocio actualizado correctamente', negocio: req.negocio });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar el negocio' });
  }
});

module.exports = router;
