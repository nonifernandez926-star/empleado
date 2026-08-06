const express = require('express');
const router = express.Router();
const { RUBROS, CAMPOS_COMUNES } = require('../data/rubros');

// GET /api/rubros -> lista completa de categorías y subrubros (sin campos, para selects)
router.get('/', (req, res) => {
  const lista = RUBROS.map((cat) => ({
    categoria: cat.categoria,
    subrubros: cat.subrubros.map((s) => ({ id: s.id, nombre: s.nombre })),
  }));
  res.json(lista);
});

// GET /api/rubros/:subrubroId/formulario -> campos comunes + específicos para armar el formulario dinámico
router.get('/:subrubroId/formulario', (req, res) => {
  const { subrubroId } = req.params;

  for (const cat of RUBROS) {
    const sub = cat.subrubros.find((s) => s.id === subrubroId);
    if (sub) {
      return res.json({
        categoria: cat.categoria,
        subrubro: sub.nombre,
        subrubroId: sub.id,
        campos: [...CAMPOS_COMUNES, ...sub.camposEspecificos],
      });
    }
  }

  res.status(404).json({ error: 'Subrubro no encontrado' });
});

module.exports = router;
