const Anthropic = require('@anthropic-ai/sdk');
const Pedido = require('../models/Pedido');

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const MODEL = process.env.CLAUDE_MODEL || 'claude-haiku-4-5-20251001';

const DIAS_ORDEN = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function formatearHorarios(horarios = []) {
  if (!horarios.length) return 'No se cargaron horarios todavía.';
  return DIAS_ORDEN
    .map((dia) => {
      const h = horarios.find((x) => x.dia === dia);
      if (!h || !h.activo || !h.bloques?.length) return `${dia}: cerrado`;
      const bloques = h.bloques.map((b) => `${b.apertura} a ${b.cierre}`).join(' y ');
      return `${dia}: ${bloques}`;
    })
    .join('\n');
}

function formatearFormData(formData = {}) {
  return Object.entries(formData)
    .filter(([, valor]) => valor !== '' && valor !== undefined && valor !== null && !(Array.isArray(valor) && valor.length === 0))
    .map(([clave, valor]) => `- ${clave}: ${Array.isArray(valor) ? valor.join(', ') : valor}`)
    .join('\n');
}

function descripcionPersonalidad(personalidad = {}) {
  const estilos = {
    profesional_cercano: 'profesional pero cercano',
    amable_carismatico: 'amable y carismático',
    juvenil_energetico: 'juvenil y energético',
    elegante_exclusivo: 'elegante y exclusivo',
    tranquilo_confiable: 'tranquilo y confiable',
  };
  const formalidad = personalidad.formalidad > 6 ? 'muy casual' : personalidad.formalidad < 4 ? 'formal' : 'balanceado entre formal y casual';
  const energia = personalidad.energia > 6 ? 'divertido y con energía' : personalidad.energia < 4 ? 'serio' : 'con energía moderada';
  const conversacion = personalidad.conversacion > 6 ? 'conversador, le gusta dar contexto' : personalidad.conversacion < 4 ? 'directo y conciso' : 'balanceado';

  return `Estilo general: ${estilos[personalidad.estilo] || 'amable y carismático'}.
Tono: ${formalidad}.
Energía: ${energia}.
Forma de responder: ${conversacion}.
${personalidad.descripcionLibre ? `Instrucción adicional del negocio sobre cómo debe comportarse: "${personalidad.descripcionLibre}"` : ''}`;
}

// Herramienta que Claude puede usar para registrar un pedido REAL en la base de datos.
// Solo debe usarla después de que el cliente confirme explícitamente el resumen del pedido.
const HERRAMIENTAS = [
  {
    name: 'registrar_pedido',
    description: 'Registra en el sistema del negocio un pedido que el cliente ya confirmó explícitamente (después de mostrarle el resumen y que haya dicho que sí). No usar antes de la confirmación del cliente.',
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
        telefonoCliente: { type: 'string', description: 'Teléfono de contacto del cliente, si lo dio' },
        tipoEntrega: { type: 'string', enum: ['delivery', 'retiro'], description: 'Si el cliente pidió delivery o retira en el local' },
        direccionEntrega: { type: 'string', description: 'Dirección de entrega, solo si es delivery' },
        formaPago: { type: 'string', description: 'Forma de pago acordada' },
        observaciones: { type: 'string', description: 'Cualquier aclaración adicional del pedido' },
      },
      required: ['items', 'nombreCliente', 'tipoEntrega', 'formaPago'],
    },
  },
];

