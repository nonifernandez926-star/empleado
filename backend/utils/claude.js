const Anthropic = require('@anthropic-ai/sdk');
const Pedido = require('../models/Pedido');
const Turno = require('../models/Turno');
const Cliente = require('../models/Cliente');
const { calcularHorariosDisponibles } = require('./turnos');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

const DIAS_ORDEN = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function formatearHorarios(horarios) {
  horarios = horarios || [];
  if (!horarios.length) return 'No se cargaron horarios todavia.';
  return DIAS_ORDEN
    .map((dia) => {
      const h = horarios.find((x) => x.dia === dia);
      if (!h || !h.activo || !h.bloques || !h.bloques.length) return dia + ': cerrado';
      const bloques = h.bloques.map((b) => b.apertura + ' a ' + b.cierre).join(' y ');
      return dia + ': ' + bloques;
    })
    .join('\n');
}

function formatearFormData(formData) {
  formData = formData || {};
  return Object.entries(formData)
    .filter(function (entry) {
      const valor = entry[1];
      return valor !== '' && valor !== undefined && valor !== null && !(Array.isArray(valor) && valor.length === 0);
    })
    .map(function (entry) {
      const clave = entry[0];
      const valor = entry[1];
      return '- ' + clave + ': ' + (Array.isArray(valor) ? valor.join(', ') : valor);
    })
    .join('\n');
}

function descripcionPersonalidad(personalidad) {
  personalidad = personalidad || {};
  const estilos = {
    profesional_cercano: 'profesional pero cercano',
    amable_carismatico: 'amable y carismatico',
    juvenil_energetico: 'juvenil y energetico',
    elegante_exclusivo: 'elegante y exclusivo',
    tranquilo_confiable: 'tranquilo y confiable',
  };
  const formalidad = personalidad.formalidad > 6 ? 'muy casual' : personalidad.formalidad < 4 ? 'formal' : 'balanceado entre formal y casual';
  const energia = personalidad.energia > 6 ? 'divertido y con energia' : personalidad.energia < 4 ? 'serio' : 'con energia moderada';
  const conversacion = personalidad.conversacion > 6 ? 'conversador, le gusta dar contexto' : personalidad.conversacion < 4 ? 'directo y conciso' : 'balanceado';

  let texto = 'Estilo general: ' + (estilos[personalidad.estilo] || 'amable y carismatico') + '.\n';
  texto += 'Tono: ' + formalidad + '.\n';
  texto += 'Energia: ' + energia + '.\n';
  texto += 'Forma de responder: ' + conversacion + '.\n';
  if (personalidad.descripcionLibre) {
    texto += 'Instruccion adicional del negocio sobre como debe comportarse: "' + personalidad.descripcionLibre + '"';
  }
  return texto;
}

// Herramienta que Claude puede usar para registrar un pedido REAL en la base de datos.
const HERRAMIENTAS_PEDIDOS = [
  {
    name: 'registrar_pedido',
    description: 'Registra en el sistema del negocio un pedido que el cliente ya confirmo explicitamente (despues de mostrarle el resumen y que haya dicho que si). No usar antes de la confirmacion del cliente.',
    input_schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          description: 'Productos o servicios pedidos',
          items: {
            type: 'object',
            properties: {
              producto: { type: 'string', description: 'Nombre del producto o servicio' },
              cantidad: { type: 'number', description: 'Cantidad pedida' },
              precioUnitario: { type: 'number', description: 'Precio unitario, solo si el negocio informa precios y se conoce' },
            },
            required: ['producto', 'cantidad'],
          },
        },
        nombreCliente: { type: 'string', description: 'Nombre del cliente que hace el pedido' },
        telefonoCliente: { type: 'string', description: 'Telefono de contacto del cliente (siempre pedirlo, es obligatorio)' },
        tipoEntrega: { type: 'string', enum: ['delivery', 'retiro'], description: 'Si el cliente pidio delivery o retira en el local' },
        direccionEntrega: { type: 'string', description: 'Direccion de entrega, solo si es delivery' },
        formaPago: { type: 'string', description: 'Forma de pago acordada' },
        observaciones: { type: 'string', description: 'Cualquier aclaracion adicional del pedido' },
      },
      required: ['items', 'nombreCliente', 'telefonoCliente', 'tipoEntrega', 'formaPago'],
    },
  },
];

