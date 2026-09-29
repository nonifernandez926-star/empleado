const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];

function minutosDesdeHora(hora) {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
}
function horaDesdeMinutos(mins) {
  const h = Math.floor(mins / 60).toString().padStart(2, '0');
  const m = (mins % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}

// Devuelve el nombre del día ('lunes', 'martes', etc.) para una fecha 'YYYY-MM-DD'
function nombreDia(fecha) {
  const d = new Date(`${fecha}T00:00:00`);
  return DIAS_SEMANA[d.getDay()];
}

// Calcula los horarios de inicio disponibles para un turno de "duracionMinutos" minutos,
// en la fecha dada, para un profesional puntual (o el negocio en general si no tiene varios),
// restando los turnos que ya están ocupados (pendientes o confirmados) y los que ya pasaron si es hoy.
function calcularHorariosDisponibles({ negocio, fecha, duracionMinutos, profesional, turnosExistentes, ahora }) {
  const dia = nombreDia(fecha);
  const horarioDia = (negocio.horarios || []).find((h) => h.dia === dia);
  if (!horarioDia || !horarioDia.activo || !horarioDia.bloques || !horarioDia.bloques.length) {
    return [];
  }

  const ocupados = turnosExistentes
    .filter((t) => (t.profesional || '') === (profesional || ''))
    .map((t) => {
      const inicio = minutosDesdeHora(t.hora);
      return { inicio, fin: inicio + (t.duracionMinutos || 30) };
    });

  const esHoy = ahora && fecha === ahora.toISOString().slice(0, 10);
  const minutoActual = esHoy ? ahora.getHours() * 60 + ahora.getMinutes() : -1;

  const disponibles = [];
  horarioDia.bloques.forEach((bloque) => {
    let cursor = minutosDesdeHora(bloque.apertura);
    const fin = minutosDesdeHora(bloque.cierre);

    while (cursor + duracionMinutos <= fin) {
      const finSlot = cursor + duracionMinutos;
      const pisaOcupado = ocupados.some((o) => cursor < o.fin && finSlot > o.inicio);
      const yaPaso = esHoy && cursor <= minutoActual;

      if (!pisaOcupado && !yaPaso) {
        disponibles.push(horaDesdeMinutos(cursor));
      }
      cursor += duracionMinutos;
    }
  });

  return disponibles;
}

module.exports = { calcularHorariosDisponibles, nombreDia, minutosDesdeHora, horaDesdeMinutos };
