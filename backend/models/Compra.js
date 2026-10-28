const mongoose = require('mongoose');

// Cada compra hecha con Google Play Billing. El token de Google es único: una misma compra nunca se acredita dos veces.
// Se guarda para siempre (es el comprobante de lo que se acreditó); no tiene datos de pago de nadie (Google no los entrega).
const compraSchema = new mongoose.Schema({
  tokenHash: { type: String, required: true, unique: true }, // SHA-256 del token de compra (así no queda guardado el token en sí)
  productoId: { type: String, required: true },
  orderId: { type: String, default: '' },
  negocioId: { type: String, required: true, index: true },
  plan: { type: String, required: true },
  meses: { type: Number, required: true },
  venciaAntes: { type: Date, default: null },
  venceDespues: { type: Date, default: null },
}, { timestamps: true });

module.exports = mongoose.model('Compra', compraSchema);
