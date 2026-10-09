const mongoose = require('mongoose');

// Historial corto de movimientos de seguridad de una cuenta (inicios de sesión, cambios de clave, etc.).
// Se borra solo a los 90 días.
const schema = new mongoose.Schema({
  usuarioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
  tipo: { type: String, enum: ['registro', 'inicio_sesion', 'cambio_clave', 'cierre_global', 'cambio_usuario', 'cambio_correo'], required: true },
  dispositivo: { type: String, default: '' }, // ej: "Chrome en Android"
  metodo: { type: String, default: '' }, // google | correo
}, { timestamps: { createdAt: true, updatedAt: false } });

schema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 3600 });

module.exports = mongoose.model('ActividadSeguridad', schema);
