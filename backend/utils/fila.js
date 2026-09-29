const { minutosDesdeHora, horaDesdeMinutos } = require('./turnos');

const ZONA = 'America/Argentina/Buenos_Aires';

// Fecha ('YYYY-MM-DD') y minutos del día en hora Argentina (el servidor puede estar en UTC)
function ahoraArgentina(fecha) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(fecha || new Date());
  const get = (t) => partes.find((p) => p.type === t).value;
  return { fecha: `${get('year')}-${get('month')}-${get('day')}`, minutos: (Number(get('hour')) % 24) * 60 + Number(get('minute')) };
}

/**
 * Calcula la fila virtual de UN día para UN profesional (o el negocio entero si tiene uno solo).
 * No guarda nada: se recalcula cada vez desde los turnos. Por eso, apenas alguien cancela,
 * no viene o termina de ser atendido, todos los que están detrás "suben" solos.
 *
 * Reglas:
 *  - Solo entran en la fila los turnos confirmados que siguen esperando o se están atendiendo.
 *  - El orden es el de la hora agendada.
 *  - La hora estimada de cada uno nunca es antes de su hora agendada, salvo que alguien
 *    haya cancelado o no haya venido: ahí el siguiente puede adelantarse a ese hueco.
 *  - Si el que se está atendiendo se pasó de su tiempo, se asume que termina enseguida.
 */
function calcularCola(turnosDelProfesional, minutosAhora, ahoraMs) {
  const dur = (t) => t.duracionMinutos || 30;
  const enAtencion = turnosDelProfesional.find((t) => t.estado === 'confirmado' && t.atencion === 'en_atencion');
  const esperando = turnosDelProfesional
    .filter((t) => t.estado === 'confirmado' && (t.atencion || 'esperando') === 'esperando')
    .sort((a, b) => minutosDesdeHora(a.hora) - minutosDesdeHora(b.hora) || new Date(a.createdAt) - new Date(b.createdAt));

  const huecos = turnosDelProfesional
    .filter((t) => (t.estado === 'cancelado' || t.atencion === 'ausente') && minutosDesdeHora(t.hora) + dur(t) > minutosAhora)
    .map((t) => minutosDesdeHora(t.hora))
    .sort((a, b) => a - b);

  let cursor = minutosAhora;
  let atendiendo = null;
  if (enAtencion) {
    const inicioMs = enAtencion.inicioAtencion ? new Date(enAtencion.inicioAtencion).getTime() : ahoraMs;
    const transcurridos = Math.max(0, Math.round((ahoraMs - inicioMs) / 60000));
    const restantes = Math.max(0, dur(enAtencion) - transcurridos);
    const demorado = transcurridos > dur(enAtencion);
    cursor = minutosAhora + (demorado ? 3 : restantes);
    atendiendo = { turno: enAtencion, transcurridos, restantes, demorado };
  }

  const cola = esperando.map((t, i) => {
    const agendada = minutosDesdeHora(t.hora);
    let inicio = Math.max(cursor, agendada);
    let puedeAdelantar = false;
    if (i === 0 && !enAtencion) {
      const hueco = huecos.find((h) => h < agendada);
      if (hueco !== undefined) {
        inicio = Math.max(cursor, hueco);
        puedeAdelantar = inicio + 10 <= agendada;
      }
    }
    const info = {
      turno: t,
      posicion: i + 1,
      personasDelante: i + (enAtencion ? 1 : 0),
      horaAgendada: t.hora,
      horaEstimada: horaDesdeMinutos(inicio),
      esperaMinutos: Math.max(0, inicio - minutosAhora),
      atrasoMinutos: Math.max(0, inicio - agendada),
      puedeAdelantar,
    };
    cursor = inicio + dur(t);
    return info;
  });

  return { atendiendo, cola };
}

// Agrupa los turnos del día por profesional y calcula la cola de cada uno.
function calcularFilaDelDia(turnosDelDia, ahora) {
  const ahoraMs = (ahora || new Date()).getTime();
  const { minutos } = ahoraArgentina(ahora);
  const grupos = {};
  turnosDelDia.forEach((t) => {
    const clave = t.profesional || '';
    (grupos[clave] = grupos[clave] || []).push(t);
  });
  return Object.entries(grupos).map(([profesional, lista]) => ({
    profesional,
    ...calcularCola(lista, minutos, ahoraMs),
    atendidos: lista.filter((t) => t.atencion === 'atendido').length,
    ausentes: lista.filter((t) => t.atencion === 'ausente').length,
    cancelados: lista.filter((t) => t.estado === 'cancelado').length,
  }));
}

// Devuelve, para un cliente (sesionClienteId), el estado de sus turnos de hoy dentro de la fila.
function estadoDeMisTurnos(turnosDelDia, sesionClienteId, ahora) {
  const filas = calcularFilaDelDia(turnosDelDia, ahora);
  const propios = turnosDelDia.filter((t) => t.sesionClienteId === sesionClienteId && ['confirmado', 'pendiente'].includes(t.estado));
  return propios.map((t) => {
    const base = { turnoId: String(t._id), hora: t.hora, motivo: t.motivo, profesional: t.profesional || '', estadoTurno: t.estado, atencion: t.atencion || 'esperando' };
    if (t.estado === 'pendiente') return { ...base, situacion: 'pendiente_confirmacion' };
    const fila = filas.find((f) => f.profesional === (t.profesional || ''));
    if (t.atencion === 'en_atencion') return { ...base, situacion: 'atendiendo_ahora' };
    if (t.atencion === 'atendido') return { ...base, situacion: 'ya_atendido' };
    if (t.atencion === 'ausente') return { ...base, situacion: 'marcado_ausente' };
    const item = fila && fila.cola.find((c) => String(c.turno._id) === String(t._id));
    if (!item) return { ...base, situacion: 'sin_datos' };
    return {
      ...base,
      situacion: item.personasDelante === 0 ? 'sos_el_siguiente' : 'esperando',
      personasDelante: item.personasDelante,
      horaEstimada: item.horaEstimada,
      esperaMinutos: item.esperaMinutos,
      atrasoMinutos: item.atrasoMinutos,
      puedeAdelantar: item.puedeAdelantar,
    };
  });
}

module.exports = { ahoraArgentina, calcularFilaDelDia, estadoDeMisTurnos };
