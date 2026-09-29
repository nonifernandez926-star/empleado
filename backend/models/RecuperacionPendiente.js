const mongoose = require('mongoose');

const recuperacionPendienteSchema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  sesionClienteId: { type: String, required: true },
  mensaje: { type: String, required: true },
  tipo: { type: String, enum: ['indeciso', 'inactivo'], required: true },
  enviado: { type: Boolean, default: false },
}, { timestamps: true });

// Un mismo cliente no necesita dos recuperaciones pendientes sin enviar a la vez
recuperacionPendienteSchema.index({ negocioId: 1, sesionClienteId: 1 });

module.exports = mongoose.model('RecuperacionPendiente', recuperacionPendienteSchema);
