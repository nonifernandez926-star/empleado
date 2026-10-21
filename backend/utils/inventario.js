// Inventario inteligente:
//  - Al tomar un pedido, el asistente aparta (reserva) las unidades por un tiempo. Si no alcanza, no lo toma.
//  - Cuando el dueño confirma el pedido, las unidades se descuentan del stock (una sola vez).
//  - Si el pedido no se confirma a tiempo, la reserva vence y las unidades vuelven a estar disponibles.
//  - Si el dueño revierte un pedido a "pendiente", las unidades vuelven al stock.
//  - Cuando un producto baja de su mínimo o se agota, se avisa al dueño (una sola vez por cambio de estado).
const Producto = require('../models/Producto');
const Pedido = require('../models/Pedido');
const Negocio = require('../models/Negocio');
const MovimientoStock = require('../models/MovimientoStock');
const { avisarDueno } = require('./avisos');

const norm = (s) => String(s == null ? '' : s).trim().toLowerCase();
const esNumero = (n) => typeof n === 'number' && Number.isFinite(n);

// ---------- encontrar el producto del catálogo a partir del nombre que dijo el cliente ----------
function resolverProducto(productos, nombre, varianteDicha) {
  const buscado = norm(nombre);
  if (!buscado) return null;
  let producto = productos.find((p) => norm(p.nombre) === buscado);
  if (!producto) { // "Zapatilla Nike - Talle 42": el nombre del producto está al principio
    producto = [...productos].sort((a, b) => b.nombre.length - a.nombre.length).find((p) => buscado.startsWith(norm(p.nombre)));
  }
  if (!producto && buscado.length >= 4) {
    const candidatos = productos.filter((p) => norm(p.nombre).includes(buscado));
    if (candidatos.length === 1) producto = candidatos[0];
  }
  if (!producto) return null;
  // La variante puede venir aparte o pegada al nombre
  let variante = '';
  const vs = producto.variantes || [];
  const dicha = norm(varianteDicha);
  if (dicha) variante = (vs.find((v) => norm(v.nombre) === dicha) || vs.find((v) => dicha.includes(norm(v.nombre)) || norm(v.nombre).includes(dicha)) || {}).nombre || '';
  if (!variante) variante = (vs.find((v) => buscado.includes(norm(v.nombre))) || {}).nombre || '';
  return { producto, variante };
}

const tieneVariantesConStock = (p) => (p.variantes || []).some((v) => esNumero(v.stock));

async function registrarMovimiento(negocioId, producto, datos) {
  try {
    await MovimientoStock.create({ negocioId, productoId: producto._id, productoNombre: producto.nombre, ...datos });
  } catch (e) { console.error('No se pudo registrar el movimiento de stock:', e.message); }
}

// ---------- reservar ----------
// Aparta una línea. Devuelve { ok, linea? , error? }. "linea" es lo que hay que devolver si algo falla.
async function reservarLinea(negocioId, producto, variante, cantidad) {
  const vs = producto.variantes || [];
  if (tieneVariantesConStock(producto)) {
    const v = vs.find((x) => x.nombre === variante);
    if (!v) {
      const opciones = vs.filter((x) => esNumero(x.stock)).map((x) => `${x.nombre} (${Math.max(0, x.stock - (x.reservado || 0))})`).join(', ');
      return { ok: false, error: `Para "${producto.nombre}" hay que elegir una opción antes de tomar el pedido. Disponibles: ${opciones}.` };
    }
    if (!esNumero(v.stock)) return { ok: true, linea: null }; // esa opción no lleva control
    for (let intento = 0; intento < 4; intento++) {
      const fresco = await Producto.findOne({ _id: producto._id, negocioId }).lean();
      const fv = fresco && (fresco.variantes || []).find((x) => x.nombre === variante);
      if (!fv) return { ok: false, error: `"${variante}" ya no está disponible.` };
      const disponible = (fv.stock || 0) - (fv.reservado || 0);
      if (disponible < cantidad) return { ok: false, error: disponible > 0 ? `De "${producto.nombre}" (${variante}) solo quedan ${disponible}.` : `"${producto.nombre}" (${variante}) está agotado.` };
      const r = await Producto.updateOne(
        { _id: producto._id, negocioId, variantes: { $elemMatch: { _id: fv._id, reservado: fv.reservado || 0, stock: fv.stock } } },
        { $inc: { 'variantes.$.reservado': cantidad } });
      if (r.modifiedCount) return { ok: true, linea: { productoId: producto._id, variante, cantidad } };
    }
    return { ok: false, error: 'Mucha gente pidiendo a la vez, intentá de nuevo en un momento.' };
  }
  if (esNumero(producto.stock)) {
    const r = await Producto.findOneAndUpdate(
      { _id: producto._id, negocioId, activo: true, stock: { $ne: null }, $expr: { $gte: [{ $subtract: ['$stock', { $ifNull: ['$reservado', 0] }] }, cantidad] } },
      { $inc: { reservado: cantidad } }, { new: true });
    if (r) return { ok: true, linea: { productoId: producto._id, variante: '', cantidad } };
    const fresco = await Producto.findById(producto._id).lean();
    const disponible = fresco ? Math.max(0, (fresco.stock || 0) - (fresco.reservado || 0)) : 0;
    return { ok: false, error: disponible > 0 ? `De "${producto.nombre}" solo quedan ${disponible}.` : `"${producto.nombre}" está agotado.` };
  }
  return { ok: true, linea: null }; // sin control de stock
}

