const mongoose = require('mongoose');

const itemPedidoSchema = new mongoose.Schema({
  producto: { type: String, required: true },
  cantidad: { type: Number, required: true, min: 1 },
  precioUnitario: { type: Number }, // opcional: solo si el negocio muestra precios
}, { _id: false });

const pedidoSchema = new mongoose.Schema({
  negocioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Negocio', required: true, index: true },
  sesionClienteId: { type: String, required: true },

  items: { type: [itemPedidoSchema], default: [] },
  total: { type: Number }, // opcional, se calcula si hay precios cargados

  nombreCliente: { type: String, required: true },
  telefonoCliente: { type: String },

  tipoEntrega: { type: String, enum: ['delivery', 'retiro'], required: true },
  direccionEntrega: { type: String },

  formaPago: { type: String, required: true },
  observaciones: { type: String },

  // Sin "cancelado": una vez que el asistente lo toma, el negocio lo gestiona hasta entregarlo.
  // Si algo no está disponible, se resuelve ANTES de tomar el pedido (ver disponibilidadHoy del negocio).
  estado: {
    type: String,
    enum: ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado'],
    default: 'pendiente',
  },
}, { timestamps: true });

module.exports = mongoose.model('Pedido', pedidoSchema);