// Herramientas para negocios que funcionan con turnos (medicos, peluquerias, talleres, etc.)
const HERRAMIENTAS_TURNOS = [
  {
    name: 'consultar_turnos_disponibles',
    description: 'Consulta que horarios estan libres en una fecha puntual, segun el motivo de consulta (que define cuanto dura el turno). Usar esto ANTES de ofrecerle horarios al cliente - nunca inventar horarios de memoria.',
    input_schema: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        motivo: { type: 'string', description: 'Motivo de consulta, tiene que ser uno de los que el negocio configuro' },
        profesional: { type: 'string', description: 'Nombre del profesional, solo si el negocio tiene mas de uno y el cliente eligio o hay que ofrecerle elegir' },
      },
      required: ['fecha', 'motivo'],
    },
  },
  {
    name: 'registrar_turno',
    description: 'Reserva en el sistema un turno que el cliente ya confirmo explicitamente, en un horario que devolvio consultar_turnos_disponibles. Nunca reservar un horario que no salio en esa consulta.',
    input_schema: {
      type: 'object',
      properties: {
        fecha: { type: 'string', description: 'Fecha en formato YYYY-MM-DD' },
        hora: { type: 'string', description: 'Hora en formato HH:MM, tiene que ser una de las que devolvio consultar_turnos_disponibles' },
        motivo: { type: 'string', description: 'Motivo de la consulta' },
        profesional: { type: 'string', description: 'Nombre del profesional, si el negocio tiene mas de uno' },
        nombreCliente: { type: 'string', description: 'Nombre del cliente' },
        telefonoCliente: { type: 'string', description: 'Telefono de contacto del cliente (siempre pedirlo, es obligatorio)' },
        notas: { type: 'string', description: 'Cualquier aclaracion adicional' },
      },
      required: ['fecha', 'hora', 'motivo', 'nombreCliente', 'telefonoCliente'],
    },
  },
];


// Frases que indican que el asistente no tuvo la informacion para responder (para el panel de "preguntas sin respuesta")
const PATRONES_SIN_RESPUESTA = [
  /no tengo esa informaci[oó]n/i,
  /no tengo registrado/i,
  /no tengo esa informaci[oó]n en este momento/i,
  /te recomiendo consultarlo directamente/i,
  /no cuento con esa informaci[oó]n/i,
];

function detectarSinRespuesta(textoRespuesta) {
  return PATRONES_SIN_RESPUESTA.some(function (regex) {
    return regex.test(textoRespuesta || '');
  });
}

function descripcionModoVendedor(modoVendedor) {
  if (modoVendedor === 'apagado') {
    return 'Modo vendedor: INFORMATIVO.';
  }
  if (modoVendedor === 'suave') {
    return 'Modo vendedor: SUAVE. Recomendá productos/servicios como mucho una vez, de forma relajada, y seguí la conversación en la dirección que el cliente elija. Nunca insistas ni vuelvas sobre algo que ya rechazó.';
  }
  if (modoVendedor === 'agresivo') {
    return 'Modo vendedor: ACTIVO. Buscá activamente guiar la charla hacia cerrar el pedido/turno - proponé el siguiente paso concreto (una fecha, un horario, un producto) en vez de dejar la conversación abierta, y si el cliente duda ofrecele la opción que más se ajuste a lo que pidió. Esto NUNCA significa mentir, inventar disponibilidad o precios, o insistir después de un "no" claro - el cliente se tiene que sentir cómodo, no presionado.';
  }
  return 'Modo vendedor: NORMAL. Guiá la conversación de forma natural hacia cerrar el pedido/turno cuando el cliente muestre interés, sin ser insistente ni pasivo.';
}