async function devolverLinea(negocioId, linea, tipoMov, pedidoId, nota) {
  const producto = await Producto.findOne({ _id: linea.productoId, negocioId });
  if (!producto) return;
  if (linea.variante) {
    await Producto.updateOne({ _id: producto._id, 'variantes.nombre': linea.variante }, { $inc: { 'variantes.$.reservado': -linea.cantidad } });
    await Producto.updateOne({ _id: producto._id }, { $max: { 'variantes.$[v].reservado': 0 } }, { arrayFilters: [{ 'v.nombre': linea.variante }] }).catch(() => {});
  } else {
    await Producto.updateOne({ _id: producto._id }, { $inc: { reservado: -linea.cantidad } });
    await Producto.updateOne({ _id: producto._id, reservado: { $lt: 0 } }, { $set: { reservado: 0 } });
  }
  await registrarMovimiento(negocioId, producto, { variante: linea.variante || '', tipo: tipoMov, cantidad: linea.cantidad, stockResultante: producto.stock, pedidoId, nota });
}

// Reserva todos los ítems de un pedido que se va a tomar. Si algo no alcanza, devuelve todo lo apartado y avisa por qué.
// Devuelve { ok, items (con productoId/variante), lineas, venceEn } o { ok:false, error }.
async function reservarPedido(negocio, items) {
  const productos = await Producto.find({ negocioId: negocio._id, activo: true });
  const hechas = [];
  const itemsOk = [];
  for (const it of items) {
    const hallado = resolverProducto(productos, it.producto, it.variante);
    if (!hallado) { itemsOk.push({ ...it }); continue; } // no está en el catálogo: se toma igual, sin control
    const { producto, variante } = hallado;
    if (producto.disponibleHoy === false) {
      for (const l of hechas) await devolverLinea(negocio._id, l, 'liberacion', undefined, 'Pedido no tomado');
      return { ok: false, error: `"${producto.nombre}" no está disponible hoy.` };
    }
    const r = await reservarLinea(negocio._id, producto, variante, it.cantidad);
    if (!r.ok) {
      for (const l of hechas) await devolverLinea(negocio._id, l, 'liberacion', undefined, 'Pedido no tomado');
      return { ok: false, error: r.error };
    }
    if (r.linea) hechas.push(r.linea);
    itemsOk.push({ ...it, productoId: producto._id, variante: variante || undefined });
  }
  const minutos = (negocio.inventario && negocio.inventario.reservaMinutos) || 90;
  return { ok: true, items: itemsOk, lineas: hechas, venceEn: hechas.length ? new Date(Date.now() + minutos * 60000) : undefined };
}

// Anota en el historial las reservas de un pedido ya creado (necesita el id del pedido)
async function anotarReservas(negocioId, pedido) {
  for (const l of (pedido.reserva && pedido.reserva.lineas) || []) {
    const p = await Producto.findById(l.productoId).select('nombre stock');
    if (p) await registrarMovimiento(negocioId, p, { variante: l.variante || '', tipo: 'reserva', cantidad: -l.cantidad, stockResultante: p.stock, pedidoId: pedido._id, nota: 'Apartado hasta que confirmes el pedido' });
  }
}

// ---------- liberar / confirmar / revertir ----------
async function liberarReserva(pedido, motivo) {
  if (!pedido.reserva || pedido.reserva.estado !== 'activa') return;
  for (const l of pedido.reserva.lineas || []) await devolverLinea(pedido.negocioId, l, 'liberacion', pedido._id, motivo === 'vencio' ? 'La reserva venció sin confirmar' : motivo === 'eliminado' ? 'Pedido eliminado' : 'Pedido revertido');
  pedido.reserva.estado = 'liberada';
  pedido.reserva.motivoLiberacion = motivo;
}

