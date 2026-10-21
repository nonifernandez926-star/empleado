// Rentabilidad estimada: ir más allá de "cuánto vendí" para ver "cuánto gané de verdad".
//   ganancia = ventas + envíos cobrados − costo de los productos − costo de entrega − embalaje − comisiones de cobro − gastos operativos
// Todo es una ESTIMACIÓN mientras falten datos (costos de productos, gastos, costo de envío): el resultado dice qué falta y qué tan confiable es.
const Pedido = require('../models/Pedido');
const Producto = require('../models/Producto');
const Gasto = require('../models/Gasto');
const { resolverProducto } = require('./inventario');

const ESTADOS_VENTA = ['confirmado', 'en_preparacion', 'listo', 'entregado'];
const DIA = 86400000;
const MES_DIAS = 30.44;
const redondear = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Cuánto de un gasto corresponde a un tramo de tiempo [desde, hasta]
function gastoEnTramo(g, desde, hasta) {
  const inicio = new Date(g.desde || g.createdAt).getTime();
  if (g.frecuencia === 'unico') return inicio >= desde.getTime() && inicio <= hasta.getTime() ? g.monto : 0;
  const ini = Math.max(inicio, desde.getTime());
  const dias = Math.max(0, (hasta.getTime() - ini) / DIA);
  return g.monto * (dias / MES_DIAS);
}