function construirSystemPrompt(negocio, clienteConocido, productos) {
  const nombre = (negocio.formData && negocio.formData.nombreNegocio) || 'el negocio';
  const mostrarPrecios = negocio.formData && negocio.formData.mostrarPrecios;
  const permisos = negocio.permisos || {};
  const permiteRecomendar = permisos.recomendarProductos !== false;
  const permitePromos = permisos.ofrecerPromociones !== false;
  const permiteTomarPedidosOTurnos = permisos.tomarPedidosOTurnos !== false;
  const permiteCerrarVenta = permisos.intentarCerrarVenta !== false;

  let prompt = 'Sos el asistente virtual del negocio "' + nombre + '" (rubro: ' + negocio.rubroCategoria + ' - ' + negocio.rubroSubrubro + ').\n\n';

  prompt += 'REGLA MAS IMPORTANTE - NUNCA LA ROMPAS:\n';
  prompt += 'Solo podes usar la informacion que aparece abajo en "INFORMACION DEL NEGOCIO". Si te preguntan algo que no esta ahi (un precio, un horario, un servicio, una promocion, disponibilidad), NUNCA lo inventes. Respondé algo como: "No tengo esa informacion en este momento, te recomiendo consultarlo directamente con el negocio." No pidas disculpas de mas ni des rodeos, solo indicalo con naturalidad y ofrece ayudar en otra cosa.\n\n';

  if (mostrarPrecios === false) {
    prompt += 'Este negocio decidio NO informar precios por chat. Si preguntan precios, indica que deben consultarlo directamente con el negocio. Nunca uses precios en un pedido si no los tenes.\n\n';
  }

  if (productos && productos.length) {
    prompt += 'CATALOGO REAL DE PRODUCTOS/SERVICIOS (esta es la unica fuente valida de precios y stock - nunca inventes un producto que no este aca, ni un precio distinto al de aca):\n';
    productos.forEach(function (p) {
      const partes = [p.nombre];
      if (p.categoria) partes.push('[' + p.categoria + ']');
      if (p.precio !== undefined && p.precio !== null && mostrarPrecios !== false) partes.push('$' + p.precio);
      if (!p.disponibleHoy) partes.push('NO DISPONIBLE HOY');
      if (p.stock === 0) partes.push('SIN STOCK');
      else if (typeof p.stock === 'number') partes.push('stock: ' + p.stock);
      if (p.descripcion) partes.push('- ' + p.descripcion);
      if (p.tamanoPorcion) partes.push('(' + p.tamanoPorcion + ')');
      if (p.aptoPara) partes.push('Apto: ' + p.aptoPara);
      if (p.duracionEstimada) partes.push('Duracion: ' + p.duracionEstimada);
      if (p.variantes && p.variantes.length) {
        partes.push('Variantes: ' + p.variantes.map(function (v) { return v.nombre + (typeof v.stock === 'number' ? ' (stock ' + v.stock + ')' : ''); }).join(', '));
      }
      if (!p.recomendar) partes.push('[el dueno pidio no recomendar este producto activamente, solo mencionarlo si preguntan puntualmente]');
      prompt += '- ' + partes.join(' ') + '\n';
    });
    prompt += '\nSi un producto dice "NO DISPONIBLE HOY" o "SIN STOCK", nunca lo ofrezcas ni lo tomes en un pedido - avisale al cliente y ofrecele algo similar que si este disponible. Si preguntan por una variante puntual (ej: un talle) que tiene stock 0, decilo con claridad y ofrece las variantes que si tienen stock.\n\n';
  }

  if (negocio.disponibilidadHoy) {
    prompt += 'IMPORTANTE - DISPONIBILIDAD DE HOY:\n';
    prompt += 'El negocio marco que lo siguiente NO esta disponible hoy (agotado, sin stock, etc.): "' + negocio.disponibilidadHoy + '"\n';
    prompt += 'Nunca recomiendes ni tomes un pedido de algo que este en esa lista. Si el cliente lo pide, avisale que hoy no esta disponible y ofrecele una alternativa si tiene sentido.\n\n';
  }

  const promosActivas = permitePromos ? (negocio.promociones || []).filter(function (p) { return p.activa; }) : [];
  if (promosActivas.length) {
    prompt += 'PROMOCIONES VIGENTES (podes mencionarlas cuando tengan sentido en la charla, por ejemplo si preguntan precios, el menu, o si hay descuentos - no hace falta esperar a que pregunten puntualmente por promociones):\n';
    promosActivas.forEach(function (p) {
      prompt += '- ' + p.titulo + (p.descripcion ? ': ' + p.descripcion : '') + '\n';
    });
    prompt += 'Nunca inventes una promocion que no este en esta lista, ni apliques un descuento que el cliente no pidio explicitamente que le calcules segun una de estas promociones reales.\n\n';
  } else if (!permitePromos) {
    prompt += 'Este negocio pidio que NO menciones promociones ni descuentos por chat, aunque haya alguna cargada. Si preguntan por descuentos, respondé con naturalidad que por el momento no hay, sin dar mas detalle.\n\n';
  }

  if (clienteConocido) {
    prompt += 'MEMORIA DEL CLIENTE - ya hablaste antes con esta persona:\n';
    if (clienteConocido.nombre) prompt += 'Nombre: ' + clienteConocido.nombre + '. ';
    if (clienteConocido.totalPedidos) prompt += 'Ya hizo ' + clienteConocido.totalPedidos + ' pedido(s) antes. ';
    if (clienteConocido.totalTurnos) prompt += 'Ya saco ' + clienteConocido.totalTurnos + ' turno(s) antes. ';
    prompt += '\n';
    if (clienteConocido.ultimoPedido && clienteConocido.ultimoPedido.items && clienteConocido.ultimoPedido.items.length) {
      const itemsTexto = clienteConocido.ultimoPedido.items.map(function (i) { return i.cantidad + 'x ' + i.producto; }).join(', ');
      prompt += 'Su ultimo pedido fue: ' + itemsTexto + ' (' + clienteConocido.ultimoPedido.tipoEntrega + ').\n';
    }
    if (clienteConocido.ultimoTurno && clienteConocido.ultimoTurno.motivo) {
      prompt += 'Su ultimo turno fue por "' + clienteConocido.ultimoTurno.motivo + '"' + (clienteConocido.ultimoTurno.profesional ? ' con ' + clienteConocido.ultimoTurno.profesional : '') + '.\n';
    }
    prompt += 'Podes saludarlo por su nombre si lo tenes, y si tiene sentido en la charla ofrecele repetir lo de la ultima vez (el mismo pedido, o el mismo motivo/profesional del ultimo turno) - pero no lo fuerces si no viene al caso, y si te dice que quiere otra cosa segui con eso sin insistir.\n\n';
  }

  if (permiteRecomendar) {
    prompt += 'SUGERENCIAS INTELIGENTES (esto ayuda a vender mas, es parte importante de tu trabajo):\n';
    prompt += 'Cuando el cliente pida algo, si tenes informacion de otro producto o servicio que combine bien (por ejemplo una bebida con una comida, o un accesorio con un producto principal), ofreceselo de forma natural y breve, una sola vez por pedido. No insistas si te dice que no. Nunca sugieras algo que no este en la informacion del negocio.\n\n';
  } else {
    prompt += 'Este negocio pidio que NO recomiendes productos/servicios de forma proactiva. Respondé solo lo que te preguntan puntualmente, sin ofrecer nada extra por tu cuenta.\n\n';
  }

  prompt += descripcionModoVendedor(permiteCerrarVenta ? negocio.modoVendedor : 'apagado');
  if (!permiteCerrarVenta) {
    prompt += ' Este negocio pidio ademas que NO busques activamente cerrar la venta/turno - respondé las preguntas, informa con claridad, y si el cliente quiere avanzar dejalo avanzar, pero no propongas vos el siguiente paso ni insistas para que decida.';
  }
  prompt += '\n\n';


  prompt += 'FORMATO DE TEXTO:\n';
  prompt += 'Si queres resaltar algo importante (un nombre de producto, un dato clave, un precio), envolvelo entre dos asteriscos asi: **texto**. No uses mayusculas sostenidas ni comillas para resaltar. No abuses de la negrita, solo lo realmente importante.\n\n';

  prompt += 'COMO MOSTRAR EL MENU O CATALOGO:\n';
  prompt += 'Si el cliente pregunta "que tienen?" o algo similar, no respondas todo junto en un parrafo. Organizalo como una carta, agrupado por categorias, con este estilo (usando la informacion real que tenes abajo):\n\n';
  prompt += 'CATEGORIA\nNombre del producto - breve descripcion si la tenes\n\n';
  prompt += 'Si el cliente pregunta por una categoria especifica, mostra solo esa categoria. Si pide el menu completo, mostralo organizado por categorias.\n\n';

  if (!permiteTomarPedidosOTurnos) {
    prompt += 'IMPORTANTE - ESTE NEGOCIO PIDIO QUE NO TOMES PEDIDOS NI RESERVES TURNOS POR TU CUENTA:\n';
    prompt += 'Podes responder preguntas, mostrar precios/catalogo/turnos disponibles si corresponde, pero NUNCA uses ninguna herramienta para registrar un pedido o un turno. Si el cliente quiere avanzar con eso, indicale que se comunique directamente por WhatsApp con el negocio para coordinarlo.\n\n';
  } else if (negocio.tipoOperacion === 'turnos') {
    const motivos = (negocio.configTurnos && negocio.configTurnos.motivos) || [];
    const profesionales = (negocio.profesionales || []).filter(function (p) { return p.activo; });

    prompt += 'ESTE NEGOCIO FUNCIONA CON TURNOS (no con pedidos):\n';
    if (!motivos.length) {
      prompt += 'El negocio todavia no cargo los motivos de consulta con su duracion, asi que no podes reservar turnos todavia. Juntale al cliente nombre, telefono y que necesita, y decile que el negocio se va a comunicar para coordinar.\n\n';
    } else {
      prompt += 'Motivos de consulta disponibles y su duracion:\n';
      motivos.forEach(function (m) { prompt += '- ' + m.nombre + ' (' + m.duracionMinutos + ' minutos)\n'; });
      prompt += '\n';
      if (profesionales.length > 1) {
        prompt += 'Hay varios profesionales: ' + profesionales.map(function (p) { return p.nombre; }).join(', ') + '. Si el cliente no elige uno, preguntale con cual prefiere o si no tiene preferencia.\n\n';
      } else if (profesionales.length === 1) {
        prompt += 'El profesional que atiende es: ' + profesionales[0].nombre + '.\n\n';
      }
      prompt += 'Flujo para sacar un turno: primero entende que motivo de consulta necesita el cliente (tiene que ser uno de los de la lista de arriba) y en que fecha le gustaria. Despues usa la herramienta "consultar_turnos_disponibles" con esa fecha y motivo para saber que horarios estan realmente libres - NUNCA inventes ni asumas horarios de memoria. Ofrecele al cliente 2 o 3 opciones de las que te devolvio la herramienta (no todas si son muchas). Cuando el cliente elija un horario y confirme, pedile nombre y telefono si todavia no los tenes, y recien ahi usa la herramienta "registrar_turno" con esos datos exactos. Todo esto debe resolverse dentro de la misma conversacion - no dejes un turno a medio confirmar.\n\n';
      if (negocio.configTurnos && negocio.configTurnos.requiereAprobacionManual) {
        prompt += 'Este negocio revisa cada turno a mano antes de confirmarlo del todo. Despues de reservarlo con la herramienta, decile al cliente que su turno quedo reservado pendiente de confirmacion del negocio, y que le va a avisar. Nunca digas que el turno esta "confirmado" en este caso, usa "reservado, pendiente de confirmacion".\n\n';
      } else {
        prompt += 'Este negocio confirma los turnos automaticamente apenas se reservan. Podes decirle al cliente que su turno quedo confirmado.\n\n';
      }
    }
    prompt += 'Si un cliente ya esta a mitad de sacar un turno o haciendo una consulta y llega OTRO cliente nuevo en una conversacion distinta, no hay problema - son conversaciones separadas y cada una se atiende de forma independiente, no hace falta avisarle a nadie que espere.\n\n';
  } else {
    prompt += 'COMO TOMAR UN PEDIDO (esto es central en tu trabajo):\n';
    prompt += 'Si el cliente quiere pedir algo, guialo conversacionalmente para juntar todos los datos necesarios: que producto/servicio, cantidad, si es delivery o retiro (y la direccion si es delivery), forma de pago, y cualquier observacion. SIEMPRE pedile tambien su nombre y su numero de telefono, sin excepcion (es obligatorio, sirve como respaldo del negocio). No pidas todo junto en una sola pregunta larga, anda guiando paso a paso de forma natural.\n\n';
    prompt += 'Cuando tengas todos los datos, mostrale un resumen claro antes de confirmar, con emojis y ordenado (incluyendo el total a pagar si hay precios cargados, sumando el costo de envio si corresponde), y preguntale si confirma.\n\n';
    prompt += 'SOLO cuando el cliente confirme explicitamente (diga que si, que confirma, etc.), usa la herramienta "registrar_pedido" para guardarlo de verdad en el sistema. Nunca digas que un pedido quedo registrado sin haber usado esa herramienta. Despues de que la herramienta confirme que se guardo, avisale al cliente que su pedido quedo registrado.\n\n';
    prompt += 'Si el negocio no tiene cargados productos/servicios claros para tomar pedidos de esa forma, o el pedido es algo que no podes resolver por chat, indicale al cliente el WhatsApp del negocio como alternativa, pero esto es un respaldo, no el camino principal.\n\n';
  }

  if (permiteTomarPedidosOTurnos) {
    prompt += 'PAGO POR TRANSFERENCIA (muy importante, seguir estos pasos en orden):\n';
    prompt += 'Si el cliente elige pagar por transferencia:\n';
    prompt += '1) Decile el monto TOTAL exacto que debe transferir (productos + costo de envio si aplica).\n';
    if (negocio.formData && negocio.formData.aliasCbu) {
      prompt += '2) Dale este alias o CBU del negocio para transferir: "' + negocio.formData.aliasCbu + '".\n';
    } else {
      prompt += '2) Este negocio no cargo un alias/CBU todavia. Avisale al cliente que consulte el medio de pago directamente con el negocio por WhatsApp.\n';
    }
    prompt += '3) Pedile que, apenas transfiera, adjunte la foto del comprobante ahi mismo en el chat (hay un boton para adjuntar archivos).\n';
    prompt += '4) Cuando el cliente te diga que ya transfirio o que ya mando el comprobante, respondele SIEMPRE algo como: "Perfecto, gracias. El negocio va a revisar que la transferencia haya llegado correctamente y va a confirmar tu pedido a la brevedad." NUNCA le digas que el pago ya esta confirmado o verificado vos mismo - esa decision la toma unicamente el dueño del negocio revisando su cuenta bancaria real, vos no podes saber si una transferencia es autentica solo mirando una imagen.\n\n';
  }

  prompt += 'PERSONALIDAD DEL ASISTENTE:\n' + descripcionPersonalidad(negocio.personalidad) + '\n\n';
  prompt += 'INFORMACION DEL NEGOCIO:\n' + formatearFormData(negocio.formData) + '\n\n';
  prompt += 'HORARIOS DE ATENCION:\n' + formatearHorarios(negocio.horarios) + '\n\n';
  prompt += 'Responde siempre en espanol, de forma natural, como si fueras parte del equipo del negocio. Interpreta la intencion del cliente aunque escriba informal o con errores. Se breve y claro, no generes respuestas innecesariamente largas.';

  return prompt;
}

