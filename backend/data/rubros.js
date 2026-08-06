/**
 * SISTEMA DE RUBROS Y SUBRUBROS ESCALABLE
 * ==========================================
 * Para agregar un rubro o subrubro nuevo NO hay que tocar código del backend
 * ni del frontend: solo agregar un objeto nuevo a este archivo (o migrarlo
 * a una colección de MongoDB "rubros" más adelante, que es el paso natural
 * de escalado — este archivo ya está pensado con esa estructura).
 *
 * Cada subrubro define:
 *  - camposEspecificos: preguntas propias de ese tipo de negocio.
 * Los camposComunes (horarios, ubicación, métodos de pago, etc.) son
 * iguales para todos los negocios y viven en CAMPOS_COMUNES.
 *
 * tipo de campo soportados por el formulario dinámico del frontend:
 *  texto | textoLargo | numero | booleano | seleccionUnica | seleccionMultiple | lista
 */

const CAMPOS_COMUNES = [
  { id: 'nombreNegocio', label: 'Nombre del negocio', tipo: 'texto', obligatorio: true },
  { id: 'descripcion', label: 'Descripción breve del negocio', tipo: 'textoLargo', obligatorio: true },
  { id: 'historia', label: 'Historia del negocio (opcional)', tipo: 'textoLargo', obligatorio: false },
  { id: 'direccion', label: 'Dirección', tipo: 'texto', obligatorio: true },
  { id: 'localidad', label: 'Localidad / Ciudad', tipo: 'texto', obligatorio: true },
  { id: 'telefono', label: 'Teléfono de contacto', tipo: 'texto', obligatorio: true },
  { id: 'whatsapp', label: 'WhatsApp', tipo: 'texto', obligatorio: false },
  { id: 'redesSociales', label: 'Redes sociales (Instagram, Facebook, etc.)', tipo: 'textoLargo', obligatorio: false },
  { id: 'metodosPago', label: 'Métodos de pago aceptados', tipo: 'seleccionMultiple', obligatorio: true,
    opciones: ['Efectivo', 'Tarjeta débito', 'Tarjeta crédito', 'Transferencia', 'Mercado Pago', 'Otro'] },
  { id: 'mostrarPrecios', label: '¿El asistente debe informar precios a los clientes?', tipo: 'booleano', obligatorio: true },
  { id: 'promociones', label: 'Promociones o descuentos vigentes (opcional)', tipo: 'textoLargo', obligatorio: false },
  { id: 'politicas', label: 'Políticas de cambios, cancelaciones o devoluciones (opcional)', tipo: 'textoLargo', obligatorio: false },
  { id: 'preguntasFrecuentes', label: 'Preguntas frecuentes y sus respuestas (opcional)', tipo: 'textoLargo', obligatorio: false },
  { id: 'infoQueNuncaDebeDar', label: 'Información que el asistente NUNCA debe brindar (opcional)', tipo: 'textoLargo', obligatorio: false },
];

