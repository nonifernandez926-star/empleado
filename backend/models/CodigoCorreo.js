const mongoose = require('mongoose');

// Código de un solo uso para entrar con el correo. Se guarda su huella (HMAC), nunca el código.
// MongoDB borra solo el registro cuando vence.
const esquema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  hash: { type: String, required: true },
  intentos: { type: Number, default: 0 },
  creado: { type: Date, default: Date.now },
  expira: { type: Date, required: true },
});
esquema.index({ expira: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('CodigoCorreo', esquema);