// Ejecuta la herramienta registrar_pedido: guarda el pedido REAL en MongoDB
// y actualiza (o crea) el perfil del cliente para que el asistente lo recuerde despues.
async function ejecutarRegistrarPedido(negocio, sesionClienteId, input) {
  const items = input.items || [];
  const tieneTodosLosPrecios = items.length > 0 && items.every(function (i) { return typeof i.precioUnitario === 'number'; });
  const total = tieneTodosLosPrecios
    ? items.reduce(function (acc, i) { return acc + i.precioUnitario * i.cantidad; }, 0)
    : undefined;

  const esTransferencia = /transfer/i.test(input.formaPago || '');

  const pedido = await Pedido.create({
    negocioId: negocio._id,
    sesionClienteId: sesionClienteId,
    items: items,
    total: total,
    nombreCliente: input.nombreCliente,
    telefonoCliente: input.telefonoCliente,
    tipoEntrega: input.tipoEntrega,
    direccionEntrega: input.direccionEntrega,
    formaPago: input.formaPago,
    observaciones: input.observaciones,
    estado: 'pendiente',
    estadoPago: esTransferencia ? 'esperando_comprobante' : 'no_aplica',
  });

  // Actualizamos (o creamos) el perfil de cliente recurrente para este negocio,
  // salvo que el dueño haya apagado la memoria de clientes.
  if (negocio.memoriaActiva !== false) {
    await Cliente.findOneAndUpdate(
      { negocioId: negocio._id, sesionClienteId: sesionClienteId },
      {
        $set: {
          nombre: input.nombreCliente,
          telefono: input.telefonoCliente,
          ultimoPedido: {
            fecha: new Date(),
            items: items.map(function (i) { return { producto: i.producto, cantidad: i.cantidad }; }),
            tipoEntrega: input.tipoEntrega,
          },
        },
        $inc: { totalPedidos: 1 },
      },
      { upsert: true, new: true }
    );
  }

  return { exito: true, pedidoId: pedido._id.toString(), estado: pedido.estado };
}

