/**
 * SISTEMA DE RUBROS Y SUBRUBROS ESCALABLE
 * ==========================================
 * Para agregar un rubro o subrubro nuevo NO hay que tocar código del backend
 * ni del frontend: solo agregar un objeto nuevo a este archivo (o migrarlo
 * a una colección de MongoDB "rubros" más adelante, que es el paso natural
 * de escalado — este archivo ya está pensado con esa estructura).
 *
 * Estructura: cada categoría (rubro principal) tiene una lista de subrubros.
 * El usuario primero elige la categoría y después el subrubro (selección en
 * dos pasos, ver frontend/js/registro.js).
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
  { id: 'especialidad', label: '¿Cuál es la especialidad de tu negocio?', tipo: 'textoLargo', obligatorio: false },
  { id: 'masSolicitado', label: '¿Cuál es el producto o servicio más solicitado por tus clientes?', tipo: 'textoLargo', obligatorio: false },
  { id: 'diferencial', label: '¿Qué los diferencia de otros negocios similares?', tipo: 'textoLargo', obligatorio: false },
  { id: 'novedades', label: '¿Tienen algo nuevo para ofrecer? (opcional)', tipo: 'textoLargo', obligatorio: false },
  { id: 'atencionPersonalizada', label: '¿Atienden casos, pedidos o consultas particulares/a medida?', tipo: 'booleano', obligatorio: false },
  { id: 'tipoClientes', label: '¿A qué tipo de clientes atienden habitualmente? (opcional)', tipo: 'texto', obligatorio: false },
  { id: 'zonasCobertura', label: '¿Qué zonas cubren, si aplica? (opcional)', tipo: 'texto', obligatorio: false },
  { id: 'atencionDomicilio', label: '¿Ofrecen atención, entrega o servicio a domicilio?', tipo: 'booleano', obligatorio: false },
  { id: 'requiereReserva', label: '¿Se necesita reservar, sacar turno o pedir cita previa?', tipo: 'booleano', obligatorio: false },
  { id: 'tiempoEstimado', label: '¿Cuánto demora aproximadamente una consulta, pedido o servicio? (opcional)', tipo: 'texto', obligatorio: false },
  { id: 'condicionesEspeciales', label: '¿Hacen descuentos, convenios, o atienden grupos/eventos grandes? (opcional)', tipo: 'textoLargo', obligatorio: false },
  { id: 'historia', label: 'Historia del negocio (opcional)', tipo: 'textoLargo', obligatorio: false },
  { id: 'direccion', label: 'Dirección', tipo: 'texto', obligatorio: true },
  { id: 'localidad', label: 'Localidad / Ciudad', tipo: 'texto', obligatorio: true },
  { id: 'telefono', label: 'Teléfono de contacto', tipo: 'texto', obligatorio: true },
  { id: 'whatsapp', label: 'WhatsApp (para casos que el asistente no pueda resolver)', tipo: 'texto', obligatorio: false },
  { id: 'redesSociales', label: 'Redes sociales (Instagram, Facebook, etc.)', tipo: 'textoLargo', obligatorio: false },
  { id: 'metodosPago', label: 'Métodos de pago aceptados', tipo: 'seleccionMultiple', obligatorio: true,
    opciones: ['Efectivo', 'Tarjeta débito', 'Tarjeta crédito', 'Transferencia', 'Mercado Pago', 'Otro'] },
  { id: 'mostrarPrecios', label: '¿El asistente debe informar precios a los clientes?', tipo: 'booleano', obligatorio: true },
  { id: 'promociones', label: 'Promociones o descuentos vigentes (opcional)', tipo: 'textoLargo', obligatorio: false },
  { id: 'politicas', label: 'Políticas de cambios, cancelaciones o devoluciones (opcional)', tipo: 'textoLargo', obligatorio: false },
  { id: 'preguntasFrecuentes', label: 'Preguntas frecuentes y sus respuestas (opcional)', tipo: 'textoLargo', obligatorio: false },
  { id: 'infoQueNuncaDebeDar', label: 'Información que el asistente NUNCA debe brindar (opcional)', tipo: 'textoLargo', obligatorio: false },
];

// Campos genéricos para cualquier subrubro "Otros" que todavía no tenga preguntas propias
const CAMPOS_OTROS = [
  { id: 'descripcionActividad', label: 'Describí en detalle a qué se dedica tu negocio', tipo: 'textoLargo', obligatorio: true },
  { id: 'productosServicios', label: 'Productos o servicios que ofrece', tipo: 'textoLargo', obligatorio: true },
];

const RUBROS = [
  {
    categoria: 'Gastronomía',
    subrubros: [
      { id: 'restaurante', nombre: 'Restaurante', camposEspecificos: [
        { id: 'tipoCocina', label: 'Tipo de cocina', tipo: 'texto', obligatorio: true },
        { id: 'menu', label: 'Menú (platos y descripciones)', tipo: 'textoLargo', obligatorio: true },
        { id: 'opcionesEspeciales', label: 'Opciones vegetarianas / veganas / sin TACC', tipo: 'textoLargo', obligatorio: false },
        { id: 'delivery', label: '¿Hace delivery? ¿Por qué plataformas?', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'pizzeria', nombre: 'Pizzería', camposEspecificos: [
        { id: 'variedadesPizza', label: 'Variedades de pizza (menú)', tipo: 'textoLargo', obligatorio: true },
        { id: 'tamanos', label: 'Tamaños disponibles y precios (opcional)', tipo: 'textoLargo', obligatorio: false },
        { id: 'ingredientes', label: 'Ingredientes destacados (opcional)', tipo: 'textoLargo', obligatorio: false },
        { id: 'opcionesEspeciales', label: 'Opciones vegetarianas / sin TACC', tipo: 'textoLargo', obligatorio: false },
        { id: 'delivery', label: '¿Hace delivery? Zona de cobertura', tipo: 'textoLargo', obligatorio: false },
      ]},
      { id: 'hamburgueseria', nombre: 'Hamburguesería', camposEspecificos: [
        { id: 'menu', label: 'Menú (hamburguesas y descripciones)', tipo: 'textoLargo', obligatorio: true },
        { id: 'opcionesEspeciales', label: 'Opciones vegetarianas / sin TACC', tipo: 'textoLargo', obligatorio: false },
        { id: 'delivery', label: '¿Hace delivery?', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'sandwicheria', nombre: 'Sandwichería', camposEspecificos: [
        { id: 'menu', label: 'Menú (sándwiches y descripciones)', tipo: 'textoLargo', obligatorio: true },
        { id: 'delivery', label: '¿Hace delivery?', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'cafeteria', nombre: 'Cafetería', camposEspecificos: [
        { id: 'tiposCafe', label: 'Tipos de café y bebidas', tipo: 'textoLargo', obligatorio: true },
        { id: 'pasteleria', label: 'Pastelería y opciones de desayuno/merienda', tipo: 'textoLargo', obligatorio: true },
        { id: 'takeAway', label: '¿Tiene take away?', tipo: 'booleano', obligatorio: true },
      ]},
      { id: 'panaderia', nombre: 'Panadería', camposEspecificos: [
        { id: 'productos', label: 'Productos (pan, facturas, tortas por encargo, etc.)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'pasteleria', nombre: 'Pastelería', camposEspecificos: [
        { id: 'productos', label: 'Productos (tortas, dulces, especialidades)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'heladeria', nombre: 'Heladería', camposEspecificos: [
        { id: 'gustos', label: 'Gustos de helado disponibles', tipo: 'textoLargo', obligatorio: true },
        { id: 'formatos', label: 'Formatos (cucurucho, potes, kilos)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'parrilla', nombre: 'Parrilla', camposEspecificos: [
        { id: 'menu', label: 'Menú (cortes y guarniciones)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'roticeria', nombre: 'Rotisería', camposEspecificos: [
        { id: 'menu', label: 'Menú del día / viandas', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'comida_rapida', nombre: 'Comida rápida', camposEspecificos: [
        { id: 'menu', label: 'Menú', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'comida_saludable', nombre: 'Comida saludable', camposEspecificos: [
        { id: 'menu', label: 'Menú (platos y opciones)', tipo: 'textoLargo', obligatorio: true },
        { id: 'opcionesEspeciales', label: 'Opciones veganas / keto / sin TACC', tipo: 'textoLargo', obligatorio: false },
      ]},
      { id: 'gastronomia_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
  {
    categoria: 'Salud',
    subrubros: [
      { id: 'clinica', nombre: 'Clínica', camposEspecificos: [
        { id: 'especialidades', label: 'Especialidades que atiende', tipo: 'textoLargo', obligatorio: true },
        { id: 'obrasSociales', label: 'Obras sociales / prepagas aceptadas', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'consultorio_medico', nombre: 'Consultorio médico', camposEspecificos: [
        { id: 'especialidadMedica', label: 'Especialidad médica', tipo: 'texto', obligatorio: true },
        { id: 'obrasSociales', label: 'Obras sociales / prepagas aceptadas', tipo: 'textoLargo', obligatorio: true },
        { id: 'requiereOrden', label: '¿Requiere orden médica para atender?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'odontologia', nombre: 'Odontología', camposEspecificos: [
        { id: 'tratamientos', label: 'Tratamientos que ofrece', tipo: 'textoLargo', obligatorio: true },
        { id: 'obrasSociales', label: 'Obras sociales / prepagas aceptadas', tipo: 'textoLargo', obligatorio: true },
        { id: 'urgencias', label: '¿Atiende urgencias?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'farmacia', nombre: 'Farmacia', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (envíos, obras sociales, vacunatorio, etc.)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'laboratorio', nombre: 'Laboratorio', camposEspecificos: [
        { id: 'estudios', label: 'Tipos de análisis/estudios que realiza', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'kinesiologia', nombre: 'Kinesiología', camposEspecificos: [
        { id: 'tratamientos', label: 'Tratamientos y especialidades', tipo: 'textoLargo', obligatorio: true },
        { id: 'obrasSociales', label: 'Obras sociales aceptadas', tipo: 'textoLargo', obligatorio: false },
      ]},
      { id: 'psicologia', nombre: 'Psicología', camposEspecificos: [
        { id: 'enfoque', label: 'Enfoque / especialidad (individual, pareja, niños, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'modalidad', label: 'Modalidad', tipo: 'seleccionUnica', obligatorio: false, opciones: ['Presencial', 'Virtual', 'Ambas'] },
      ]},
      { id: 'nutricion', nombre: 'Nutrición', camposEspecificos: [
        { id: 'especialidadNutricion', label: 'Especialidad (deportiva, clínica, pediátrica, etc.)', tipo: 'texto', obligatorio: false },
        { id: 'modalidad', label: 'Modalidad', tipo: 'seleccionUnica', obligatorio: false, opciones: ['Presencial', 'Virtual', 'Ambas'] },
      ]},
      { id: 'veterinaria', nombre: 'Veterinaria', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (consultas, vacunación, cirugías, peluquería canina, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'animalesAtendidos', label: 'Tipos de animales que atienden', tipo: 'textoLargo', obligatorio: true },
        { id: 'emergencias24h', label: '¿Atiende emergencias 24hs?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'salud_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
  {
    categoria: 'Hogar',
    subrubros: [
      { id: 'electricista', nombre: 'Electricista', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (instalaciones, reparaciones, urgencias)', tipo: 'textoLargo', obligatorio: true },
        { id: 'atiendeUrgencias', label: '¿Atiende urgencias?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'plomero', nombre: 'Plomero', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (destapaciones, instalaciones, reparaciones)', tipo: 'textoLargo', obligatorio: true },
        { id: 'atiendeUrgencias', label: '¿Atiende urgencias?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'gasista', nombre: 'Gasista', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (instalaciones, matriculado, certificaciones)', tipo: 'textoLargo', obligatorio: true },
        { id: 'matriculado', label: '¿Está matriculado?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'pintor', nombre: 'Pintor', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (interior, exterior, impermeabilización)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'albanileria', nombre: 'Albañilería', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (obra nueva, refacciones, ampliaciones)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'carpinteria', nombre: 'Carpintería', camposEspecificos: [
        { id: 'servicios', label: 'Servicios y trabajos a medida', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'cerrajeria', nombre: 'Cerrajería', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (aperturas, copias de llave, cerraduras)', tipo: 'textoLargo', obligatorio: true },
        { id: 'atiendeUrgencias', label: '¿Atiende urgencias 24hs?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'jardineria', nombre: 'Jardinería', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (mantenimiento, poda, diseño)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'limpieza', nombre: 'Limpieza', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (limpieza de hogar, fin de obra, tapizados, etc.)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'hogar_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
  {
    categoria: 'Automotor',
    subrubros: [
      { id: 'taller_mecanico', nombre: 'Taller mecánico', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (mecánica general, diagnóstico, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'marcasAtendidas', label: 'Marcas de vehículos que atienden', tipo: 'textoLargo', obligatorio: false },
        { id: 'garantias', label: 'Garantía sobre reparaciones (opcional)', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'gomeria', nombre: 'Gomería', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (reparación, venta, alineado, balanceo)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'lavadero', nombre: 'Lavadero', camposEspecificos: [
        { id: 'servicios', label: 'Servicios y tipos de lavado', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'chapa_pintura', nombre: 'Chapa y pintura', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (chapa, pintura, presupuestos de seguro)', tipo: 'textoLargo', obligatorio: true },
        { id: 'tiempoEstimadoTrabajo', label: 'Tiempo estimado de trabajos comunes', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'repuestos', nombre: 'Repuestos', camposEspecificos: [
        { id: 'marcasAtendidas', label: 'Marcas y modelos con los que trabajan', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'lubricentro', nombre: 'Lubricentro', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (cambio de aceite, filtros, etc.)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'electricidad_automotor', nombre: 'Electricidad del automotor', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (diagnóstico eléctrico, baterías, alarmas)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'accesorios_auto', nombre: 'Accesorios', camposEspecificos: [
        { id: 'productos', label: 'Productos que vende/instala', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'automotor_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
  {
    categoria: 'Belleza',
    subrubros: [
      { id: 'peluqueria', nombre: 'Peluquería', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (corte, color, peinado, tratamientos) y duración', tipo: 'textoLargo', obligatorio: true },
        { id: 'profesionales', label: 'Profesionales y sus horarios', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'barberia', nombre: 'Barbería', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (corte, barba, afeitado, etc.) y duración', tipo: 'textoLargo', obligatorio: true },
        { id: 'profesionales', label: 'Barberos y sus horarios', tipo: 'textoLargo', obligatorio: true },
        { id: 'sistemaTurnos', label: '¿Atiende con turno o por orden de llegada?', tipo: 'seleccionUnica', obligatorio: true,
          opciones: ['Con turno', 'Por orden de llegada', 'Ambos'] },
      ]},
      { id: 'manicuria', nombre: 'Manicuría', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (esculpidas, semipermanente, pedicura, etc.)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'estetica', nombre: 'Estética', camposEspecificos: [
        { id: 'tratamientos', label: 'Tratamientos disponibles y duración', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'maquillaje', nombre: 'Maquillaje', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (social, novias, cursos)', tipo: 'textoLargo', obligatorio: true },
        { id: 'trabajaEventos', label: '¿Trabaja para eventos/casamientos?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'spa', nombre: 'Spa', camposEspecificos: [
        { id: 'tratamientos', label: 'Tratamientos y masajes disponibles', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'depilacion', nombre: 'Depilación', camposEspecificos: [
        { id: 'metodos', label: 'Métodos de depilación (cera, láser, etc.)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'belleza_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
  {
    categoria: 'Comercio',
    subrubros: [
      { id: 'tienda_ropa', nombre: 'Tienda de ropa', camposEspecificos: [
        { id: 'tipoPrendas', label: 'Tipo de prendas y estilo', tipo: 'textoLargo', obligatorio: true },
        { id: 'talles', label: 'Rango de talles disponibles', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'reparacion_celulares', nombre: 'Tecnología / Reparación de celulares', camposEspecificos: [
        { id: 'servicios', label: 'Servicios técnicos que ofrece', tipo: 'textoLargo', obligatorio: true },
        { id: 'marcasAtendidas', label: 'Marcas y modelos que reparan', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'ferreteria', nombre: 'Ferretería', camposEspecificos: [
        { id: 'rubrosProductos', label: 'Rubros de productos (electricidad, plomería, herramientas, etc.)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'libreria', nombre: 'Librería', camposEspecificos: [
        { id: 'productos', label: 'Productos (útiles, libros, fotocopias, imprenta, etc.)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'kiosco', nombre: 'Kiosco / Almacén', camposEspecificos: [
        { id: 'productos', label: 'Rubros de productos (golosinas, bebidas, almacén, etc.)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'perfumeria', nombre: 'Perfumería', camposEspecificos: [
        { id: 'marcas', label: 'Marcas y líneas de productos que vende', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'bazar_regaleria', nombre: 'Bazar / Regalería', camposEspecificos: [
        { id: 'productos', label: 'Tipo de productos que vende', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'jugueteria', nombre: 'Juguetería', camposEspecificos: [
        { id: 'productos', label: 'Tipo de juguetes y edades', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'zapateria', nombre: 'Zapatería', camposEspecificos: [
        { id: 'tipoCalzado', label: 'Tipo de calzado y marcas', tipo: 'textoLargo', obligatorio: true },
        { id: 'numeracion', label: 'Numeración disponible', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'optica', nombre: 'Óptica', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (armazones, lentes de contacto, exámenes de vista)', tipo: 'textoLargo', obligatorio: true },
        { id: 'obrasSociales', label: 'Obras sociales aceptadas', tipo: 'textoLargo', obligatorio: false },
      ]},
      { id: 'comercio_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
  {
    categoria: 'Servicios profesionales',
    subrubros: [
      { id: 'estudio_juridico', nombre: 'Estudio jurídico', camposEspecificos: [
        { id: 'areasPractica', label: 'Áreas de práctica (laboral, civil, penal, etc.)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'inmobiliaria', nombre: 'Inmobiliaria', camposEspecificos: [
        { id: 'tipoOperaciones', label: 'Tipo de operaciones (venta, alquiler, temporario)', tipo: 'seleccionMultiple', obligatorio: true,
          opciones: ['Venta', 'Alquiler', 'Alquiler temporario', 'Tasaciones'] },
      ]},
      { id: 'contador', nombre: 'Contador / Estudio contable', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (monotributo, sociedades, liquidaciones, etc.)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'diseno_grafico', nombre: 'Diseño gráfico', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (logos, redes, impresos, branding)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'marketing_digital', nombre: 'Marketing digital', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (redes sociales, publicidad, SEO, etc.)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'desarrollo_web', nombre: 'Desarrollo web / Programación', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (páginas web, apps, sistemas a medida)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'fotografo', nombre: 'Fotógrafo', camposEspecificos: [
        { id: 'especialidad', label: 'Especialidad (eventos, retratos, productos, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'trabajaEventos', label: '¿Trabaja en casamientos/eventos?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'traductor', nombre: 'Traductor', camposEspecificos: [
        { id: 'idiomas', label: 'Idiomas que traduce', tipo: 'textoLargo', obligatorio: true },
        { id: 'traduccionPublica', label: '¿Hace traducciones públicas/certificadas?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'servicios_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
  {
    categoria: 'Educación',
    subrubros: [
      { id: 'academia_cursos', nombre: 'Academia / Cursos', camposEspecificos: [
        { id: 'cursosOfrecidos', label: 'Cursos que ofrece', tipo: 'textoLargo', obligatorio: true },
        { id: 'modalidad', label: 'Modalidad', tipo: 'seleccionUnica', obligatorio: true, opciones: ['Presencial', 'Virtual', 'Híbrida'] },
        { id: 'duracionCursos', label: 'Duración promedio de los cursos', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'academia_idiomas', nombre: 'Academia de idiomas', camposEspecificos: [
        { id: 'idiomas', label: 'Idiomas que enseña y niveles', tipo: 'textoLargo', obligatorio: true },
        { id: 'modalidad', label: 'Modalidad', tipo: 'seleccionUnica', obligatorio: false, opciones: ['Presencial', 'Virtual', 'Híbrida'] },
      ]},
      { id: 'apoyo_escolar', nombre: 'Apoyo escolar / Clases particulares', camposEspecificos: [
        { id: 'materias', label: 'Materias y niveles (primaria, secundaria, universitario)', tipo: 'textoLargo', obligatorio: true },
        { id: 'modalidad', label: 'Modalidad', tipo: 'seleccionUnica', obligatorio: false, opciones: ['Presencial', 'Virtual', 'Ambas'] },
      ]},
      { id: 'jardin_maternal', nombre: 'Jardín maternal', camposEspecificos: [
        { id: 'edadesAtendidas', label: 'Edades que atiende', tipo: 'texto', obligatorio: true },
        { id: 'horarioExtendido', label: '¿Tiene horario extendido?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'danza_musica', nombre: 'Instituto de danza / música', camposEspecificos: [
        { id: 'disciplinas', label: 'Disciplinas o instrumentos que enseña', tipo: 'textoLargo', obligatorio: true },
        { id: 'edadesAtendidas', label: 'Edades / niveles que atiende', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'educacion_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
  {
    categoria: 'Eventos y fiestas',
    subrubros: [
      { id: 'organizacion_eventos', nombre: 'Organización de eventos', camposEspecificos: [
        { id: 'tipoEventos', label: 'Tipo de eventos que organiza (casamientos, cumpleaños, corporativos)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'alquiler_mobiliario', nombre: 'Alquiler de mobiliario', camposEspecificos: [
        { id: 'productos', label: 'Qué alquila (mesas, sillas, vajilla, carpas, etc.)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'animacion_infantil', nombre: 'Animación infantil', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (personajes, juegos, shows)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'dj_sonido', nombre: 'DJ / Sonido', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (sonido, luces, DJ) y tipo de eventos', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'catering_eventos', nombre: 'Catering para eventos', camposEspecificos: [
        { id: 'menu', label: 'Opciones de menú para eventos', tipo: 'textoLargo', obligatorio: true },
        { id: 'cantidadMinima', label: 'Cantidad mínima de personas', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'salon_fiestas', nombre: 'Salón de fiestas', camposEspecificos: [
        { id: 'capacidad', label: 'Capacidad del salón', tipo: 'texto', obligatorio: true },
        { id: 'serviciosIncluidos', label: 'Qué incluye el alquiler (mobiliario, catering, decoración)', tipo: 'textoLargo', obligatorio: false },
      ]},
      { id: 'eventos_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
];

module.exports = { RUBROS, CAMPOS_COMUNES };
