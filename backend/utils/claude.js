const Anthropic = require('@anthropic-ai/sdk');
const Pedido = require('../models/Pedido');
const Cliente = require('../models/Cliente');

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
const HERRAMIENTAS = [
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

function construirSystemPrompt(negocio, clienteConocido) {
  const nombre = (negocio.formData && negocio.formData.nombreNegocio) || 'el negocio';
  const mostrarPrecios = negocio.formData && negocio.formData.mostrarPrecios;

  let prompt = 'Sos el asistente virtual del negocio "' + nombre + '" (rubro: ' + negocio.rubroCategoria + ' - ' + negocio.rubroSubrubro + ').\n\n';

  prompt += 'REGLA MAS IMPORTANTE - NUNCA LA ROMPAS:\n';
  prompt += 'Solo podes usar la informacion que aparece abajo en "INFORMACION DEL NEGOCIO". Si te preguntan algo que no esta ahi (un precio, un horario, un servicio, una promocion, disponibilidad), NUNCA lo inventes. Respondé algo como: "No tengo esa informacion en este momento, te recomiendo consultarlo directamente con el negocio." No pidas disculpas de mas ni des rodeos, solo indicalo con naturalidad y ofrece ayudar en otra cosa.\n\n';

  if (mostrarPrecios === false) {
    prompt += 'Este negocio decidio NO informar precios por chat. Si preguntan precios, indica que deben consultarlo directamente con el negocio. Nunca uses precios en un pedido si no los tenes.\n\n';
  }

  if (negocio.disponibilidadHoy) {
    prompt += 'IMPORTANTE - DISPONIBILIDAD DE HOY:\n';
    prompt += 'El negocio marco que lo siguiente NO esta disponible hoy (agotado, sin stock, etc.): "' + negocio.disponibilidadHoy + '"\n';
    prompt += 'Nunca recomiendes ni tomes un pedido de algo que este en esa lista. Si el cliente lo pide, avisale que hoy no esta disponible y ofrecele una alternativa si tiene sentido.\n\n';
  }

  if (clienteConocido) {
    prompt += 'MEMORIA DEL CLIENTE - ya hablaste antes con esta persona:\n';
    if (clienteConocido.nombre) prompt += 'Nombre: ' + clienteConocido.nombre + '. ';
    prompt += 'Ya hizo ' + clienteConocido.totalPedidos + ' pedido(s) antes.\n';
    if (clienteConocido.ultimoPedido && clienteConocido.ultimoPedido.items && clienteConocido.ultimoPedido.items.length) {
      const itemsTexto = clienteConocido.ultimoPedido.items.map(function (i) { return i.cantidad + 'x ' + i.producto; }).join(', ');
      prompt += 'Su ultimo pedido fue: ' + itemsTexto + ' (' + clienteConocido.ultimoPedido.tipoEntrega + ').\n';
    }
    prompt += 'Podes saludarlo por su nombre si lo tenes, y si tiene sentido en la charla podes preguntarle si quiere "lo de siempre", pero no lo fuerces si no viene al caso.\n\n';
  }

  prompt += 'SUGERENCIAS INTELIGENTES (esto ayuda a vender mas, es parte importante de tu trabajo):\n';
  prompt += 'Cuando el cliente pida algo, si tenes informacion de otro producto o servicio que combine bien (por ejemplo una bebida con una comida, o un accesorio con un producto principal), ofreceselo de forma natural y breve, una sola vez por pedido. No insistas si te dice que no. Nunca sugieras algo que no este en la informacion del negocio.\n\n';

  prompt += 'FORMATO DE TEXTO:\n';
  prompt += 'Si queres resaltar algo importante (un nombre de producto, un dato clave, un precio), envolvelo entre dos asteriscos asi: **texto**. No uses mayusculas sostenidas ni comillas para resaltar. No abuses de la negrita, solo lo realmente importante.\n\n';

  prompt += 'COMO MOSTRAR EL MENU O CATALOGO:\n';
  prompt += 'Si el cliente pregunta "que tienen?" o algo similar, no respondas todo junto en un parrafo. Organizalo como una carta, agrupado por categorias, con este estilo (usando la informacion real que tenes abajo):\n\n';
  prompt += 'CATEGORIA\nNombre del producto - breve descripcion si la tenes\n\n';
  prompt += 'Si el cliente pregunta por una categoria especifica, mostra solo esa categoria. Si pide el menu completo, mostralo organizado por categorias.\n\n';

  prompt += 'COMO TOMAR UN PEDIDO (esto es central en tu trabajo):\n';
  prompt += 'Si el cliente quiere pedir algo, guialo conversacionalmente para juntar todos los datos necesarios: que producto/servicio, cantidad, si es delivery o retiro (y la direccion si es delivery), forma de pago, y cualquier observacion. SIEMPRE pedile tambien su nombre y su numero de telefono, sin excepcion (es obligatorio, sirve como respaldo del negocio). No pidas todo junto en una sola pregunta larga, anda guiando paso a paso de forma natural.\n\n';
  prompt += 'Cuando tengas todos los datos, mostrale un resumen claro antes de confirmar, con emojis y ordenado (incluyendo el total a pagar si hay precios cargados, sumando el costo de envio si corresponde), y preguntale si confirma.\n\n';
  prompt += 'SOLO cuando el cliente confirme explicitamente (diga que si, que confirma, etc.), usa la herramienta "registrar_pedido" para guardarlo de verdad en el sistema. Nunca digas que un pedido quedo registrado sin haber usado esa herramienta. Despues de que la herramienta confirme que se guardo, avisale al cliente que su pedido quedo registrado.\n\n';
  prompt += 'Si el negocio no tiene cargados productos/servicios claros para tomar pedidos de esa forma, o el pedido es algo que no podes resolver por chat, indicale al cliente el WhatsApp del negocio como alternativa, pero esto es un respaldo, no el camino principal.\n\n';

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

  prompt += 'PERSONALIDAD DEL ASISTENTE:\n' + descripcionPersonalidad(negocio.personalidad) + '\n\n';
  prompt += 'INFORMACION DEL NEGOCIO:\n' + formatearFormData(negocio.formData) + '\n\n';
  prompt += 'HORARIOS DE ATENCION:\n' + formatearHorarios(negocio.horarios) + '\n\n';
  prompt += 'Responde siempre en espanol, de forma natural, como si fueras parte del equipo del negocio. Interpreta la intencion del cliente aunque escriba informal o con errores. Se breve y claro, no generes respuestas innecesariamente largas.';

  return prompt;
}

// Ejecuta la herramienta registrar_pedido: guarda el pedido REAL en MongoDB
// y actualiza (o crea) el perfil del cliente para que el asistente lo recuerde despues.
async function ejecutarRegistrarPedido(negocioId, sesionClienteId, input) {
  const items = input.items || [];
  const tieneTodosLosPrecios = items.length > 0 && items.every(function (i) { return typeof i.precioUnitario === 'number'; });
  const total = tieneTodosLosPrecios
    ? items.reduce(function (acc, i) { return acc + i.precioUnitario * i.cantidad; }, 0)
    : undefined;

  const pedido = await Pedido.create({
    negocioId: negocioId,
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
  });

  // Actualizamos (o creamos) el perfil de cliente recurrente para este negocio
  await Cliente.findOneAndUpdate(
    { negocioId: negocioId, sesionClienteId: sesionClienteId },
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

  return { exito: true, pedidoId: pedido._id.toString(), estado: pedido.estado };
}

/**
 * Busca si ya conocemos a este cliente (mismo negocio + mismo dispositivo/navegador).
 */
async function buscarClienteConocido(negocioId, sesionClienteId) {
  const cliente = await Cliente.findOne({ negocioId: negocioId, sesionClienteId: sesionClienteId });
  return cliente;
}

/**
 * Genera la respuesta del asistente para un negocio dado. Si el modelo decide
 * usar la herramienta de registrar pedido, la ejecuta de verdad contra la
 * base de datos y le devuelve el resultado al modelo para que siga la charla.
 */
async function generarRespuesta(negocio, historialMensajes, mensajeNuevo, sesionClienteId) {
  const clienteConocido = await buscarClienteConocido(negocio._id, sesionClienteId);
  const systemPrompt = construirSystemPrompt(negocio, clienteConocido);

  const messages = historialMensajes.map(function (m) {
    return { role: m.rol === 'cliente' ? 'user' : 'assistant', content: m.contenido };
  });
  messages.push({ role: 'user', content: mensajeNuevo });

  let pedidoCreado = null;
  const MAX_VUELTAS = 4;

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    const respuesta = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: systemPrompt,
      tools: HERRAMIENTAS,
      messages: messages,
    });

    const bloquesTexto = respuesta.content.filter(function (b) { return b.type === 'text'; }).map(function (b) { return b.text; }).join('\n');
    const bloqueHerramienta = respuesta.content.find(function (b) { return b.type === 'tool_use'; });

    if (respuesta.stop_reason !== 'tool_use' || !bloqueHerramienta) {
      const sinRespuesta = detectarSinRespuesta(bloquesTexto);
      return { textoRespuesta: bloquesTexto, pedidoCreado: pedidoCreado, sinRespuesta: sinRespuesta };
    }

    let resultadoHerramienta;
    try {
      if (bloqueHerramienta.name === 'registrar_pedido') {
        resultadoHerramienta = await ejecutarRegistrarPedido(negocio._id, sesionClienteId, bloqueHerramienta.input);
        pedidoCreado = resultadoHerramienta;
      } else {
        resultadoHerramienta = { error: 'Herramienta desconocida' };
      }
    } catch (error) {
      console.error('Error ejecutando herramienta:', error);
      resultadoHerramienta = { error: 'No se pudo registrar el pedido, intenta de nuevo.' };
    }

    messages.push({ role: 'assistant', content: respuesta.content });
    messages.push({
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: bloqueHerramienta.id, content: JSON.stringify(resultadoHerramienta) },
      ],
    });
  }

  return { textoRespuesta: 'Hubo un problema procesando tu pedido, por favor intenta de nuevo.', pedidoCreado: pedidoCreado, sinRespuesta: false };
}

module.exports = { generarRespuesta, construirSystemPrompt };
