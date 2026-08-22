/**
 * SISTEMA DE RUBROS Y SUBRUBROS ESCALABLE
 * ==========================================
 * Estructura: cada categoria (rubro principal) tiene una lista de subrubros.
 * El usuario primero elige la categoria y despues el subrubro.
 *
 * CAMPOS_COMUNES: solo lo que es realmente universal para CUALQUIER negocio
 * (nombre, direccion, telefono, horarios, metodos de pago). Todo lo demas
 * vive en camposEspecificos de cada subrubro, con preguntas propias de esa
 * actividad puntual - no genericas ni compartidas entre rubros distintos.
 */

const CAMPOS_COMUNES = [
  { id: 'nombreNegocio', label: 'Nombre del negocio', tipo: 'texto', obligatorio: true },
  { id: 'descripcion', label: 'Descripcion breve del negocio', tipo: 'textoLargo', obligatorio: true },
  { id: 'historia', label: 'Historia del negocio (opcional)', tipo: 'textoLargo', obligatorio: false },
  { id: 'direccion', label: 'Direccion', tipo: 'texto', obligatorio: true },
  { id: 'localidad', label: 'Localidad / Ciudad', tipo: 'texto', obligatorio: true },
  { id: 'telefono', label: 'Telefono de contacto', tipo: 'texto', obligatorio: true },
  { id: 'whatsapp', label: 'WhatsApp (para casos que el asistente no pueda resolver)', tipo: 'texto', obligatorio: false },
  { id: 'redesSociales', label: 'Redes sociales (Instagram, Facebook, etc.)', tipo: 'textoLargo', obligatorio: false },
  { id: 'metodosPago', label: 'Metodos de pago aceptados', tipo: 'seleccionMultiple', obligatorio: true,
    opciones: ['Efectivo', 'Tarjeta debito', 'Tarjeta credito', 'Transferencia', 'Mercado Pago', 'Otro'] },
  { id: 'mostrarPrecios', label: 'El asistente debe informar precios a los clientes?', tipo: 'booleano', obligatorio: true },
  { id: 'aliasCbu', label: 'Alias o CBU para recibir transferencias (opcional, solo si aceptas pagos por transferencia)', tipo: 'texto', obligatorio: false },
  { id: 'promociones', label: 'Promociones o descuentos vigentes (opcional)', tipo: 'textoLargo', obligatorio: false },
  { id: 'politicas', label: 'Politicas de cambios, cancelaciones o devoluciones (opcional)', tipo: 'textoLargo', obligatorio: false },
  { id: 'preguntasFrecuentes', label: 'Preguntas frecuentes y sus respuestas (opcional)', tipo: 'textoLargo', obligatorio: false },
  { id: 'infoQueNuncaDebeDar', label: 'Informacion que el asistente NUNCA debe brindar (opcional)', tipo: 'textoLargo', obligatorio: false },
];

// Solo para subrubros "Otros" que todavia no tienen preguntas propias cargadas
const CAMPOS_OTROS = [
  { id: 'descripcionActividad', label: 'Describi en detalle a que se dedica tu negocio', tipo: 'textoLargo', obligatorio: true },
  { id: 'productosServicios', label: 'Productos o servicios que ofrece', tipo: 'textoLargo', obligatorio: true },
  { id: 'diferencial', label: 'Que los diferencia de otros negocios similares? (opcional)', tipo: 'textoLargo', obligatorio: false },
];

