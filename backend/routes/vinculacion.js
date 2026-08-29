const express = require('express');
const router = express.Router();
const Negocio = require('../models/Negocio');

/**
 * GET /api/vinculacion/:codigo
 * Endpoint público (sin login) pensado para que MI ZONA lo llame cuando el
 * dueño ingresa su código de vinculación al registrar el negocio ahí.
 * Devuelve la información pública necesaria para crear/completar la ficha
 * del negocio en Mi Zona, y el codigoPublico para armar el link/QR del chat.
 *
 * No devuelve nada sensible (ni codigoAdmin ni datos de facturación).
 */
router.get('/:codigo', async (req, res) => {
  try {
    const negocio = await Negocio.findOne({ codigoVinculacion: req.params.codigo, activo: true });
    if (!negocio) {
      return res.status(404).json({ error: 'Código de vinculación inválido o inexistente' });
    }

    const logo = negocio.fotos.find((f) => f.categoria === 'logo');
    const fotosProducto = negocio.fotos.filter((f) => f.categoria !== 'logo').map((f) => f.url);

    res.json({
      codigoPublico: negocio.codigoPublico, // para armar el link/QR del chat desde Mi Zona
      nombreNegocio: negocio.formData?.nombreNegocio || '',
      descripcion: negocio.formData?.descripcion || '',
      rubroCategoria: negocio.rubroCategoria,
      rubroSubrubro: negocio.rubroSubrubro,
      direccion: negocio.formData?.direccion || '',
      localidad: negocio.formData?.localidad || '',
      redesSociales: negocio.formData?.redesSociales || '',
      logoUrl: logo ? logo.url : null,
      fotosProducto,
      horarios: negocio.horarios,
      suscripcionActiva: negocio.suscripcion.estado === 'activa',
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al validar el código de vinculación' });
  }
});

module.exports = router;
