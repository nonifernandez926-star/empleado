const mongoose = require('mongoose');

const resenaSchema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  sesionClienteId: { type: String, required: true },
  nombreCliente: { type: String }, // si lo conocemos (viene del Cliente), para mostrarlo en el panel

  estrellas: { type: Number, required: true, min: 1, max: 5 },

  // Respuesta del cliente a la pregunta de seguimiento ("¿qué te gustó?" / "¿qué no te gustó?").
  // Puede quedar vacío si el cliente no contesta esa parte - las estrellas ya quedaron guardadas igual.
  comentario: { type: String, default: '' },
}, { timestamps: true });

resenaSchema.index({ negocioId: 1, createdAt: -1 });

module.exports = mongoose.model('Resena', resenaSchema);
