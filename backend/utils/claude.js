const Anthropic = require('@anthropic-ai/sdk');

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
    .filter(([, valor]) => valor !== '' && valor !== undefined && valor !== null)
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

function construirSystemPrompt(negocio) {
  const nombre = negocio.formData?.nombreNegocio || 'el negocio';
  const mostrarPrecios = negocio.formData?.mostrarPrecios;

  return `Sos el asistente virtual del negocio "${nombre}" (rubro: ${negocio.rubroCategoria} - ${negocio.rubroSubrubro}).

REGLA MÁS IMPORTANTE — NUNCA LA ROMPAS:
Solo podés usar la información que aparece abajo en "INFORMACIÓN DEL NEGOCIO". Si te preguntan algo que no está ahí (un precio, un horario, un servicio, una promoción, disponibilidad), NUNCA lo inventes. Respondé algo como: "No tengo esa información en este momento, te recomiendo consultarlo directamente con el negocio." No pidas disculpas de más ni des rodeos, solo indicalo con naturalidad y ofrecé ayudar en otra cosa.

${mostrarPrecios === false ? 'Este negocio decidió NO informar precios por chat. Si preguntan precios, indicá que deben consultarlo directamente con el negocio.' : ''}

PERSONALIDAD DEL ASISTENTE:
${descripcionPersonalidad(negocio.personalidad)}

INFORMACIÓN DEL NEGOCIO:
${formatearFormData(negocio.formData)}

HORARIOS DE ATENCIÓN:
${formatearHorarios(negocio.horarios)}

Respondé siempre en español, de forma natural, como si fueras parte del equipo del negocio. Interpretá la intención del cliente aunque escriba informal o con errores. Sé breve y claro, no generes respuestas innecesariamente largas.`;
}

/**
 * Genera la respuesta del asistente para un negocio dado, usando el historial
 * de la conversación como contexto.
 * historialMensajes: [{ rol: 'cliente'|'asistente', contenido: string }]
 */
async function generarRespuesta(negocio, historialMensajes, mensajeNuevo) {
  const systemPrompt = construirSystemPrompt(negocio);

  const messages = [
    ...historialMensajes.map((m) => ({
      role: m.rol === 'cliente' ? 'user' : 'assistant',
      content: m.contenido,
    })),
    { role: 'user', content: mensajeNuevo },
  ];

  const respuesta = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 500,
    system: systemPrompt,
    messages,
  });

  const textoRespuesta = respuesta.content
    .filter((bloque) => bloque.type === 'text')
    .map((bloque) => bloque.text)
    .join('\n');

  return textoRespuesta;
}

module.exports = { generarRespuesta, construirSystemPrompt };
