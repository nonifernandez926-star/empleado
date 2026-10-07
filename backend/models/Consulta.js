const mongoose = require('mongoose');

// Consulta que un dueño le manda al equipo desde Ajustes → Soporte.
const schema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', index: true },
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  email: { type: String, default: '' },
  negocioNombre: { type: String, default: '' },
  tema: { type: String, enum: ['cuenta', 'suscripcion', 'asistente', 'pedidos', 'error', 'otro'], default: 'otro' },
  mensaje: { type: String, required: true, maxlength: 2000 },
  estado: { type: String, enum: ['abierta', 'respondida'], default: 'abierta', index: true },
  respuesta: { type: String, default: '' },
  respondidaEn: { type: Date },
  respuestaVista: { type: Boolean, default: true }, // false mientras el dueño no vio la respuesta nueva
}, { timestamps: true });

module.exports = mongoose.model('Consulta', schema);