// Ejecuta consultar_turnos_disponibles: calcula horarios libres de verdad contra los turnos ya guardados
async function ejecutarConsultarTurnosDisponibles(negocio, input) {
  const motivoConfig = (negocio.configTurnos && negocio.configTurnos.motivos || []).find(function (m) { return m.nombre === input.motivo; });
  if (!motivoConfig) {
    const nombresValidos = (negocio.configTurnos && negocio.configTurnos.motivos || []).map(function (m) { return m.nombre; });
    return { error: 'Ese motivo no existe. Los motivos validos son: ' + nombresValidos.join(', ') };
  }

  const turnosExistentes = await Turno.find({
    negocioId: negocio._id,
    fecha: input.fecha,
    estado: { $in: ['pendiente', 'confirmado'] },
  });

  const horarios = calcularHorariosDisponibles({
    negocio: negocio,
    fecha: input.fecha,
    duracionMinutos: motivoConfig.duracionMinutos,
    profesional: input.profesional || '',
    turnosExistentes: turnosExistentes,
    ahora: new Date(),
  });

  if (!horarios.length) {
    return { horariosDisponibles: [], mensaje: 'No hay horarios libres ese dia para ese motivo. Ofrecele al cliente probar otra fecha.' };
  }
  return { horariosDisponibles: horarios, duracionMinutos: motivoConfig.duracionMinutos };
}

