const mongoose = require('mongoose');

const mensajeSchema = new mongoose.Schema({
  rol: { type: String, enum: ['cliente', 'asistente'], required: true },
  contenido: { type: String, required: true },
  fecha: { type: Date, default: Date.now },
  sinRespuesta: { type: Boolean, default: false }, // marca preguntas que el asistente no pudo responder
}, { _id: false });

const conversacionSchema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  sesionClienteId: { type: String, required: true }, // id anónimo generado en el navegador del cliente final
  mensajes: { type: [mensajeSchema], default: [] },
  finalizada: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('Conversacion', conversacionSchema);
