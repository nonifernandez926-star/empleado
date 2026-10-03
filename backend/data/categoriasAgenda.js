/**
 * CATEGORÍAS SUGERIDAS PARA LA AGENDA, SEGÚN EL RUBRO
 * =====================================================
 * No son un campo obligatorio ni cambian cómo funciona la agenda: son una ayuda para
 * que, al cargar un evento o tarea, el dueño tenga opciones ya pensadas para SU tipo de
 * negocio en vez de una lista genérica. Puede no elegir ninguna, y el campo queda vacío.
 *
 * Se resuelven en dos niveles: primero se busca por subrubro exacto (para los casos donde
 * un solo rubro necesita algo distinto al resto de su categoría, ej. un service técnico
 * dentro de "Comercio"); si no hay nada específico, se usa el set de la categoría general.
 */

const POR_CATEGORIA = {
  Gastronomia: ['Proveedores', 'Compras', 'Stock', 'Personal', 'Mantenimiento', 'Eventos'],
  Salud: ['Pacientes', 'Proveedores', 'Compras', 'Mantenimiento de equipos', 'Personal'],
  Hogar: ['Clientes', 'Presupuestos', 'Materiales', 'Proveedores', 'Visitas a domicilio'],
  Automotor: ['Vehículos', 'Repuestos', 'Proveedores', 'Presupuestos', 'Entregas', 'Mantenimiento'],
  Belleza: ['Clientes', 'Tratamientos', 'Proveedores', 'Compra de productos', 'Personal'],
  Comercio: ['Mercadería', 'Proveedores', 'Pagos', 'Inventario', 'Promociones'],
  'Servicios profesionales': ['Clientes', 'Reuniones', 'Presupuestos', 'Entregas', 'Pagos'],
  Educacion: ['Alumnos', 'Familias', 'Material', 'Personal', 'Eventos'],
  'Eventos y fiestas': ['Clientes', 'Proveedores', 'Alquiler de mobiliario', 'Presupuestos', 'Entregas'],
};

// Subrubros puntuales que necesitan un set propio, distinto al de su categoría.
const POR_SUBRUBRO = {
  taller_mecanico: ['Vehículos', 'Repuestos', 'Proveedores', 'Presupuestos', 'Entregas', 'Mantenimientos pendientes'],
  reparacion_celulares: ['Reparaciones pendientes', 'Entrega de equipos', 'Retiro de equipos', 'Presupuestos', 'Compra de repuestos', 'Clientes'],
  veterinaria: ['Pacientes', 'Dueños', 'Proveedores', 'Compras', 'Vacunas y controles'],
  farmacia: ['Pedidos a droguería', 'Stock', 'Vencimientos', 'Proveedores'],
  organizacion_eventos: ['Clientes', 'Proveedores', 'Presupuestos', 'Visitas al salón', 'Entregas'],
};

const GENERICO = ['Clientes', 'Proveedores', 'Compras', 'Pagos', 'Personal'];

function obtenerCategoriasAgenda(rubroCategoria, rubroSubrubro) {
  return POR_SUBRUBRO[rubroSubrubro] || POR_CATEGORIA[rubroCategoria] || GENERICO;
}

module.exports = { obtenerCategoriasAgenda };