// Ejecuta registrar_turno: reserva el horario DE VERDAD (si ya lo tomo otro cliente, el indice
// unico de Mongo rechaza la creacion, asi evitamos que dos personas se lleven el mismo horario).
async function ejecutarRegistrarTurno(negocio, sesionClienteId, input) {
  const motivoConfig = (negocio.configTurnos && negocio.configTurnos.motivos || []).find(function (m) { return m.nombre === input.motivo; });
  const duracionMinutos = motivoConfig ? motivoConfig.duracionMinutos : 30;
  const requiereAprobacion = !!(negocio.configTurnos && negocio.configTurnos.requiereAprobacionManual);

  let turno;
  try {
    turno = await Turno.create({
      negocioId: negocio._id,
      sesionClienteId: sesionClienteId,
      fecha: input.fecha,
      hora: input.hora,
      duracionMinutos: duracionMinutos,
      motivo: input.motivo,
      profesional: input.profesional || '',
      nombreCliente: input.nombreCliente,
      telefonoCliente: input.telefonoCliente,
      notas: input.notas || '',
      estado: requiereAprobacion ? 'pendiente' : 'confirmado',
      origen: 'asistente',
    });
  } catch (error) {
    if (error.code === 11000) {
      return { error: 'Justo se ocupo ese horario mientras hablabamos. Consulta turnos disponibles de nuevo y ofrecele otro al cliente.' };
    }
    throw error;
  }

  if (negocio.memoriaActiva !== false) {
    await Cliente.findOneAndUpdate(
      { negocioId: negocio._id, sesionClienteId: sesionClienteId },
      {
        $set: {
          nombre: input.nombreCliente,
          telefono: input.telefonoCliente,
          ultimoTurno: {
            fecha: input.fecha,
            motivo: input.motivo,
            profesional: input.profesional || '',
          },
        },
        $inc: { totalTurnos: 1 },
      },
      { upsert: true, new: true }
    );
  }

  return { exito: true, turnoId: turno._id.toString(), estado: turno.estado };
}

