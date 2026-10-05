const mongoose = require('mongoose');

// Persona que entra a Mi Asistente (dueño de un negocio): con Google o con correo y contraseña.
const usuarioSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true }, // con correo: "email:<correo>"
    email: { type: String, required: true, index: true },
    nombre: { type: String, default: '' },
    proveedor: { type: String, enum: ['google', 'email'], default: 'google' },
    passwordHash: { type: String, default: '' },
    // Sube al cambiar la contraseña o cerrar sesión en todos los dispositivos: los tokens viejos dejan de servir.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Usuario', usuarioSchema);