async function descontar(negocioId, producto, variante, cantidad, pedido, usabaReserva) {
  if (variante) {
    await Producto.updateOne({ _id: producto._id, 'variantes.nombre': variante }, { $inc: { 'variantes.$.stock': -cantidad, ...(usabaReserva ? { 'variantes.$.reservado': -cantidad } : {}) } });
    await Producto.updateOne({ _id: producto._id }, { $max: { 'variantes.$[v].stock': 0, 'variantes.$[v].reservado': 0 } }, { arrayFilters: [{ 'v.nombre': variante }] }).catch(() => {});
  } else {
    await Producto.updateOne({ _id: producto._id }, { $inc: { stock: -cantidad, ...(usabaReserva ? { reservado: -cantidad } : {}) } });
    await Producto.updateOne({ _id: producto._id, stock: { $lt: 0 } }, { $set: { stock: 0 } });
    await Producto.updateOne({ _id: producto._id, reservado: { $lt: 0 } }, { $set: { reservado: 0 } });
  }
  const fresco = await Producto.findById(producto._id);
  await registrarMovimiento(negocioId, fresco, { variante: variante || '', tipo: 'venta', cantidad: -cantidad, stockResultante: variante ? ((fresco.variantes.find((v) => v.nombre === variante) || {}).stock) : fresco.stock, pedidoId: pedido._id, nota: `Pedido de ${pedido.nombreCliente}` });
  return fresco;
}

// Se llama cuando el pedido pasa de "pendiente" a cualquier otro estado.
async function confirmarStock(pedido) {
  if (pedido.stockDescontado || pedido.esPrueba) return;
  const negocioId = pedido.negocioId;
  const usaReserva = pedido.reserva && pedido.reserva.estado === 'activa';
  const lineas = usaReserva
    ? pedido.reserva.lineas.map((l) => ({ productoId: l.productoId, variante: l.variante, cantidad: l.cantidad }))
    : pedido.items.filter((i) => i.productoId).map((i) => ({ productoId: i.productoId, variante: i.variante || '', cantidad: i.cantidad }));
  const tocados = new Map();
  for (const l of lineas) {
    const producto = await Producto.findOne({ _id: l.productoId, negocioId });
    if (!producto) continue;
    const lleva = l.variante ? esNumero((producto.variantes.find((v) => v.nombre === l.variante) || {}).stock) : esNumero(producto.stock);
    if (!lleva) continue;
    if (!usaReserva) { // la reserva ya venció (o nunca existió): se descuenta directo, avisando si no alcanzaba
      const stockActual = l.variante ? producto.variantes.find((v) => v.nombre === l.variante).stock : producto.stock;
      if (stockActual < l.cantidad) pedido.sinStockAlConfirmar = true;
    }
    tocados.set(String(producto._id), await descontar(negocioId, producto, l.variante, l.cantidad, pedido, usaReserva));
  }
  pedido.stockDescontado = lineas.length > 0;
  if (pedido.reserva && pedido.reserva.estado !== 'ninguna') pedido.reserva.estado = 'confirmada';
  for (const p of tocados.values()) await revisarAlertaStock(p);
}

// El dueño devolvió el pedido a "pendiente": las unidades vuelven al stock y se vuelven a apartar si hay.
async function revertirStock(pedido) {
  if (!pedido.stockDescontado) return;
  const negocioId = pedido.negocioId;
  const lineas = pedido.items.filter((i) => i.productoId).map((i) => ({ productoId: i.productoId, variante: i.variante || '', cantidad: i.cantidad }));
  for (const l of lineas) {
    const producto = await Producto.findOne({ _id: l.productoId, negocioId });
    if (!producto) continue;
    if (l.variante) await Producto.updateOne({ _id: producto._id, 'variantes.nombre': l.variante, 'variantes.stock': { $ne: null } }, { $inc: { 'variantes.$.stock': l.cantidad } });
    else await Producto.updateOne({ _id: producto._id, stock: { $ne: null } }, { $inc: { stock: l.cantidad } });
    const fresco = await Producto.findById(producto._id);
    await registrarMovimiento(negocioId, fresco, { variante: l.variante, tipo: 'devolucion', cantidad: l.cantidad, stockResultante: l.variante ? (fresco.variantes.find((v) => v.nombre === l.variante) || {}).stock : fresco.stock, pedidoId: pedido._id, nota: 'Pedido devuelto a pendiente' });
    await revisarAlertaStock(fresco, { silencioso: true });
  }
  pedido.stockDescontado = false;
  pedido.sinStockAlConfirmar = false;
  pedido.reserva = { estado: 'liberada', motivoLiberacion: 'revertido', lineas: [] };
}