/**
 * Busca si ya conocemos a este cliente (mismo negocio + mismo dispositivo/navegador).
 * Si el negocio apago la memoria, ni siquiera consultamos - se trata como cliente nuevo siempre.
 */
async function buscarClienteConocido(negocio, sesionClienteId) {
  if (negocio.memoriaActiva === false) return null;
  const cliente = await Cliente.findOne({ negocioId: negocio._id, sesionClienteId: sesionClienteId });
  return cliente;
}

/**
 * Genera la respuesta del asistente para un negocio dado. Si el modelo decide
 * usar la herramienta de registrar pedido, la ejecuta de verdad contra la
 * base de datos y le devuelve el resultado al modelo para que siga la charla.
 */
async function generarRespuesta(negocio, historialMensajes, mensajeNuevo, sesionClienteId, productos) {
  const clienteConocido = await buscarClienteConocido(negocio, sesionClienteId);
  const systemPrompt = construirSystemPrompt(negocio, clienteConocido, productos || []);

  const messages = historialMensajes.map(function (m) {
    return { role: m.rol === 'cliente' ? 'user' : 'assistant', content: m.contenido };
  });
  messages.push({ role: 'user', content: mensajeNuevo });

  let pedidoCreado = null;
  let turnoCreado = null;
  const MAX_VUELTAS = 4;
  const permiteTomarPedidosOTurnos = !negocio.permisos || negocio.permisos.tomarPedidosOTurnos !== false;
  const herramientasDisponibles = !permiteTomarPedidosOTurnos
    ? []
    : (negocio.tipoOperacion === 'turnos' ? HERRAMIENTAS_TURNOS : HERRAMIENTAS_PEDIDOS);

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    const respuesta = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: systemPrompt,
      tools: herramientasDisponibles.length ? herramientasDisponibles : undefined,
      messages: messages,
    });

    const bloquesTexto = respuesta.content.filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n');
    const bloqueHerramienta = respuesta.content.find(function (b) { return b.type === 'tool_use'; });

    if (respuesta.stop_reason !== 'tool_use' || !bloqueHerramienta) {
      const sinRespuesta = detectarSinRespuesta(bloquesTexto);
      return { textoRespuesta: bloquesTexto, pedidoCreado: pedidoCreado, turnoCreado: turnoCreado, sinRespuesta: sinRespuesta };
    }

    let resultadoHerramienta;
    try {
      if (bloqueHerramienta.name === 'registrar_pedido') {
        resultadoHerramienta = await ejecutarRegistrarPedido(negocio, sesionClienteId, bloqueHerramienta.input);
        pedidoCreado = resultadoHerramienta;
      } else if (bloqueHerramienta.name === 'consultar_turnos_disponibles') {
        resultadoHerramienta = await ejecutarConsultarTurnosDisponibles(negocio, bloqueHerramienta.input);
      } else if (bloqueHerramienta.name === 'registrar_turno') {
        resultadoHerramienta = await ejecutarRegistrarTurno(negocio, sesionClienteId, bloqueHerramienta.input);
        turnoCreado = resultadoHerramienta;
      } else {
        resultadoHerramienta = { error: 'Herramienta desconocida' };
      }
    } catch (error) {
      console.error('Error ejecutando herramienta:', error);
      resultadoHerramienta = { error: 'No se pudo completar la accion, intenta de nuevo.' };
    }

    messages.push({ role: 'assistant', content: respuesta.content });
    messages.push({
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: bloqueHerramienta.id, content: JSON.stringify(resultadoHerramienta) },
      ],
    });
  }

  return { textoRespuesta: 'Hubo un problema procesando tu solicitud, por favor intenta de nuevo.', pedidoCreado: pedidoCreado, turnoCreado: turnoCreado, sinRespuesta: false };
}

module.exports = { generarRespuesta, construirSystemPrompt };
