const mongoose = require('mongoose');

// Resultado de cada revisión del asistente (sirve para ver si va mejorando).
const schema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  puntaje: { type: Number, min: 0, max: 100 },
  resumen: { type: String, default: '' },
  conversaciones: { type: Number, default: 0 },
  casosNuevos: { type: Number, default: 0 },
  conIA: { type: Boolean, default: false },
  disparo: { type: String, enum: ['auto', 'manual'], default: 'manual' },
}, { timestamps: true });

schema.index({ negocioId: 1, createdAt: -1 });

module.exports = mongoose.model('EvaluacionCalidad', schema);
