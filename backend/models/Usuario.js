const mongoose = require('mongoose');

// Persona que entra a Mi Asistente (dueño de un negocio): con Google o con correo y contraseña.
const usuarioSchema = new mongoose.Schema(
  {
    googleId: { type: String, required: true, unique: true }, // con correo: "email:<correo>"
    email: { type: String, required: true, index: true },
    nombre: { type: String, default: '' },
    // Nombre de usuario para entrar (único, en minúsculas). Las cuentas anteriores no lo tienen hasta que lo eligen en Ajustes.
    usuario: { type: String, lowercase: true, trim: true },
    proveedor: { type: String, enum: ['google', 'email'], default: 'google' },
    passwordHash: { type: String, default: '' },
    // true cuando la persona demostró que el correo es suyo (con Google o con un código enviado a ese correo)
    correoVerificado: { type: Boolean, default: false },
    // Sube al cambiar la contraseña o cerrar sesión en todos los dispositivos: los tokens viejos dejan de servir.
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Único solo cuando existe: las cuentas viejas sin usuario no chocan entre sí.
usuarioSchema.index({ usuario: 1 }, { unique: true, partialFilterExpression: { usuario: { $type: 'string' } } });

module.exports = mongoose.model('Usuario', usuarioSchema);
