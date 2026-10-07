// Artículos del Centro de ayuda de Mi Asistente. Si cambiás algo de la app (pantallas, planes, pasos), actualizá el artículo que lo explica.
const AYUDA_TEMAS = [
  { id: 'empezar', nombre: 'Primeros pasos', color: 'azul' },
  { id: 'asistente', nombre: 'Tu asistente', color: 'violeta' },
  { id: 'pedidos', nombre: 'Pedidos y turnos', color: 'naranja' },
  { id: 'negocio', nombre: 'Catálogo y ofertas', color: 'verde' },
  { id: 'suscripcion', nombre: 'Suscripción', color: 'amarillo' },
  { id: 'cuenta', nombre: 'Cuenta y avisos', color: 'celeste' },
];

const AYUDA_ARTICULOS = [
  // ---- Primeros pasos
  { tema: 'empezar', t: 'Cómo empiezo a recibir clientes', c: ['Tu asistente atiende en un chat con su propio enlace. Compartilo en tus redes, en WhatsApp o imprimí el código QR para el mostrador.', 'Los encontrás en Herramientas → "Mi QR de chat" y "Enlace de mi chat". Cualquier persona que lo abra puede conversar con tu asistente sin instalar nada.'] },
  { tema: 'empezar', t: 'Probar el asistente antes de publicarlo', c: ['En Herramientas → "Probar al asistente" podés charlar como si fueras un cliente y ver cómo responde, qué ofrece y cómo toma un pedido o turno.', 'Los pedidos y turnos que se generan ahí están marcados como de prueba: no se mezclan con los reales ni con tus estadísticas. Podés borrarlos desde Ajustes → Privacidad.'] },
  { tema: 'empezar', t: 'Qué hay en cada pestaña', c: ['Inicio: el resumen del día y lo que necesita tu atención. Pedidos (o Consultas, si trabajás con turnos): lo que llega por el chat. Agenda: tu organización personal con ayuda de IA.', 'Herramientas: compartir, probar, promociones y análisis. Negocio: catálogo, fotos, horarios, disponibilidad y cómo atiende el asistente. Ajustes: tu cuenta, avisos, seguridad y ayuda.'] },
  { tema: 'empezar', t: 'Registrar mi negocio en Mi Zona', c: ['Si usás Mi Zona, desde Herramientas → "Registrá tu negocio" lo creás ahí para que más clientes lo encuentren. Tu asistente queda vinculado automáticamente: no tenés que copiar ningún código.'] },

  // ---- Tu asistente
  { tema: 'asistente', t: 'Qué puede hacer mi asistente', c: ['Responde consultas sobre tu negocio, muestra productos y precios, recomienda, menciona tus promociones y toma pedidos o turnos reales que aparecen en tu panel.', 'Solo hace lo que tiene permiso de hacer: lo controlás en Negocio → "Vendedor y memoria". No inventa precios, no aplica descuentos por su cuenta y no devuelve dinero.'] },
  { tema: 'asistente', t: 'Qué hace cuando no sabe una respuesta', c: ['No inventa. La pregunta queda guardada en Negocio → "Preguntas frecuentes" y recibís un aviso.', 'Contestala una sola vez ahí: desde ese momento tu asistente ya sabe la respuesta para la próxima persona que pregunte lo mismo.'] },
  { tema: 'asistente', t: 'Modo vendedor y permisos', c: ['En Negocio → "Vendedor y memoria" elegís qué tan activamente empuja para cerrar una venta (suave, normal o agresivo). Eso no cambia su honestidad: nunca miente.', 'También podés permitir o no que recomiende productos, mencione promociones, tome pedidos o turnos, y trate de cerrar la venta.'] },
  { tema: 'asistente', t: 'La memoria de clientes', c: ['Si está activa, el asistente reconoce a quien ya compró antes (su nombre, su último pedido, su dirección) y lo atiende como cliente conocido.', 'Podés apagarla en Negocio → "Vendedor y memoria". Apagarla no borra lo ya guardado: para eso usá Ajustes → Privacidad → "Borrar fichas de clientes".'] },
  { tema: 'asistente', t: 'Atención solo en horario', c: ['Si activás "atención solo en horario", fuera de tus horarios el asistente responde un mensaje fijo y no usa IA. Si no, atiende las 24 horas.'] },

  // ---- Pedidos y turnos
  { tema: 'pedidos', t: 'Cómo gestiono los pedidos', c: ['Cada pedido llega a la pestaña Pedidos con su estado: pendiente, confirmado, en preparación, listo o entregado. Tocá "Cambiar estado" para avanzarlo.', 'Los pendientes también aparecen en el inicio y en tus notificaciones, y te llegan al celular si activaste los avisos.'] },
  { tema: 'pedidos', t: 'Pagos por transferencia y comprobantes', c: ['Cuando alguien paga por transferencia, adjunta la foto del comprobante en el chat y vos recibís un aviso.', 'Mi Asistente nunca da un pago por válido solo: revisás tu cuenta bancaria y lo confirmás (o lo rechazás) desde el pedido.'] },
  { tema: 'pedidos', t: 'Cómo funcionan los turnos', c: ['Si tu negocio trabaja con turnos, la pestaña se llama Consultas. El asistente ofrece solo los horarios libres según tus horarios, profesionales y la duración de cada motivo.', 'Podés pedir que cada turno quede "pendiente" hasta que lo apruebes, o que se confirme solo. Los turnos nuevos te llegan como notificación.'] },
  { tema: 'pedidos', t: 'Disponibilidad de hoy y zonas de delivery', c: ['En Negocio → "Disponibilidad de hoy" anotás lo que hoy no hay (se agotó, sin stock): el asistente deja de ofrecerlo y de tomarlo en pedidos.', 'En "Zonas de delivery" cargás cuánto cobrás de envío según la zona, así el asistente no inventa el costo.'] },

  // ---- Catálogo y ofertas
  { tema: 'negocio', t: 'Cargar mis productos y servicios', c: ['En Negocio → "Productos y servicios" cargás tu catálogo con precios, stock y fotos. El asistente solo ofrece lo que está cargado, con los precios que pusiste.'] },
  { tema: 'negocio', t: 'Fotos, logo y carta', c: ['En Negocio → "Fotos del negocio" subís tu logo, la carta o menú y fotos de productos. Cuando un cliente pide ver el menú, el asistente muestra las fotos que correspondan.'] },
  { tema: 'negocio', t: 'Promociones', c: ['En Herramientas → "Promociones" publicás descuentos, 2x1 o lo que quieras, con fecha límite, horario, usos máximos y a qué producto aplican. El asistente las menciona cuando conversa (si le diste permiso).'] },
  { tema: 'negocio', t: 'Clientes destacados (ranking)', c: ['En Herramientas → "Clientes destacados" elegís por qué se premia (dinero gastado, compras, visitas, fidelidad) y qué premio recibe cada puesto del podio.', 'Si el premio es un porcentaje de descuento, el asistente lo aplica de verdad al total de la compra.'] },
  { tema: 'negocio', t: 'Oportunidades de venta y tendencias', c: ['"Oportunidades de venta" te muestra clientes que no compraron o dejaron de volver. "Tendencias" te muestra qué se consulta y se pide más. Ambas están en Herramientas.'] },

  // ---- Suscripción
  { tema: 'suscripcion', t: 'Período de prueba', c: ['Al crear tu asistente tenés mensajes de prueba gratis para ver cómo funciona con clientes reales. Cuando se acaban, necesitás un plan para seguir atendiendo.', 'Te avisamos cuando quedan pocos.'] },
  { tema: 'suscripcion', t: 'Planes y cómo pagar', c: ['En Ajustes → "Plan y facturación" elegís entre los planes de 1, 3, 5 o 6 meses. Pagás con Mercado Pago y la suscripción se activa sola al confirmarse el pago.', 'Cuantos más meses elegís, menos pagás por mes.'] },
  { tema: 'suscripcion', t: 'Renovar antes de que venza', c: ['Si renovás antes del vencimiento, los meses nuevos se suman al tiempo que te queda: no perdés nada.', 'Te avisamos 7, 3 y 1 día antes, y cuando vence (en el panel y en el celular, si activaste los avisos).'] },
  { tema: 'suscripcion', t: 'Qué pasa si vence', c: ['Si la suscripción vence, tu asistente deja de atender a tus clientes. Tus datos, productos y configuración se conservan: al renovar, vuelve a funcionar como siempre.'] },

  // ---- Cuenta y avisos
  { tema: 'cuenta', t: 'Activar avisos en el celular', c: ['En Ajustes → "Notificaciones" tocá "Activar en este dispositivo". Vas a recibir un aviso cuando llegue un pedido, un turno, un comprobante o una reseña, aunque tengas el panel cerrado.', 'Se activan por dispositivo. En iPhone: abrí el panel en Safari → Compartir → "Agregar a pantalla de inicio" y activalos desde ahí.'] },
  { tema: 'cuenta', t: 'Elegir qué avisos recibir', c: ['En Ajustes → "Notificaciones" prendés o apagás cada tipo de aviso: pedidos, turnos, comprobantes, reseñas, preguntas sin responder y suscripción. El centro de notificaciones del panel (la campana) siempre muestra todo.'] },
  { tema: 'cuenta', t: 'Cambiar mi contraseña o cerrar sesiones', c: ['En Ajustes → "Seguridad" podés cambiar tu contraseña (si entrás con correo) y cerrar la sesión en todos los demás dispositivos. Si entrás con Google, la contraseña se administra desde tu cuenta de Google.', 'En "Actividad reciente" ves los inicios de sesión de los últimos 90 días.'] },
  { tema: 'cuenta', t: 'Descargar o borrar mis datos', c: ['En Ajustes → "Privacidad" podés descargar una copia de todos tus datos, borrar el historial de conversaciones, las fichas de clientes, las calificaciones y los pedidos de prueba.', 'Para eliminar la cuenta y el negocio por completo, entrá a Ajustes → "Mi cuenta" → "Eliminar cuenta". No se puede deshacer.'] },
  { tema: 'cuenta', t: 'Cambiar el aspecto del panel', c: ['En Ajustes → "Apariencia" elegís tema claro, oscuro o automático, el color de acento y el tamaño del texto. Se guarda en este dispositivo.'] },
];
