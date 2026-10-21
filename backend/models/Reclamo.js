const mongoose = require('mongoose');

// Cambios, devoluciones y reclamos. El cliente los hace desde Mi Zona; llegan acá por la integración
// y el dueño los ve, decide (aceptar / rechazar) y responde con un mensaje que vuelve a Mi Zona.
const schema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  origen: { type: String, enum: ['mizona'], default: 'mizona' },
  refExterna: { type: String, required: true },            // id del reclamo en Mi Zona
  cliente: { ref: { type: String, default: '' }, usuario: { type: String, default: '' } }, // solo usuario público: no se guardan nombre ni teléfono
  tipo: { type: String, enum: ['reclamo', 'devolucion', 'cambio'], required: true },
  motivo: { type: String, enum: ['mal_estado', 'no_llego', 'incorrecto', 'calidad', 'demora', 'atencion', 'otro'], default: 'otro' },
  producto: { type: String, default: '', maxlength: 120 },
  pedidoRef: { type: String, default: '', maxlength: 60 },
  monto: { type: Number, min: 0 },                          // lo que pagó (para una devolución de dinero)
  esComida: { type: Boolean, default: false },              // en comida no se devuelve el producto: solo se reintegra el dinero
  descripcion: { type: String, required: true, maxlength: 1500 },
  fotos: [{ url: { type: String, maxlength: 500 }, _id: false }],
  estado: { type: String, enum: ['nuevo', 'en_revision', 'aceptado', 'rechazado'], default: 'nuevo', index: true },
  decision: {
    mensaje: { type: String, default: '', maxlength: 1000 },
    solucion: { type: String, enum: ['', 'reembolso', 'cambio', 'reposicion', 'compensacion', 'ninguna'], default: '' },
    fecha: { type: Date },
  },
  avisadoAlCliente: { type: Boolean, default: false },       // la respuesta ya se envió a Mi Zona
  leidoDueno: { type: Boolean, default: false },
}, { timestamps: true });

schema.index({ negocioId: 1, refExterna: 1 }, { unique: true });
schema.index({ negocioId: 1, estado: 1, createdAt: -1 });

module.exports = mongoose.model('Reclamo', schema);
