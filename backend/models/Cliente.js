const mongoose = require('mongoose');

// Guarda quién es cada cliente recurrente de un negocio, para que el asistente
// lo "recuerde" en visitas futuras (mismo dispositivo/navegador vía sesionClienteId).
// Si el negocio apaga negocio.memoriaActiva, esto deja de consultarse y actualizarse.
const clienteSchema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  sesionClienteId: { type: String, required: true, index: true },

  nombre: { type: String },
  telefono: { type: String },

  totalPedidos: { type: Number, default: 0 },
  ultimoPedido: {
    fecha: { type: Date },
    items: [{ producto: String, cantidad: Number }],
    tipoEntrega: { type: String },
  },

  totalTurnos: { type: Number, default: 0 },
  ultimoTurno: {
    fecha: { type: String }, // 'YYYY-MM-DD'
    motivo: { type: String },
    profesional: { type: String },
  },

  // Ultima direccion de delivery que dio este cliente, para que el asistente pueda ofrecerle
  // "¿es la misma dirección de la vez pasada?" en vez de pedirsela de cero, y para que el negocio
  // vaya viendo de que zonas le llegan mas pedidos.
  ultimaDireccion: { type: String },

  // Suma de lo gastado en pedidos con precio cargado (los turnos no suman aca, no tienen precio en
  // el sistema todavia). Se usa para el ranking de clientes por "dinero gastado".
  totalGastado: { type: Number, default: 0 },
}, { timestamps: true });

clienteSchema.index({ negocioId: 1, sesionClienteId: 1 }, { unique: true });

module.exports = mongoose.model('Cliente', clienteSchema);
