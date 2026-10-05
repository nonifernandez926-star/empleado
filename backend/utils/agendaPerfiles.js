// La agenda se adapta al rubro del negocio: cambian los tipos de evento que se ofrecen al cargar algo y las tareas sugeridas.
// (No incluye "confirmar pedidos": eso ya se hace en la sección Pedidos.)
const TIPOS_BASE = [
  { id: 'reunion', label: 'Reunión' },
  { id: 'proveedor', label: 'Proveedor' },
  { id: 'entrega', label: 'Entrega o retiro' },
  { id: 'pago', label: 'Pago o vencimiento' },
  { id: 'personal', label: 'Personal / empleados' },
  { id: 'evento', label: 'Evento especial' },
];

const PERFILES = {
  Gastronomia: {
    nombre: 'Gastronomía',
    tipos: [
      { id: 'reserva', label: 'Reserva' }, { id: 'encargo', label: 'Pedido especial' }, { id: 'proveedor', label: 'Proveedor' },
      { id: 'compras', label: 'Compras' }, { id: 'evento', label: 'Evento' }, { id: 'personal', label: 'Personal' },
      { id: 'mantenimiento', label: 'Mantenimiento de equipos' },
    ],
    tareas: ['Revisar el stock', 'Hacer las compras de la semana', 'Pagar a un proveedor', 'Revisar las ventas', 'Armar el horario del personal', 'Revisar el mantenimiento de equipos'],
  },
  Salud: {
    nombre: 'Salud',
    tipos: [
      { id: 'consulta', label: 'Consulta / turno' }, { id: 'reunion', label: 'Reunión' }, { id: 'proveedor', label: 'Proveedor' },
      { id: 'capacitacion', label: 'Capacitación' }, { id: 'mantenimiento', label: 'Mantenimiento de equipos' }, { id: 'personal', label: 'Personal' },
    ],
    tareas: ['Revisar insumos', 'Facturar a obras sociales', 'Llamar a un paciente', 'Renovar habilitaciones', 'Pedir material a proveedores'],
  },
  Hogar: {
    nombre: 'Servicios del hogar',
    tipos: [
      { id: 'visita', label: 'Visita a domicilio' }, { id: 'presupuesto', label: 'Presupuesto' }, { id: 'materiales', label: 'Compra de materiales' },
      { id: 'proveedor', label: 'Proveedor' }, { id: 'entrega', label: 'Entrega de trabajo' }, { id: 'cobro', label: 'Cobro' },
    ],
    tareas: ['Enviar un presupuesto', 'Comprar materiales o repuestos', 'Cobrar un trabajo terminado', 'Llamar a un cliente', 'Coordinar visitas de la semana'],
  },
  Automotor: {
    nombre: 'Automotor',
    tipos: [
      { id: 'turno', label: 'Turno / ingreso de vehículo' }, { id: 'entrega', label: 'Entrega de vehículo' }, { id: 'repuestos', label: 'Repuestos' },
      { id: 'proveedor', label: 'Proveedor' }, { id: 'presupuesto', label: 'Presupuesto' }, { id: 'mantenimiento', label: 'Mantenimiento pendiente' },
    ],
    tareas: ['Pedir repuestos', 'Enviar un presupuesto', 'Llamar a un cliente por su vehículo', 'Revisar herramientas', 'Pagar a un proveedor'],
  },
  Belleza: {
    nombre: 'Belleza',
    tipos: [
      { id: 'turno', label: 'Turno / cliente' }, { id: 'tratamiento', label: 'Tratamiento' }, { id: 'proveedor', label: 'Proveedor' },
      { id: 'compras', label: 'Compra de productos' }, { id: 'personal', label: 'Horarios del personal' },
    ],
    tareas: ['Reponer productos', 'Recordarle el turno a un cliente', 'Esterilizar y ordenar el material', 'Pagar a un proveedor', 'Armar los horarios del personal'],
  },
  Comercio: {
    nombre: 'Comercio',
    tipos: [
      { id: 'mercaderia', label: 'Recepción de mercadería' }, { id: 'pedido_proveedor', label: 'Pedido a proveedor' }, { id: 'entrega', label: 'Entrega' },
      { id: 'pago', label: 'Pago' }, { id: 'promocion', label: 'Promoción / evento' }, { id: 'inventario', label: 'Inventario' }, { id: 'reunion', label: 'Reunión' },
    ],
    tareas: ['Hacer el inventario', 'Pedir mercadería a proveedores', 'Pagar una factura', 'Preparar una promoción', 'Revisar las ventas'],
  },
  'Servicios profesionales': {
    nombre: 'Servicios profesionales',
    tipos: [
      { id: 'cliente', label: 'Reunión con cliente' }, { id: 'presupuesto', label: 'Presupuesto' }, { id: 'vencimiento', label: 'Vencimiento / trámite' },
      { id: 'capacitacion', label: 'Capacitación' }, { id: 'reunion', label: 'Reunión' },
    ],
    tareas: ['Preparar un presupuesto', 'Presentar un trámite', 'Responder consultas pendientes', 'Facturar', 'Revisar vencimientos de clientes'],
  },
  Educacion: {
    nombre: 'Educación',
    tipos: [
      { id: 'clase', label: 'Clase' }, { id: 'reunion', label: 'Reunión con alumnos / familias' }, { id: 'examen', label: 'Examen / evaluación' },
      { id: 'evento', label: 'Evento institucional' }, { id: 'capacitacion', label: 'Capacitación' },
    ],
    tareas: ['Preparar una clase', 'Corregir trabajos', 'Avisar a las familias', 'Armar el cronograma', 'Cobrar cuotas pendientes'],
  },
  'Eventos y fiestas': {
    nombre: 'Eventos y fiestas',
    tipos: [
      { id: 'evento', label: 'Evento / fiesta' }, { id: 'visita', label: 'Visita / degustación' }, { id: 'proveedor', label: 'Proveedor' },
      { id: 'armado', label: 'Armado / entrega' }, { id: 'sena', label: 'Pago de seña' },
    ],
    tareas: ['Confirmar proveedores del evento', 'Cobrar una seña', 'Armar el cronograma del evento', 'Revisar el material', 'Enviar un presupuesto'],
  },
};

function perfilAgenda(rubroCategoria) {
  const p = PERFILES[rubroCategoria];
  if (p) return { rubro: p.nombre, tipos: p.tipos, tareas: p.tareas };
  return { rubro: rubroCategoria || 'General', tipos: TIPOS_BASE, tareas: ['Llamar a un proveedor', 'Revisar las ventas', 'Pagar una factura', 'Preparar un presupuesto'] };
}

module.exports = { perfilAgenda };
