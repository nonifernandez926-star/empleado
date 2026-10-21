const mongoose = require('mongoose');

// Un problema detectado al revisar las conversaciones del asistente (o reportado por un cliente).
const schema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  // incorrecta: dijo algo que no coincide con los datos del negocio | sin_respuesta: no supo responder
  // recurrente: la misma duda se repite | reporte: un cliente lo reportó | mejora: oportunidad de mejorar el trato o el cierre
  tipo: { type: String, enum: ['incorrecta', 'sin_respuesta', 'recurrente', 'reporte', 'mejora'], required: true },
  severidad: { type: String, enum: ['alta', 'media', 'baja'], default: 'media' },
  titulo: { type: String, required: true, maxlength: 140 },
  detalle: { type: String, default: '', maxlength: 600 },
  mensajeCliente: { type: String, default: '', maxlength: 500 },
  respuestaAsistente: { type: String, default: '', maxlength: 800 },
  veces: { type: Number, default: 1 },
  // A dónde ir para corregirlo: faq (responder una pregunta) | producto | horarios | info | instrucciones
  atajo: {
    tipo: { type: String, enum: ['faq', 'producto', 'horarios', 'info', 'instrucciones', 'ninguno'], default: 'ninguno' },
    producto: { type: String, default: '' },        // nombre del producto a revisar
    pregunta: { type: String, default: '' },        // para faq: la pregunta del cliente
    respuestaSugerida: { type: String, default: '', maxlength: 600 }, // para faq: borrador de respuesta (el dueño lo revisa)
    campo: { type: String, default: '' },
  },
  estado: { type: String, enum: ['nuevo', 'resuelto', 'ignorado'], default: 'nuevo', index: true },
  origen: { type: String, enum: ['ia', 'reglas', 'cliente'], default: 'ia' },
  huella: { type: String, index: true }, // evita guardar dos veces el mismo caso
  evaluacionId: { type: mongoose.Schema.Types.ObjectId },
}, { timestamps: true });

schema.index({ negocioId: 1, estado: 1, createdAt: -1 });

module.exports = mongoose.model('CasoCalidad', schema);