// Reservas vencidas: las unidades vuelven a estar disponibles (el pedido sigue pendiente; al confirmarlo se descuentan igual).
async function expirarReservas() {
  try {
    const vencidos = await Pedido.find({ 'reserva.estado': 'activa', 'reserva.venceEn': { $lt: new Date() } }).limit(200);
    for (const p of vencidos) {
      if (p.estado === 'pendiente') { await liberarReserva(p, 'vencio'); await p.save(); }
    }
  } catch (e) { console.error('Error venciendo reservas de stock:', e.message); }
}

// ---------- alertas ----------
function estadoStock(producto, umbralDefecto) {
  let fisico = null;
  if (tieneVariantesConStock(producto)) fisico = producto.variantes.filter((v) => esNumero(v.stock)).reduce((a, v) => a + v.stock, 0);
  else if (esNumero(producto.stock)) fisico = producto.stock;
  if (fisico === null) return { fisico: null, estado: 'ok' };
  const umbral = esNumero(producto.stockMinimo) ? producto.stockMinimo : umbralDefecto;
  return { fisico, umbral, estado: fisico <= 0 ? 'agotado' : fisico <= umbral ? 'bajo' : 'ok' };
}

// Avisa solo cuando el estado empeora (ok→bajo, bajo→agotado). Si mejora, se reinicia sin molestar.
async function revisarAlertaStock(producto, { silencioso = false } = {}) {
  try {
    const negocio = await Negocio.findById(producto.negocioId).select('inventario');
    const umbralDefecto = (negocio && negocio.inventario && negocio.inventario.umbralDefecto) ?? 3;
    const { fisico, estado, umbral } = estadoStock(producto, umbralDefecto);
    if (fisico === null || estado === producto.alertaStock) return;
    const peor = (estado === 'agotado' && producto.alertaStock !== 'agotado') || (estado === 'bajo' && producto.alertaStock === 'ok');
    await Producto.updateOne({ _id: producto._id }, { $set: { alertaStock: estado } });
    if (!peor || silencioso) return;
    if (estado === 'agotado') {
      await avisarDueno(producto.negocioId, 'stock', { titulo: `Se agotó: ${producto.nombre}`, cuerpo: 'Ya no quedan unidades. Cargá más stock cuando repongas.', url: '/admin.html?ir=inventario' });
    } else {
      await avisarDueno(producto.negocioId, 'stock', { titulo: `Se está por agotar: ${producto.nombre}`, cuerpo: `Quedan ${fisico} ${fisico === 1 ? 'unidad' : 'unidades'} (aviso a partir de ${umbral}).`, url: '/admin.html?ir=inventario' });
    }
  } catch (e) { console.error('Error revisando alerta de stock:', e.message); }
}

// ---------- ajustes manuales del dueño ----------
// { productoId, variante?, nuevoStock? , delta?, tipo? ('ajuste'|'reposicion'), nota? }
async function ajustarStock(negocioId, { productoId, variante = '', nuevoStock, delta, nota = '' }) {
  const producto = await Producto.findOne({ _id: productoId, negocioId });
  if (!producto) throw Object.assign(new Error('Producto no encontrado'), { status: 404 });
  const actual = variante ? (producto.variantes.find((v) => v.nombre === variante) || {}).stock : producto.stock;
  if (variante && !producto.variantes.some((v) => v.nombre === variante)) throw Object.assign(new Error('Opción no encontrada'), { status: 404 });
  const base = esNumero(actual) ? actual : 0;
  const destino = esNumero(nuevoStock) ? nuevoStock : base + (Number(delta) || 0);
  if (!Number.isFinite(destino) || destino < 0 || destino > 1000000) throw Object.assign(new Error('El stock tiene que ser un número de 0 en adelante.'), { status: 400 });
  const diff = destino - base;
  if (variante) await Producto.updateOne({ _id: producto._id, 'variantes.nombre': variante }, { $set: { 'variantes.$.stock': destino } });
  else await Producto.updateOne({ _id: producto._id }, { $set: { stock: destino } });
  const fresco = await Producto.findById(producto._id);
  await registrarMovimiento(negocioId, fresco, { variante, tipo: diff > 0 && esNumero(delta) ? 'reposicion' : 'ajuste', cantidad: diff, stockResultante: destino, nota });
  await revisarAlertaStock(fresco, { silencioso: true });
  return fresco;
}

module.exports = { resolverProducto, reservarPedido, anotarReservas, confirmarStock, revertirStock, liberarReserva, expirarReservas, revisarAlertaStock, ajustarStock, estadoStock, tieneVariantesConStock };
