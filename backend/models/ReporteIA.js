const mongoose = require('mongoose');

// Reporte de una respuesta del asistente de IA hecho por un cliente desde el chat.
// Google Play exige que las apps con IA generativa permitan reportar contenido ofensivo o dañino.
const schema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', index: true },
  codigoPublico: { type: String, default: '' },
  respuesta: { type: String, required: true, maxlength: 4000 },   // lo que dijo el asistente
  motivo: { type: String, enum: ['incorrecta', 'ofensiva', 'danina', 'otro'], default: 'otro' },
  comentario: { type: String, default: '', maxlength: 500 },
  estado: { type: String, enum: ['nuevo', 'revisado'], default: 'nuevo', index: true },
}, { timestamps: true });

module.exports = mongoose.model('ReporteIA', schema);