const RUBROS = [
  {
    categoria: 'Gastronomía',
    subrubros: [
      {
        id: 'restaurante',
        nombre: 'Restaurante',
        camposEspecificos: [
          { id: 'tipoCocina', label: 'Tipo de cocina', tipo: 'texto', obligatorio: true },
          { id: 'menu', label: 'Menú (platos y descripciones)', tipo: 'textoLargo', obligatorio: true },
          { id: 'aceptaReservas', label: '¿Acepta reservas?', tipo: 'booleano', obligatorio: true },
          { id: 'opcionesEspeciales', label: 'Opciones vegetarianas / veganas / sin TACC', tipo: 'textoLargo', obligatorio: false },
          { id: 'delivery', label: '¿Hace delivery? ¿Por qué plataformas?', tipo: 'texto', obligatorio: false },
        ],
      },
      {
        id: 'cafeteria',
        nombre: 'Cafetería',
        camposEspecificos: [
          { id: 'tiposCafe', label: 'Tipos de café y bebidas', tipo: 'textoLargo', obligatorio: true },
          { id: 'pasteleria', label: 'Pastelería y opciones de desayuno/merienda', tipo: 'textoLargo', obligatorio: true },
          { id: 'opcionesEspeciales', label: 'Opciones sin TACC / veganas', tipo: 'textoLargo', obligatorio: false },
          { id: 'takeAway', label: '¿Tiene take away?', tipo: 'booleano', obligatorio: true },
        ],
      },
      {
        id: 'pizzeria',
        nombre: 'Pizzería',
        camposEspecificos: [
          { id: 'variedadesPizza', label: 'Variedades de pizza', tipo: 'textoLargo', obligatorio: true },
          { id: 'tamanos', label: 'Tamaños disponibles y precios (opcional)', tipo: 'textoLargo', obligatorio: false },
          { id: 'delivery', label: '¿Hace delivery? Zona de cobertura', tipo: 'textoLargo', obligatorio: false },
        ],
      },
      {
        id: 'heladeria',
        nombre: 'Heladería',
        camposEspecificos: [
          { id: 'gustos', label: 'Gustos de helado disponibles', tipo: 'textoLargo', obligatorio: true },
          { id: 'formatos', label: 'Formatos (cucurucho, potes, kilos)', tipo: 'textoLargo', obligatorio: true },
          { id: 'opcionesEspeciales', label: 'Opciones sin azúcar / veganas', tipo: 'textoLargo', obligatorio: false },
        ],
      },
    ],
  },
  {
    categoria: 'Belleza y cuidado personal',
    subrubros: [
      {
        id: 'barberia',
        nombre: 'Barbería',
        camposEspecificos: [
          { id: 'servicios', label: 'Servicios (corte, barba, afeitado, etc.) y duración', tipo: 'textoLargo', obligatorio: true },
          { id: 'profesionales', label: 'Barberos y sus horarios', tipo: 'textoLargo', obligatorio: true },
          { id: 'sistemaTurnos', label: '¿Atiende con turno o por orden de llegada?', tipo: 'seleccionUnica', obligatorio: true,
            opciones: ['Con turno', 'Por orden de llegada', 'Ambos'] },
        ],
      },
      {
        id: 'peluqueria',
        nombre: 'Peluquería',
        camposEspecificos: [
          { id: 'servicios', label: 'Servicios (corte, color, peinado, tratamientos) y duración', tipo: 'textoLargo', obligatorio: true },
          { id: 'profesionales', label: 'Profesionales y sus horarios', tipo: 'textoLargo', obligatorio: true },
          { id: 'productos', label: 'Marcas/productos que utilizan (opcional)', tipo: 'textoLargo', obligatorio: false },
        ],
      },
      {
        id: 'estetica_spa',
        nombre: 'Estética / Spa',
        camposEspecificos: [
          { id: 'tratamientos', label: 'Tratamientos disponibles y duración', tipo: 'textoLargo', obligatorio: true },
          { id: 'requisitosPrevios', label: 'Requisitos previos a un tratamiento (opcional)', tipo: 'textoLargo', obligatorio: false },
        ],
      },
      {
        id: 'unas',
        nombre: 'Uñas',
        camposEspecificos: [
          { id: 'servicios', label: 'Servicios (esculpidas, semipermanente, pedicura, etc.)', tipo: 'textoLargo', obligatorio: true },
          { id: 'duracionPromedio', label: 'Duración promedio de cada servicio', tipo: 'texto', obligatorio: false },
        ],
      },
    ],
  },
  {
    categoria: 'Salud',
    subrubros: [
      {
        id: 'consultorio_medico',
        nombre: 'Consultorio médico',
        camposEspecificos: [
          { id: 'especialidad', label: 'Especialidad médica', tipo: 'texto', obligatorio: true },
          { id: 'obrasSociales', label: 'Obras sociales / prepagas aceptadas', tipo: 'textoLargo', obligatorio: true },
          { id: 'requiereOrden', label: '¿Requiere orden médica para atender?', tipo: 'booleano', obligatorio: false },
        ],
      },
      {
        id: 'odontologia',
        nombre: 'Odontología',
        camposEspecificos: [
          { id: 'tratamientos', label: 'Tratamientos que ofrece', tipo: 'textoLargo', obligatorio: true },
          { id: 'obrasSociales', label: 'Obras sociales / prepagas aceptadas', tipo: 'textoLargo', obligatorio: true },
          { id: 'urgencias', label: '¿Atiende urgencias?', tipo: 'booleano', obligatorio: false },
        ],
      },
      {
        id: 'veterinaria',
        nombre: 'Veterinaria',
        camposEspecificos: [
          { id: 'servicios', label: 'Servicios (consultas, vacunación, cirugías, peluquería canina, etc.)', tipo: 'textoLargo', obligatorio: true },
          { id: 'animalesAtendidos', label: 'Tipos de animales que atienden', tipo: 'textoLargo', obligatorio: true },
          { id: 'emergencias24h', label: '¿Atiende emergencias 24hs?', tipo: 'booleano', obligatorio: false },
        ],
      },
      {
        id: 'kinesiologia',
        nombre: 'Kinesiología',
        camposEspecificos: [
          { id: 'tratamientos', label: 'Tratamientos y especialidades', tipo: 'textoLargo', obligatorio: true },
          { id: 'obrasSociales', label: 'Obras sociales aceptadas', tipo: 'textoLargo', obligatorio: false },
        ],
      },
    ],
  },
  {
    categoria: 'Comercio',
    subrubros: [
      {
        id: 'tienda_ropa',
        nombre: 'Tienda de ropa',
        camposEspecificos: [
          { id: 'tipoPrendas', label: 'Tipo de prendas y estilo', tipo: 'textoLargo', obligatorio: true },
          { id: 'talles', label: 'Rango de talles disponibles', tipo: 'texto', obligatorio: false },
          { id: 'ventaOnline', label: '¿Vende online? ¿Hace envíos?', tipo: 'textoLargo', obligatorio: false },
        ],
      },
      {
        id: 'reparacion_celulares',
        nombre: 'Tecnología / Reparación de celulares',
        camposEspecificos: [
          { id: 'servicios', label: 'Servicios técnicos que ofrece', tipo: 'textoLargo', obligatorio: true },
          { id: 'marcasAtendidas', label: 'Marcas y modelos que reparan', tipo: 'textoLargo', obligatorio: true },
          { id: 'garantiaReparaciones', label: 'Garantía sobre reparaciones', tipo: 'texto', obligatorio: false },
        ],
      },
      {
        id: 'ferreteria',
        nombre: 'Ferretería',
        camposEspecificos: [
          { id: 'rubrosProductos', label: 'Rubros de productos (electricidad, plomería, herramientas, etc.)', tipo: 'textoLargo', obligatorio: true },
          { id: 'hacePedidosEspeciales', label: '¿Hace pedidos especiales de productos?', tipo: 'booleano', obligatorio: false },
        ],
      },
      {
        id: 'libreria',
        nombre: 'Librería',
        camposEspecificos: [
          { id: 'productos', label: 'Productos (útiles, libros, fotocopias, imprenta, etc.)', tipo: 'textoLargo', obligatorio: true },
          { id: 'serviciosImpresion', label: 'Servicios de impresión/fotocopiado', tipo: 'textoLargo', obligatorio: false },
        ],
      },
    ],
  },
  {
    categoria: 'Servicios profesionales',
    subrubros: [
      {
        id: 'estudio_juridico',
        nombre: 'Estudio jurídico',
        camposEspecificos: [
          { id: 'areasPractica', label: 'Áreas de práctica (laboral, civil, penal, etc.)', tipo: 'textoLargo', obligatorio: true },
          { id: 'consultaInicial', label: '¿La consulta inicial tiene costo?', tipo: 'booleano', obligatorio: false },
        ],
      },
      {
        id: 'inmobiliaria',
        nombre: 'Inmobiliaria',
        camposEspecificos: [
          { id: 'tipoOperaciones', label: 'Tipo de operaciones (venta, alquiler, temporario)', tipo: 'seleccionMultiple', obligatorio: true,
            opciones: ['Venta', 'Alquiler', 'Alquiler temporario', 'Tasaciones'] },
          { id: 'zonasCobertura', label: 'Zonas donde opera', tipo: 'textoLargo', obligatorio: true },
        ],
      },
      {
        id: 'taller_mecanico',
        nombre: 'Taller mecánico',
        camposEspecificos: [
          { id: 'servicios', label: 'Servicios (mecánica general, chapa y pintura, gomería, etc.)', tipo: 'textoLargo', obligatorio: true },
          { id: 'marcasAtendidas', label: 'Marcas de vehículos que atienden', tipo: 'textoLargo', obligatorio: false },
          { id: 'tiempoEstimadoTurno', label: '¿Trabaja con turno previo?', tipo: 'booleano', obligatorio: false },
        ],
      },
      {
        id: 'academia_cursos',
        nombre: 'Academia / Cursos',
        camposEspecificos: [
          { id: 'cursosOfrecidos', label: 'Cursos que ofrece', tipo: 'textoLargo', obligatorio: true },
          { id: 'modalidad', label: 'Modalidad', tipo: 'seleccionUnica', obligatorio: true,
            opciones: ['Presencial', 'Virtual', 'Híbrida'] },
          { id: 'duracionCursos', label: 'Duración promedio de los cursos', tipo: 'texto', obligatorio: false },
        ],
      },
    ],
  },
];

module.exports = { RUBROS, CAMPOS_COMUNES };
