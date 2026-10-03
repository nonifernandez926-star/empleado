const mongoose = require('mongoose');

// Notificaciones que ve el DUEÑO dentro de su panel (campanita arriba a la derecha).
// Son distintas de las push al CLIENTE (ver PushSuscripcion.js): estas son internas del negocio.
const notificacionSchema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  tipo: { type: String, required: true }, // 'pedido' | 'turno' | 'comprobante' | 'resena' | 'sistema'
  titulo: { type: String, required: true },
  mensaje: { type: String, default: '' },
  leida: { type: Boolean, default: false, index: true },
  referenciaId: { type: mongoose.Schema.Types.ObjectId }, // id del pedido/turno/reseña relacionado, si aplica
}, { timestamps: true });

notificacionSchema.index({ negocioId: 1, createdAt: -1 });

module.exports = mongoose.model('Notificacion', notificacionSchema);
