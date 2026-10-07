const mongoose = require('mongoose');

// Una suscripción push por navegador/celular de un cliente, para un negocio puntual.
// La genera el navegador (Service Worker + Push API); nosotros solo la guardamos para
// poder mandarle un aviso más adelante, aunque tenga la app cerrada.
const pushSuscripcionSchema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  sesionClienteId: { type: String, required: true, index: true },
  endpoint: { type: String, required: true },
  subscription: { type: mongoose.Schema.Types.Mixed, required: true }, // objeto completo que pide web-push
  dispositivo: { type: String, default: '' }, // solo para dispositivos del dueño: "Chrome en Android"
}, { timestamps: true });

// Un mismo cliente puede tener más de un dispositivo/navegador suscripto para el mismo negocio,
// pero no queremos guardar el mismo endpoint (mismo navegador) dos veces.
pushSuscripcionSchema.index({ negocioId: 1, endpoint: 1 }, { unique: true });

module.exports = mongoose.model('PushSuscripcion', pushSuscripcionSchema);
