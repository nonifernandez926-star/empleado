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
  telefonoCliente: { type: String, required: true }, // siempre se pide: sirve como respaldo ante cualquier problema (ej. transferencia falsa)

  tipoEntrega: { type: String, enum: ['delivery', 'retiro'], required: true },
  direccionEntrega: { type: String },

  formaPago: { type: String, required: true },
  observaciones: { type: String },

  // Comprobante de transferencia: el cliente lo adjunta en el chat. NUNCA se marca
  // como verificado automáticamente — el dueño lo revisa a mano contra su propia
  // cuenta bancaria y lo confirma desde el panel.
  comprobante: {
    url: { type: String },
    publicId: { type: String },
    fecha: { type: Date },
  },
  pagoDeclarado: { type: Boolean, default: false }, // el cliente dijo que ya transfirió / mandó comprobante
  pagoVerificado: { type: Boolean, default: false }, // el DUEÑO confirmó manualmente que la plata llegó

  // Sin "cancelado": una vez que el asistente lo toma, el negocio lo gestiona hasta entregarlo.
  // Si algo no está disponible, se resuelve ANTES de tomar el pedido (ver disponibilidadHoy del negocio).
  estado: {
    type: String,
    enum: ['pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado'],
    default: 'pendiente',
  },
}, { timestamps: true });

module.exports = mongoose.model('Pedido', pedidoSchema);
