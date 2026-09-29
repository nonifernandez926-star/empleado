const mongoose = require('mongoose');

// Preguntas que un cliente le hizo al asistente y que no supo responder. El dueño las contesta
// una vez desde el panel, y a partir de ahí el asistente ya sabe la respuesta para la próxima vez.
const preguntaFrecuenteSchema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  pregunta: { type: String, required: true },
  respuesta: { type: String, default: '' },
}, { timestamps: true });

preguntaFrecuenteSchema.index({ negocioId: 1, createdAt: -1 });

module.exports = mongoose.model('PreguntaFrecuente', preguntaFrecuenteSchema);