function construirSystemPrompt(negocio) {
  const nombre = negocio.formData?.nombreNegocio || 'el negocio';
  const mostrarPrecios = negocio.formData?.mostrarPrecios;

  return `Sos el asistente virtual del negocio "${nombre}" (rubro: ${negocio.rubroCategoria} - ${negocio.rubroSubrubro}).

REGLA MÁS IMPORTANTE — NUNCA LA ROMPAS:
Solo podés usar la información que aparece abajo en "INFORMACIÓN DEL NEGOCIO". Si te preguntan algo que no está ahí (un precio, un horario, un servicio, una promoción, disponibilidad), NUNCA lo inventes. Respondé algo como: "No tengo esa información en este momento, te recomiendo consultarlo directamente con el negocio." No pidas disculpas de más ni des rodeos, solo indicalo con naturalidad y ofrecé ayudar en otra cosa.

${mostrarPrecios === false ? 'Este negocio decidió NO informar precios por chat. Si preguntan precios, indicá que deben consultarlo directamente con el negocio. Nunca uses precios en un pedido si no los tenés.' : ''}

${negocio.disponibilidadHoy ? `IMPORTANTE — DISPONIBILIDAD DE HOY:
El negocio marcó que lo siguiente NO está disponible hoy (agotado, sin stock, etc.): "${negocio.disponibilidadHoy}"
Nunca recomiendes ni tomes un pedido de algo que esté en esa lista. Si el cliente lo pide, avisale que hoy no está disponible y ofrecele una alternativa si tiene sentido.` : ''}

C�MO MOSTRAR EL MENÚ O CATÁLOGO:
Si el cliente pregunta "¿qué tienen?" o algo similar, no respondas todo junto en un párrafo. Organizalo como una carta, agrupado por categorías, con este estilo (usando la información real que tenés abajo):

🍔 CATEGORÍA
Nombre del producto — breve descripción si la tenés

Si el cliente pregunta por una categoría específica (ej: "¿qué pizzas tienen?"), mostrá solo esa categoría. Si pide el menú completo, mostralo organizado por categorías.

C�MO TOMAR UN PEDIDO (esto es central en tu trabajo):
Si el cliente quiere pedir algo, guialo conversacionalmente para juntar todos los datos necesarios: qué producto/servicio, cantidad, si es delivery o retiro (y la dirección si es delivery), forma de pago, y cualquier observación. No pidas todo junto en una sola pregunta larga, andá guiando paso a paso de forma natural.

Cuando tengas todos los datos, mostrale un resumen claro antes de confirmar, por ejemplo:

🧾 Resumen de tu pedido
🍕 1 Pizza especial
🥟 6 Empanadas de carne
🛵 Delivery — [dirección]
💳 [forma de pago]

¿Confirmás el pedido?

SOLO cuando el cliente confirme explícitamente (diga que sí, que confirma, etc.), usá la herramienta "registrar_pedido" para guardarlo de verdad en el sistema. Nunca digas que un pedido quedó registrado sin haber usado esa herramienta — sería mentirle al cliente. Después de que la herramienta confirme que se guardó, avisale al cliente que su pedido quedó registrado y que el negocio se va a poner en contacto o lo va a preparar.

Si el negocio no tiene cargados productos/servicios claros para tomar pedidos de esa forma, o el pedido es algo que no podés resolver por chat, indicale al cliente el WhatsApp del negocio como alternativa — pero esto es un respaldo, no el camino principal. Priorizá siempre intentar resolver el pedido vos mismo primero.

PERSONALIDAD DEL ASISTENTE:
${descripcionPersonalidad(negocio.personalidad)}

INFORMACIÓN DEL NEGOCIO:
${formatearFormData(negocio.formData)}

HORARIOS DE ATENCIÓN:
${formatearHorarios(negocio.horarios)}

Respondé siempre en español, de forma natural, como si fueras parte del equipo del negocio. Interpretá la intención del cliente aunque escriba informal o con errores. Sé breve y claro, no generes respuestas innecesariamente largas.`;
}

// Ejecuta la herramienta registrar_pedido: guarda el pedido REAL en MongoDB.
async function ejecutarRegistrarPedido(negocioId, sesionClienteId, input) {
  const items = input.items || [];
  const tieneTodosLosPrecios = items.length > 0 && items.every((i) => typeof i.precioUnitario === 'number');
  const total = tieneTodosLosPrecios
    ? items.reduce((acc, i) => acc + i.precioUnitario * i.cantidad, 0)
    : undefined;

  const pedido = await Pedido.create({
    negocioId,
    sesionClienteId,
    items,
    total,
    nombreCliente: input.nombreCliente,
    telefonoCliente: input.telefonoCliente,
    tipoEntrega: input.tipoEntrega,
    direccionEntrega: input.direccionEntrega,
    formaPago: input.formaPago,
    observaciones: input.observaciones,
    estado: 'pendiente',
  });

  return { exito: true, pedidoId: pedido._id.toString(), estado: pedido.estado };
}

/**
 * Genera la respuesta del asistente para un negocio dado. Si el modelo decide
 * usar la herramienta de registrar pedido, la ejecuta de verdad contra la
 * base de datos y le devuelve el resultado al modelo para que siga la charla.
 */
async function generarRespuesta(negocio, historialMensajes, mensajeNuevo, sesionClienteId) {
  const systemPrompt = construirSystemPrompt(negocio);

  const messages = [
    ...historialMensajes.map((m) => ({
      role: m.rol === 'cliente' ? 'user' : 'assistant',
      content: m.contenido,
    })),
    { role: 'user', content: mensajeNuevo },
  ];

  let pedidoCreado = null;
  const MAX_VUELTAS = 4; // evita loops infinitos si el modelo insistiera con herramientas

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    const respuesta = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 700,
      system: systemPrompt,
      tools: HERRAMIENTAS,
      messages,
    });

    const bloquesTexto = respuesta.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    const bloqueHerramienta = respuesta.content.find((b) => b.type === 'tool_use');

    if (respuesta.stop_reason !== 'tool_use' || !bloqueHerramienta) {
      return { textoRespuesta: bloquesTexto, pedidoCreado };
    }

    // El modelo pidió usar una herramienta: la ejecutamos de verdad
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
      resultadoHerramienta = { error: 'No se pudo registrar el pedido, intentá de nuevo.' };
    }

    // Le devolvemos al modelo el turno completo (incluyendo el tool_use) + el resultado
    messages.push({ role: 'assistant', content: respuesta.content });
    messages.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: bloqueHerramienta.id,
          content: JSON.stringify(resultadoHerramienta),
        },
      ],
    });
  }

  return { textoRespuesta: 'Hubo un problema procesando tu pedido, por favor intentá de nuevo.', pedidoCreado };
}

module.exports = { generarRespuesta, construirSystemPrompt };