async function calcular(negocio, dias) {
  const hasta = new Date();
  const desde = new Date(hasta.getTime() - dias * DIA);
  const [pedidos, productos, gastos] = await Promise.all([
    Pedido.find({ negocioId: negocio._id, esPrueba: { $ne: true }, estado: { $in: ESTADOS_VENTA }, createdAt: { $gte: desde, $lte: hasta } }).sort({ createdAt: 1 }).lean(),
    Producto.find({ negocioId: negocio._id, activo: true }).lean(),
    Gasto.find({ negocioId: negocio._id, activo: true }).lean(),
  ]);

  const fin = negocio.finanzas || {};
  const costoEntregaUnit = typeof fin.costoEntrega === 'number' ? fin.costoEntrega : null;
  const embalajeUnit = typeof fin.costoEmbalaje === 'number' ? fin.costoEmbalaje : 0;
  const comisionPct = fin.comisionPct || 0;
  const zonasConPrecio = (negocio.zonasDelivery || []).filter((z) => z.precio > 0);
  const envioPromedio = zonasConPrecio.length ? zonasConPrecio.reduce((a, z) => a + z.precio, 0) / zonasConPrecio.length : 0;

  const porProducto = new Map();
  let ventas = 0, ventasConCosto = 0, costoProductos = 0, unidades = 0, itemsSinPrecio = 0, itemsFueraDeCatalogo = 0;
  let envios = 0, ventasNoEfectivo = 0;
  const directoPorPedido = [];

  for (const p of pedidos) {
    let ventaPedido = 0, costoPedido = 0;
    for (const it of p.items || []) {
      const hallado = it.productoId
        ? { producto: productos.find((x) => String(x._id) === String(it.productoId)) }
        : resolverProducto(productos, it.producto, it.variante);
      const producto = hallado && hallado.producto;
      const precio = typeof it.precioUnitario === 'number' ? it.precioUnitario : (producto && typeof producto.precio === 'number' ? producto.precio : null);
      if (precio === null) itemsSinPrecio++;
      if (!producto) itemsFueraDeCatalogo++;
      const ingreso = (precio || 0) * it.cantidad;
      const tieneCosto = !!producto && typeof producto.costo === 'number';
      const costo = tieneCosto ? producto.costo * it.cantidad : 0;
      ventas += ingreso; unidades += it.cantidad; ventaPedido += ingreso;
      if (tieneCosto) { ventasConCosto += ingreso; costoProductos += costo; costoPedido += costo; }
      const clave = producto ? String(producto._id) : 'x:' + String(it.producto || '').toLowerCase().trim();
      const fila = porProducto.get(clave) || { id: producto ? producto._id : null, nombre: producto ? producto.nombre : it.producto, unidades: 0, ventas: 0, costoTotal: 0, tieneCosto, costoUnit: tieneCosto ? producto.costo : null, enCatalogo: !!producto };
      fila.unidades += it.cantidad; fila.ventas += ingreso; fila.costoTotal += costo;
      porProducto.set(clave, fila);
    }
    const esDelivery = p.tipoEntrega === 'delivery';
    if (esDelivery) envios++;
    if (!/efectivo/i.test(p.formaPago || '')) ventasNoEfectivo += ventaPedido;
    const comision = (comisionPct / 100) * (/efectivo/i.test(p.formaPago || '') ? 0 : ventaPedido);
    directoPorPedido.push({
      fecha: new Date(p.createdAt), ventas: ventaPedido,
      directo: ventaPedido + (fin.envioCobrado && esDelivery ? envioPromedio : 0) - costoPedido - (esDelivery ? (costoEntregaUnit || 0) : 0) - embalajeUnit - comision,
    });
  }

  const costoEntrega = envios * (costoEntregaUnit || 0);
  const ingresoEnvio = fin.envioCobrado ? envios * envioPromedio : 0;
  const embalaje = pedidos.length * embalajeUnit;
  const comisiones = (comisionPct / 100) * ventasNoEfectivo;
  const margenBruto = ventas + ingresoEnvio - costoProductos - costoEntrega - embalaje - comisiones;
  const gastosPeriodo = gastos.reduce((a, g) => a + gastoEnTramo(g, desde, hasta), 0);
  const gananciaNeta = margenBruto - gastosPeriodo;
  const cobertura = ventas > 0 ? ventasConCosto / ventas : null;

  // Por producto
  const filas = [...porProducto.values()].map((f) => {
    const margen = f.tieneCosto ? f.ventas - f.costoTotal : null;
    return { ...f, ventas: redondear(f.ventas), costoTotal: redondear(f.costoTotal), margen: margen === null ? null : redondear(margen), margenPct: margen !== null && f.ventas > 0 ? redondear((margen / f.ventas) * 100) : null, margenUnit: f.tieneCosto && f.unidades ? redondear(margen / f.unidades) : null, peso: ventas > 0 ? redondear((f.ventas / ventas) * 100) : 0 };
  });
  const conCosto = filas.filter((f) => f.margen !== null).sort((a, b) => b.margen - a.margen);
  const sinCosto = filas.filter((f) => f.margen === null && f.enCatalogo).sort((a, b) => b.ventas - a.ventas);
  const fueraCatalogo = filas.filter((f) => !f.enCatalogo);

  // Qué datos faltan (en orden de importancia) y qué tan confiable es el resultado
  const faltantes = [];
  if (pedidos.length) {
    if (sinCosto.length || fueraCatalogo.length) faltantes.push({ clave: 'costos', texto: `Faltan los costos de ${sinCosto.length + fueraCatalogo.length} ${sinCosto.length + fueraCatalogo.length === 1 ? 'producto' : 'productos'} (${Math.round((1 - (cobertura || 0)) * 100)}% de tus ventas)` });
    if (!gastos.length) faltantes.push({ clave: 'gastos', texto: 'No cargaste gastos del negocio (alquiler, sueldos, servicios…)' });
    if (envios > 0 && costoEntregaUnit === null) faltantes.push({ clave: 'entrega', texto: 'No cargaste cuánto te cuesta cada envío' });
    if (itemsSinPrecio) faltantes.push({ clave: 'precios', texto: 'Hay productos vendidos sin precio cargado' });
  }
  const estimado = faltantes.length > 0;
  const confianza = !pedidos.length ? 'sin_datos' : !estimado ? 'alta' : (cobertura !== null && cobertura >= 0.8 && faltantes.length <= 1 ? 'media' : 'baja');

  // Ideas para el dueño
  const ideas = [];
  const mejor = conCosto[0];
  if (mejor && mejor.margen > 0) ideas.push({ tipo: 'ok', titulo: `${mejor.nombre} es lo que más ganancia te deja`, texto: `Te dejó ${mejor.margenPct}% de margen sobre sus ventas. Si querés vender más, empujá este producto: es el que más rinde.` });
  conCosto.filter((f) => f.margen < 0).slice(0, 2).forEach((f) => ideas.push({ tipo: 'alerta', titulo: `Estás vendiendo ${f.nombre} por debajo de su costo`, texto: 'Cada unidad te hace perder plata. Revisá el precio o el costo cargado.' }));
  const pocoMargen = conCosto.find((f) => f.peso >= 15 && f.margenPct !== null && f.margenPct < 20 && f.margen >= 0);
  if (pocoMargen) ideas.push({ tipo: 'info', titulo: `${pocoMargen.nombre} vende mucho pero deja poco`, texto: `Es el ${Math.round(pocoMargen.peso)}% de tus ventas y solo te deja ${pocoMargen.margenPct}% de margen. Un pequeño ajuste de precio puede cambiar mucho el resultado.` });
  if (ventas > 0 && costoEntrega / ventas > 0.1) ideas.push({ tipo: 'alerta', titulo: 'Los envíos se llevan mucho de tus ventas', texto: `El delivery te costó ${Math.round((costoEntrega / ventas) * 100)}% de lo que vendiste. Podés revisar tus zonas o cobrar el envío aparte.` });
  const gastosMensuales = gastos.filter((g) => g.frecuencia === 'mensual').reduce((a, g) => a + g.monto, 0);
  if (gastosMensuales > 0 && ventas > 0 && margenBruto > 0) {
    const ventasParaEquilibrio = gastosMensuales / (margenBruto / ventas);
    const ventasMensualizadas = (ventas / dias) * MES_DIAS;
    ideas.push({ tipo: ventasMensualizadas >= ventasParaEquilibrio ? 'ok' : 'alerta', titulo: `Punto de equilibrio: ≈ ${Math.round(ventasParaEquilibrio).toLocaleString('es-AR')} por mes`, texto: ventasMensualizadas >= ventasParaEquilibrio ? 'Con tu ritmo actual ya cubrís tus gastos fijos.' : 'Es lo que necesitás vender cada mes para cubrir tus gastos fijos. Hoy vas por debajo de ese ritmo.', equilibrio: Math.round(ventasParaEquilibrio) });
  }

  // Serie para el gráfico: por día (hasta 14 días), por semana (hasta 90) o por mes
  const paso = dias <= 14 ? 1 : dias <= 100 ? 7 : 30;
  const buckets = [];
  for (let t = desde.getTime(); t < hasta.getTime(); t += paso * DIA) buckets.push({ ini: new Date(t), fin: new Date(Math.min(t + paso * DIA, hasta.getTime())), ventas: 0, directo: 0 });
  directoPorPedido.forEach((o) => { const b = buckets.find((x) => o.fecha >= x.ini && o.fecha < x.fin) || buckets[buckets.length - 1]; if (b) { b.ventas += o.ventas; b.directo += o.directo; } });
  const serie = buckets.map((b) => {
    const gastoB = gastos.reduce((a, g) => a + gastoEnTramo(g, b.ini, b.fin), 0);
    return { desde: b.ini, hasta: b.fin, ventas: redondear(b.ventas), ganancia: redondear(b.directo - gastoB) };
  });

  return {
    dias, desde, hasta, pedidos: pedidos.length, unidades,
    ventas: redondear(ventas), ingresoEnvio: redondear(ingresoEnvio), costoProductos: redondear(costoProductos), costoEntrega: redondear(costoEntrega), embalaje: redondear(embalaje), comisiones: redondear(comisiones),
    margenBruto: redondear(margenBruto), gastos: redondear(gastosPeriodo), gananciaNeta: redondear(gananciaNeta),
    margenPct: ventas > 0 ? redondear((gananciaNeta / ventas) * 100) : null,
    ticketPromedio: pedidos.length ? redondear(ventas / pedidos.length) : 0,
    cobertura: cobertura === null ? null : redondear(cobertura * 100),
    estimado, confianza, faltantes,
    productos: conCosto, sinCosto: sinCosto.slice(0, 30), fueraCatalogo: fueraCatalogo.slice(0, 10),
    ideas, serie,
    configurado: { costoEntrega: costoEntregaUnit !== null, gastos: gastos.length > 0 },
  };
}

module.exports = { calcular, gastoEnTramo };