const RUBROS = [
  {
    categoria: 'Gastronomia',
    subrubros: [
      { id: 'restaurante', nombre: 'Restaurante', camposEspecificos: [
        { id: 'tipoCocina', label: 'Tipo de cocina', tipo: 'texto', obligatorio: true },
        { id: 'menu', label: 'Menu (platos y descripciones)', tipo: 'textoLargo', obligatorio: true },
        { id: 'platoDestacado', label: 'Cual es el plato que mas piden?', tipo: 'texto', obligatorio: false },
        { id: 'opcionesEspeciales', label: 'Opciones vegetarianas / veganas / sin TACC', tipo: 'textoLargo', obligatorio: false },
        { id: 'aceptaReservas', label: 'Se puede reservar mesa?', tipo: 'booleano', obligatorio: false },
        { id: 'delivery', label: 'Hace delivery? Por que plataformas?', tipo: 'texto', obligatorio: false },
        { id: 'eventosPrivados', label: 'Organizan eventos privados o cenas grupales?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'pizzeria', nombre: 'Pizzeria', camposEspecificos: [
        { id: 'variedadesPizza', label: 'Variedades de pizza (menu)', tipo: 'textoLargo', obligatorio: true },
        { id: 'tamanos', label: 'Tamanos disponibles y precios (opcional)', tipo: 'textoLargo', obligatorio: false },
        { id: 'ingredientes', label: 'Ingredientes destacados o pizza especial de la casa (opcional)', tipo: 'textoLargo', obligatorio: false },
        { id: 'opcionesEspeciales', label: 'Opciones vegetarianas / sin TACC', tipo: 'textoLargo', obligatorio: false },
        { id: 'delivery', label: 'Hace delivery? Zona de cobertura', tipo: 'textoLargo', obligatorio: false },
        { id: 'pedidosGrandes', label: 'Arman pedidos grandes para cumpleanos o empresas?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'hamburgueseria', nombre: 'Hamburgueseria', camposEspecificos: [
        { id: 'menu', label: 'Menu (hamburguesas y descripciones)', tipo: 'textoLargo', obligatorio: true },
        { id: 'hamburguesaDestacada', label: 'Cual es la hamburguesa mas pedida?', tipo: 'texto', obligatorio: false },
        { id: 'opcionesEspeciales', label: 'Opciones vegetarianas / sin TACC', tipo: 'textoLargo', obligatorio: false },
        { id: 'delivery', label: 'Hace delivery?', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'sandwicheria', nombre: 'Sandwicheria', camposEspecificos: [
        { id: 'menu', label: 'Menu (sandwiches y descripciones)', tipo: 'textoLargo', obligatorio: true },
        { id: 'panes', label: 'Tipos de pan que usan (opcional)', tipo: 'texto', obligatorio: false },
        { id: 'delivery', label: 'Hace delivery?', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'cafeteria', nombre: 'Cafeteria', camposEspecificos: [
        { id: 'tiposCafe', label: 'Tipos de cafe y bebidas', tipo: 'textoLargo', obligatorio: true },
        { id: 'pasteleria', label: 'Pasteleria y opciones de desayuno/merienda', tipo: 'textoLargo', obligatorio: true },
        { id: 'ambiente', label: 'Como es el ambiente? (para trabajar, tranquilo, con wifi, etc.)', tipo: 'texto', obligatorio: false },
        { id: 'takeAway', label: 'Tiene take away?', tipo: 'booleano', obligatorio: true },
      ]},
      { id: 'panaderia', nombre: 'Panaderia', camposEspecificos: [
        { id: 'productos', label: 'Productos (pan, facturas, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'tortasPorEncargo', label: 'Hacen tortas o pedidos especiales por encargo?', tipo: 'booleano', obligatorio: false },
        { id: 'horarioPanCaliente', label: 'A que hora sale el pan caliente? (opcional)', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'pasteleria', nombre: 'Pasteleria', camposEspecificos: [
        { id: 'productos', label: 'Productos (tortas, dulces, especialidades)', tipo: 'textoLargo', obligatorio: true },
        { id: 'tortasPersonalizadas', label: 'Hacen tortas personalizadas por pedido (cumpleanos, casamientos)?', tipo: 'booleano', obligatorio: false },
        { id: 'diasAnticipacion', label: 'Con cuantos dias de anticipacion hay que encargar? (opcional)', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'heladeria', nombre: 'Heladeria', camposEspecificos: [
        { id: 'gustos', label: 'Gustos de helado disponibles', tipo: 'textoLargo', obligatorio: true },
        { id: 'formatos', label: 'Formatos (cucurucho, potes, kilos)', tipo: 'textoLargo', obligatorio: true },
        { id: 'opcionesEspeciales', label: 'Opciones sin azucar / veganas', tipo: 'textoLargo', obligatorio: false },
      ]},
      { id: 'parrilla', nombre: 'Parrilla', camposEspecificos: [
        { id: 'menu', label: 'Menu (cortes y guarniciones)', tipo: 'textoLargo', obligatorio: true },
        { id: 'aceptaReservas', label: 'Se puede reservar mesa?', tipo: 'booleano', obligatorio: false },
        { id: 'parrilladaGrupal', label: 'Tienen parrillada o menu para compartir en grupo?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'roticeria', nombre: 'Roticeria', camposEspecificos: [
        { id: 'menu', label: 'Menu del dia / viandas', tipo: 'textoLargo', obligatorio: true },
        { id: 'viandasSemanales', label: 'Ofrecen viandas semanales o por suscripcion?', tipo: 'booleano', obligatorio: false },
        { id: 'delivery', label: 'Hace delivery?', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'comida_rapida', nombre: 'Comida rapida', camposEspecificos: [
        { id: 'menu', label: 'Menu', tipo: 'textoLargo', obligatorio: true },
        { id: 'delivery', label: 'Hace delivery?', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'comida_saludable', nombre: 'Comida saludable', camposEspecificos: [
        { id: 'menu', label: 'Menu (platos y opciones)', tipo: 'textoLargo', obligatorio: true },
        { id: 'opcionesEspeciales', label: 'Opciones veganas / keto / sin TACC', tipo: 'textoLargo', obligatorio: false },
        { id: 'infoNutricional', label: 'Informan calorias o macros de los platos?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'gastronomia_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
  {
    categoria: 'Salud',
    subrubros: [
      { id: 'clinica', nombre: 'Clinica', camposEspecificos: [
        { id: 'especialidades', label: 'Especialidades que atiende', tipo: 'textoLargo', obligatorio: true },
        { id: 'obrasSociales', label: 'Obras sociales / prepagas aceptadas', tipo: 'textoLargo', obligatorio: true },
        { id: 'requiereOrden', label: 'Requiere orden medica para atender?', tipo: 'booleano', obligatorio: false },
        { id: 'guardia24h', label: 'Tiene guardia 24hs?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'consultorio_medico', nombre: 'Consultorio medico', camposEspecificos: [
        { id: 'especialidadMedica', label: 'Especialidad medica', tipo: 'texto', obligatorio: true },
        { id: 'obrasSociales', label: 'Obras sociales / prepagas aceptadas', tipo: 'textoLargo', obligatorio: true },
        { id: 'requiereOrden', label: 'Requiere orden medica para atender?', tipo: 'booleano', obligatorio: false },
        { id: 'duracionConsulta', label: 'Cuanto dura aproximadamente una consulta? (opcional)', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'odontologia', nombre: 'Odontologia', camposEspecificos: [
        { id: 'tratamientos', label: 'Tratamientos que ofrece', tipo: 'textoLargo', obligatorio: true },
        { id: 'obrasSociales', label: 'Obras sociales / prepagas aceptadas', tipo: 'textoLargo', obligatorio: true },
        { id: 'urgencias', label: 'Atiende urgencias dentales?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'farmacia', nombre: 'Farmacia', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (vacunatorio, obras sociales, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'delivery', label: 'Hace envios a domicilio?', tipo: 'booleano', obligatorio: false },
        { id: 'guardia24h', label: 'Es farmacia de turno / abre 24hs?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'laboratorio', nombre: 'Laboratorio', camposEspecificos: [
        { id: 'estudios', label: 'Tipos de analisis/estudios que realiza', tipo: 'textoLargo', obligatorio: true },
        { id: 'requiereAyuno', label: 'Hay estudios que requieren ayuno? Cuales?', tipo: 'textoLargo', obligatorio: false },
        { id: 'entregaResultados', label: 'En cuanto tiempo se entregan los resultados? (opcional)', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'kinesiologia', nombre: 'Kinesiologia', camposEspecificos: [
        { id: 'tratamientos', label: 'Tratamientos y especialidades (rehabilitacion, deportiva, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'obrasSociales', label: 'Obras sociales aceptadas', tipo: 'textoLargo', obligatorio: false },
        { id: 'atencionDomicilio', label: 'Hacen sesiones a domicilio?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'psicologia', nombre: 'Psicologia', camposEspecificos: [
        { id: 'enfoque', label: 'Enfoque / especialidad (individual, pareja, ninos, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'modalidad', label: 'Modalidad', tipo: 'seleccionUnica', obligatorio: false, opciones: ['Presencial', 'Virtual', 'Ambas'] },
        { id: 'duracionSesion', label: 'Cuanto dura una sesion? (opcional)', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'nutricion', nombre: 'Nutricion', camposEspecificos: [
        { id: 'especialidadNutricion', label: 'Especialidad (deportiva, clinica, pediatrica, etc.)', tipo: 'texto', obligatorio: false },
        { id: 'modalidad', label: 'Modalidad', tipo: 'seleccionUnica', obligatorio: false, opciones: ['Presencial', 'Virtual', 'Ambas'] },
        { id: 'incluyePlan', label: 'La consulta incluye plan alimentario por escrito?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'veterinaria', nombre: 'Veterinaria', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (consultas, vacunacion, cirugias, peluqueria canina, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'animalesAtendidos', label: 'Tipos de animales que atienden', tipo: 'textoLargo', obligatorio: true },
        { id: 'emergencias24h', label: 'Atiende emergencias 24hs?', tipo: 'booleano', obligatorio: false },
        { id: 'visitasDomicilio', label: 'Hacen visitas a domicilio?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'salud_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
  {
    categoria: 'Hogar',
    subrubros: [
      { id: 'electricista', nombre: 'Electricista', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (instalaciones, reparaciones, tableros, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'atiendeUrgencias', label: 'Atiende urgencias fuera de horario?', tipo: 'booleano', obligatorio: false },
        { id: 'matriculado', label: 'Esta matriculado?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'plomero', nombre: 'Plomero', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (destapaciones, instalaciones, reparaciones de canos)', tipo: 'textoLargo', obligatorio: true },
        { id: 'atiendeUrgencias', label: 'Atiende urgencias (perdidas de agua, etc.)?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'gasista', nombre: 'Gasista', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (instalaciones, certificaciones, conexiones)', tipo: 'textoLargo', obligatorio: true },
        { id: 'matriculado', label: 'Esta matriculado (requisito legal)?', tipo: 'booleano', obligatorio: true },
      ]},
      { id: 'pintor', nombre: 'Pintor', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (interior, exterior, impermeabilizacion, durlock)', tipo: 'textoLargo', obligatorio: true },
        { id: 'presupuestoPrevio', label: 'Va a ver el trabajo antes de dar presupuesto?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'albanileria', nombre: 'Albanileria', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (obra nueva, refacciones, ampliaciones)', tipo: 'textoLargo', obligatorio: true },
        { id: 'tipoObras', label: 'Trabajan en obras chicas, grandes o ambas?', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'carpinteria', nombre: 'Carpinteria', camposEspecificos: [
        { id: 'servicios', label: 'Servicios y muebles que hacen', tipo: 'textoLargo', obligatorio: true },
        { id: 'trabajosMedida', label: 'Hacen muebles a medida por diseno del cliente?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'cerrajeria', nombre: 'Cerrajeria', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (aperturas, copias de llave, cambio de cerraduras)', tipo: 'textoLargo', obligatorio: true },
        { id: 'atiendeUrgencias', label: 'Atiende urgencias 24hs (puertas trabadas, etc.)?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'jardineria', nombre: 'Jardineria', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (mantenimiento, poda, diseno de espacios)', tipo: 'textoLargo', obligatorio: true },
        { id: 'frecuenciaMantenimiento', label: 'Ofrecen mantenimiento periodico (mensual, quincenal)?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'limpieza', nombre: 'Limpieza', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (limpieza de hogar, fin de obra, tapizados, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'llevanInsumos', label: 'Llevan sus propios insumos de limpieza?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'hogar_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
  {
    categoria: 'Automotor',
    subrubros: [
      { id: 'taller_mecanico', nombre: 'Taller mecanico', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (mecanica general, diagnostico computarizado, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'marcasAtendidas', label: 'Marcas de vehiculos que atienden', tipo: 'textoLargo', obligatorio: false },
        { id: 'garantias', label: 'Garantia sobre reparaciones (opcional)', tipo: 'texto', obligatorio: false },
        { id: 'autoReemplazo', label: 'Ofrecen auto de reemplazo mientras reparan?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'gomeria', nombre: 'Gomeria', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (reparacion, venta de cubiertas, alineado, balanceo)', tipo: 'textoLargo', obligatorio: true },
        { id: 'marcasCubiertas', label: 'Marcas de cubiertas que venden (opcional)', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'lavadero', nombre: 'Lavadero', camposEspecificos: [
        { id: 'servicios', label: 'Tipos de lavado (exterior, completo, encerado, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'tiempoEspera', label: 'Cuanto demora un lavado completo? (opcional)', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'chapa_pintura', nombre: 'Chapa y pintura', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (chapa, pintura, desabolladura)', tipo: 'textoLargo', obligatorio: true },
        { id: 'trabajaConSeguros', label: 'Trabajan con presupuestos para companias de seguro?', tipo: 'booleano', obligatorio: false },
        { id: 'tiempoEstimadoTrabajo', label: 'Tiempo estimado de trabajos comunes', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'repuestos', nombre: 'Repuestos', camposEspecificos: [
        { id: 'marcasAtendidas', label: 'Marcas y modelos con los que trabajan', tipo: 'textoLargo', obligatorio: true },
        { id: 'repuestosOriginalesAlternativos', label: 'Venden repuestos originales, alternativos o ambos?', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'lubricentro', nombre: 'Lubricentro', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (cambio de aceite, filtros, revision rapida)', tipo: 'textoLargo', obligatorio: true },
        { id: 'tiempoServicio', label: 'Cuanto demora el servicio? (opcional)', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'electricidad_automotor', nombre: 'Electricidad del automotor', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (diagnostico electrico, baterias, alarmas, audio)', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'accesorios_auto', nombre: 'Accesorios', camposEspecificos: [
        { id: 'productos', label: 'Productos que vende/instala (alarmas, tapizados, sonido, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'instalacionIncluida', label: 'La instalacion esta incluida en el precio?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'automotor_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
  {
    categoria: 'Belleza',
    subrubros: [
      { id: 'peluqueria', nombre: 'Peluqueria', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (corte, color, peinado, tratamientos) y duracion', tipo: 'textoLargo', obligatorio: true },
        { id: 'profesionales', label: 'Profesionales y sus horarios', tipo: 'textoLargo', obligatorio: true },
        { id: 'productos', label: 'Marcas/productos que utilizan (opcional)', tipo: 'textoLargo', obligatorio: false },
        { id: 'peinadosEventos', label: 'Hacen peinados para eventos (novias, egresados, quince)?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'barberia', nombre: 'Barberia', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (corte, barba, afeitado, etc.) y duracion', tipo: 'textoLargo', obligatorio: true },
        { id: 'profesionales', label: 'Barberos y sus horarios', tipo: 'textoLargo', obligatorio: true },
        { id: 'sistemaTurnos', label: 'Atiende con turno o por orden de llegada?', tipo: 'seleccionUnica', obligatorio: true,
          opciones: ['Con turno', 'Por orden de llegada', 'Ambos'] },
      ]},
      { id: 'manicuria', nombre: 'Manicuria', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (esculpidas, semipermanente, pedicura, nail art, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'duracionPromedio', label: 'Duracion promedio de cada servicio', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'estetica', nombre: 'Estetica', camposEspecificos: [
        { id: 'tratamientos', label: 'Tratamientos disponibles y duracion (faciales, corporales, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'requisitosPrevios', label: 'Requisitos previos a un tratamiento (opcional)', tipo: 'textoLargo', obligatorio: false },
      ]},
      { id: 'maquillaje', nombre: 'Maquillaje', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (social, novias, cursos de automaquillaje)', tipo: 'textoLargo', obligatorio: true },
        { id: 'trabajaEventos', label: 'Trabaja para eventos/casamientos a domicilio?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'spa', nombre: 'Spa', camposEspecificos: [
        { id: 'tratamientos', label: 'Tratamientos y masajes disponibles', tipo: 'textoLargo', obligatorio: true },
        { id: 'paquetes', label: 'Tienen paquetes o combos de tratamientos?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'depilacion', nombre: 'Depilacion', camposEspecificos: [
        { id: 'metodos', label: 'Metodos de depilacion (cera, laser, hilo, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'zonasDisponibles', label: 'Zonas del cuerpo que trabajan (opcional)', tipo: 'texto', obligatorio: false },
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
        { id: 'ventaOnline', label: 'Vende online? Hace envios?', tipo: 'textoLargo', obligatorio: false },
      ]},
      { id: 'reparacion_celulares', nombre: 'Tecnologia / Reparacion de celulares', camposEspecificos: [
        { id: 'servicios', label: 'Servicios tecnicos que ofrece (pantallas, baterias, software)', tipo: 'textoLargo', obligatorio: true },
        { id: 'marcasAtendidas', label: 'Marcas y modelos que reparan', tipo: 'textoLargo', obligatorio: true },
        { id: 'garantiaReparaciones', label: 'Garantia sobre reparaciones', tipo: 'texto', obligatorio: false },
        { id: 'reparaEnElDia', label: 'Reparan en el dia para casos simples?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'ferreteria', nombre: 'Ferreteria', camposEspecificos: [
        { id: 'rubrosProductos', label: 'Rubros de productos (electricidad, plomeria, herramientas, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'hacePedidosEspeciales', label: 'Consiguen productos que no tienen en stock por pedido?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'libreria', nombre: 'Libreria', camposEspecificos: [
        { id: 'productos', label: 'Productos (utiles, libros, fotocopias, imprenta, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'serviciosImpresion', label: 'Servicios de impresion/fotocopiado', tipo: 'textoLargo', obligatorio: false },
        { id: 'listasEscolares', label: 'Preparan listas escolares completas?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'kiosco', nombre: 'Kiosco / Almacen', camposEspecificos: [
        { id: 'productos', label: 'Rubros de productos (golosinas, bebidas, almacen, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'horarioNocturno', label: 'Atiende de noche/madrugada?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'perfumeria', nombre: 'Perfumeria', camposEspecificos: [
        { id: 'marcas', label: 'Marcas y lineas de productos que vende', tipo: 'textoLargo', obligatorio: true },
        { id: 'perfumesAlternativos', label: 'Venden perfumes de autor o alternativos?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'bazar_regaleria', nombre: 'Bazar / Regaleria', camposEspecificos: [
        { id: 'productos', label: 'Tipo de productos que vende', tipo: 'textoLargo', obligatorio: true },
        { id: 'armanRegalosEmpresariales', label: 'Arman regalos empresariales o para eventos?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'jugueteria', nombre: 'Jugueteria', camposEspecificos: [
        { id: 'productos', label: 'Tipo de juguetes y edades', tipo: 'textoLargo', obligatorio: true },
        { id: 'armanPinatas', label: 'Arman piñatas o cotillon para cumpleanos?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'zapateria', nombre: 'Zapateria', camposEspecificos: [
        { id: 'tipoCalzado', label: 'Tipo de calzado y marcas', tipo: 'textoLargo', obligatorio: true },
        { id: 'numeracion', label: 'Numeracion disponible', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'optica', nombre: 'Optica', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (armazones, lentes de contacto, examenes de vista)', tipo: 'textoLargo', obligatorio: true },
        { id: 'obrasSociales', label: 'Obras sociales aceptadas', tipo: 'textoLargo', obligatorio: false },
        { id: 'examenGratuito', label: 'El examen de vista tiene costo?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'comercio_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
  {
    categoria: 'Servicios profesionales',
    subrubros: [
      { id: 'estudio_juridico', nombre: 'Estudio juridico', camposEspecificos: [
        { id: 'areasPractica', label: 'Areas de practica (laboral, civil, penal, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'consultaInicial', label: 'La consulta inicial tiene costo?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'inmobiliaria', nombre: 'Inmobiliaria', camposEspecificos: [
        { id: 'tipoOperaciones', label: 'Tipo de operaciones (venta, alquiler, temporario)', tipo: 'seleccionMultiple', obligatorio: true,
          opciones: ['Venta', 'Alquiler', 'Alquiler temporario', 'Tasaciones'] },
        { id: 'zonasCobertura', label: 'Zonas donde opera', tipo: 'textoLargo', obligatorio: true },
      ]},
      { id: 'contador', nombre: 'Contador / Estudio contable', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (monotributo, sociedades, liquidaciones, balances)', tipo: 'textoLargo', obligatorio: true },
        { id: 'atiendeMonotributistas', label: 'Atienden monotributistas / autonomos?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'diseno_grafico', nombre: 'Diseno grafico', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (logos, redes, impresos, branding)', tipo: 'textoLargo', obligatorio: true },
        { id: 'tiempoEntrega', label: 'Tiempo estimado de entrega de un trabajo (opcional)', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'marketing_digital', nombre: 'Marketing digital', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (redes sociales, publicidad paga, SEO, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'rubrosClientes', label: 'Con que tipo de negocios trabajan habitualmente? (opcional)', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'desarrollo_web', nombre: 'Desarrollo web / Programacion', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (paginas web, apps, sistemas a medida)', tipo: 'textoLargo', obligatorio: true },
        { id: 'tecnologias', label: 'Tecnologias con las que trabajan (opcional)', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'fotografo', nombre: 'Fotografo', camposEspecificos: [
        { id: 'especialidad', label: 'Especialidad (eventos, retratos, productos, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'trabajaEventos', label: 'Trabaja en casamientos/eventos?', tipo: 'booleano', obligatorio: false },
        { id: 'entregaDigitalImpresa', label: 'Entrega las fotos digital, impresa o ambas?', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'traductor', nombre: 'Traductor', camposEspecificos: [
        { id: 'idiomas', label: 'Idiomas que traduce', tipo: 'textoLargo', obligatorio: true },
        { id: 'traduccionPublica', label: 'Hace traducciones publicas/certificadas?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'servicios_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
  {
    categoria: 'Educacion',
    subrubros: [
      { id: 'academia_cursos', nombre: 'Academia / Cursos', camposEspecificos: [
        { id: 'cursosOfrecidos', label: 'Cursos que ofrece', tipo: 'textoLargo', obligatorio: true },
        { id: 'modalidad', label: 'Modalidad', tipo: 'seleccionUnica', obligatorio: true, opciones: ['Presencial', 'Virtual', 'Hibrida'] },
        { id: 'duracionCursos', label: 'Duracion promedio de los cursos', tipo: 'texto', obligatorio: false },
        { id: 'entregaCertificado', label: 'Entregan certificado al finalizar?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'academia_idiomas', nombre: 'Academia de idiomas', camposEspecificos: [
        { id: 'idiomas', label: 'Idiomas que ensena y niveles', tipo: 'textoLargo', obligatorio: true },
        { id: 'modalidad', label: 'Modalidad', tipo: 'seleccionUnica', obligatorio: false, opciones: ['Presencial', 'Virtual', 'Hibrida'] },
        { id: 'examenNivelacion', label: 'Hacen examen de nivelacion gratuito?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'apoyo_escolar', nombre: 'Apoyo escolar / Clases particulares', camposEspecificos: [
        { id: 'materias', label: 'Materias y niveles (primaria, secundaria, universitario)', tipo: 'textoLargo', obligatorio: true },
        { id: 'modalidad', label: 'Modalidad', tipo: 'seleccionUnica', obligatorio: false, opciones: ['Presencial', 'Virtual', 'Ambas'] },
        { id: 'clasesIndividualesGrupales', label: 'Dan clases individuales, grupales o ambas?', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'jardin_maternal', nombre: 'Jardin maternal', camposEspecificos: [
        { id: 'edadesAtendidas', label: 'Edades que atiende', tipo: 'texto', obligatorio: true },
        { id: 'horarioExtendido', label: 'Tiene horario extendido?', tipo: 'booleano', obligatorio: false },
        { id: 'incluyeComida', label: 'Incluye comida/merienda?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'danza_musica', nombre: 'Instituto de danza / musica', camposEspecificos: [
        { id: 'disciplinas', label: 'Disciplinas o instrumentos que ensena', tipo: 'textoLargo', obligatorio: true },
        { id: 'edadesAtendidas', label: 'Edades / niveles que atiende', tipo: 'texto', obligatorio: false },
        { id: 'muestrasEspectaculos', label: 'Hacen muestras o espectaculos con los alumnos?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'educacion_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
  {
    categoria: 'Eventos y fiestas',
    subrubros: [
      { id: 'organizacion_eventos', nombre: 'Organizacion de eventos', camposEspecificos: [
        { id: 'tipoEventos', label: 'Tipo de eventos que organiza (casamientos, cumpleanos, corporativos)', tipo: 'textoLargo', obligatorio: true },
        { id: 'serviciosIncluidos', label: 'Que incluye el servicio (coordinacion, proveedores, dia del evento)?', tipo: 'textoLargo', obligatorio: false },
      ]},
      { id: 'alquiler_mobiliario', nombre: 'Alquiler de mobiliario', camposEspecificos: [
        { id: 'productos', label: 'Que alquila (mesas, sillas, vajilla, carpas, etc.)', tipo: 'textoLargo', obligatorio: true },
        { id: 'incluyeTraslado', label: 'El alquiler incluye traslado y armado?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'animacion_infantil', nombre: 'Animacion infantil', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (personajes, juegos, shows)', tipo: 'textoLargo', obligatorio: true },
        { id: 'edadesRecomendadas', label: 'Para que edades es el show? (opcional)', tipo: 'texto', obligatorio: false },
      ]},
      { id: 'dj_sonido', nombre: 'DJ / Sonido', camposEspecificos: [
        { id: 'servicios', label: 'Servicios (sonido, luces, DJ) y tipo de eventos', tipo: 'textoLargo', obligatorio: true },
        { id: 'equipoPropio', label: 'Llevan su propio equipo de sonido/luces?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'catering_eventos', nombre: 'Catering para eventos', camposEspecificos: [
        { id: 'menu', label: 'Opciones de menu para eventos', tipo: 'textoLargo', obligatorio: true },
        { id: 'cantidadMinima', label: 'Cantidad minima de personas', tipo: 'texto', obligatorio: false },
        { id: 'incluyeMozos', label: 'El servicio incluye mozos/atencion en el evento?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'salon_fiestas', nombre: 'Salon de fiestas', camposEspecificos: [
        { id: 'capacidad', label: 'Capacidad del salon', tipo: 'texto', obligatorio: true },
        { id: 'serviciosIncluidos', label: 'Que incluye el alquiler (mobiliario, catering, decoracion)', tipo: 'textoLargo', obligatorio: false },
        { id: 'estacionamiento', label: 'Tiene estacionamiento propio?', tipo: 'booleano', obligatorio: false },
      ]},
      { id: 'eventos_otros', nombre: 'Otros', camposEspecificos: CAMPOS_OTROS },
    ],
  },
];

module.exports = { RUBROS, CAMPOS_COMUNES };
