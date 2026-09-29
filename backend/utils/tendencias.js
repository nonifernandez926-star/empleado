/**
 * TENDENCIAS INTERNAS (fase 8A)
 * ==============================
 * Todo se calcula con los datos reales del propio negocio (pedidos, turnos, conversaciones).
 * No usa internet, no usa IA y no cuesta nada extra: si no hay datos suficientes, lo dice.
 *
 * Son funciones puras (reciben datos ya cargados) para poder probarlas sin base de datos.
 * Todas las fechas son 'YYYY-MM-DD' en hora Argentina.
 */

const { minutosDesdeHora } = require('./turnos');

const ZONA = 'America/Argentina/Buenos_Aires';
const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
const NOMBRE_DIA = {
  domingo: 'domingo', lunes: 'lunes', martes: 'martes', miercoles: 'miércoles',
  jueves: 'jueves', viernes: 'viernes', sabado: 'sábado',
};

// Umbrales: por debajo de esto preferimos decir "todavía hay pocos datos" antes que inventar una tendencia.
const UMBRALES = {
  eventosPatron: 20,     // mínimo de pedidos/turnos en 28 días para hablar de días y horas flojos
  volumenItem: 4,        // mínimo (semana actual + anterior) para comparar un producto/servicio
  variacionItem: 25,     // % mínimo para decir que un producto/servicio "sube" o "baja"
  diferenciaItem: 2,     // y al menos esta cantidad de unidades de diferencia
  variacionSemana: 5,    // % mínimo para no considerar la semana "igual"
  ventanaPrecioDias: 14, // días antes y después de un cambio de precio que se comparan
  minVentasPrecio: 3,    // ventas mínimas (antes o después) para sacar alguna conclusión
  minAusentismo: 5,      // turnos cerrados (atendidos + ausentes) mínimos para mostrar el % de ausentismo
};

// ---------- Fechas ----------
function sumarDias(fecha, n) {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
function diaDeSemana(fecha) {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
function fechaHoraAR(date) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(new Date(date));
  const get = (t) => partes.find((p) => p.type === t).value;
  return { fecha: `${get('year')}-${get('month')}-${get('day')}`, hora: Number(get('hour')) % 24 };
}
function enRango(fecha, desde, hasta) {
  return fecha >= desde && fecha <= hasta;
}
function fechasEntre(desde, hasta) {
  const lista = [];
  for (let f = desde; f <= hasta; f = sumarDias(f, 1)) lista.push(f);
  return lista;
}
function pad2(n) { return String(n).padStart(2, '0'); }
function franja(hora) { return `${pad2(hora)}:00 a ${pad2((hora + 1) % 24)}:00`; }
function unir(nombres) {
  if (nombres.length <= 1) return nombres.join('');
  return `${nombres.slice(0, -1).join(', ')} y ${nombres[nombres.length - 1]}`;
}
function pct(actual, anterior) {
  if (!anterior) return null;
  return Math.round(((actual - anterior) / anterior) * 100);
}

// ---------- Normalización: pedidos y turnos pasan a un mismo formato de "evento" ----------
// evento = { fecha, hora, items: [{ nombre, cantidad, precio }], monto, ausente }
function eventosDePedidos(pedidos) {
  return (pedidos || []).map((p) => {
    const { fecha, hora } = fechaHoraAR(p.createdAt);
    return {
      fecha, hora,
      items: (p.items || []).map((i) => ({ nombre: i.producto, cantidad: i.cantidad || 1, precio: i.precioUnitario })),
      monto: p.total || 0,
      ausente: false,
    };
  });
}
// Solo cuentan los turnos que siguen en pie (pendiente/confirmado); los cancelados o rechazados no son demanda real.
function eventosDeTurnos(turnos) {
  return (turnos || [])
    .filter((t) => ['pendiente', 'confirmado'].includes(t.estado))
    .map((t) => ({
      fecha: t.fecha,
      hora: Number(String(t.hora || '0:0').split(':')[0]),
      items: [{ nombre: t.motivo || 'Sin motivo', cantidad: 1 }],
      monto: 0,
      ausente: t.atencion === 'ausente',
      atendido: t.atencion === 'atendido',
    }));
}

// ---------- 1) Esta semana contra la anterior ----------
// "Esta semana" = los últimos 7 días contando hoy. "La anterior" = los 7 días previos. Así se comparan
// períodos del mismo largo (no una semana entera contra una a medias).
function ventanas(hoy) {
  return {
    actual: { desde: sumarDias(hoy, -6), hasta: hoy },
    anterior: { desde: sumarDias(hoy, -13), hasta: sumarDias(hoy, -7) },
  };
}

function metrica(clave, nombre, actual, anterior, extra) {
  const variacion = pct(actual, anterior);
  let tendencia;
  if (!anterior && !actual) tendencia = 'igual';
  else if (!anterior) tendencia = 'sin_base';
  else if (Math.abs(variacion) < UMBRALES.variacionSemana) tendencia = 'igual';
  else tendencia = variacion > 0 ? 'sube' : 'baja';
  return { clave, nombre, actual, anterior, variacion, tendencia, ...(extra || {}) };
}

function compararSemanas({ eventos, conversaciones, hoy, esTurnos }) {
  const v = ventanas(hoy);
  const cuenta = (lista, ventana) => lista.filter((e) => enRango(e.fecha, ventana.desde, ventana.hasta));
  const act = cuenta(eventos, v.actual);
  const ant = cuenta(eventos, v.anterior);
  const conv = (conversaciones || []).map((c) => fechaHoraAR(c.createdAt).fecha);
  const convAct = conv.filter((f) => enRango(f, v.actual.desde, v.actual.hasta)).length;
  const convAnt = conv.filter((f) => enRango(f, v.anterior.desde, v.anterior.hasta)).length;

  const metricas = [];
  if (esTurnos) {
    metricas.push(metrica('operaciones', 'Turnos', act.length, ant.length));
    metricas.push(metrica('ausentes', 'Ausentes', act.filter((e) => e.ausente).length, ant.filter((e) => e.ausente).length, { subeEsMalo: true }));
  } else {
    metricas.push(metrica('operaciones', 'Pedidos', act.length, ant.length));
    const montoAct = act.reduce((a, e) => a + e.monto, 0);
    const montoAnt = ant.reduce((a, e) => a + e.monto, 0);
    if (montoAct || montoAnt) {
      metricas.push(metrica('ingresos', 'Ingresos', montoAct, montoAnt, { esDinero: true, nota: 'Solo suma pedidos con precio cargado.' }));
    }
  }
  metricas.push(metrica('conversaciones', 'Conversaciones', convAct, convAnt));

  const total = act.length + ant.length;
  return { ventanas: v, metricas, pocosDatos: total < 3 };
}

// ---------- 2) Qué producto / servicio sube o baja ----------
function tendenciaItems({ eventos, hoy }) {
  const v = ventanas(hoy);
  const suma = (ventana) => {
    const m = {};
    eventos.filter((e) => enRango(e.fecha, ventana.desde, ventana.hasta)).forEach((e) => {
      e.items.forEach((i) => { m[i.nombre] = (m[i.nombre] || 0) + i.cantidad; });
    });
    return m;
  };
  const act = suma(v.actual);
  const ant = suma(v.anterior);
  const nombres = new Set([...Object.keys(act), ...Object.keys(ant)]);

  const suben = []; const bajan = []; const nuevos = []; const dejaron = [];
  nombres.forEach((nombre) => {
    const a = act[nombre] || 0; const b = ant[nombre] || 0;
    if (a + b < UMBRALES.volumenItem) return;
    const variacion = pct(a, b);
    const fila = { nombre, actual: a, anterior: b, variacion, diferencia: a - b };
    if (b === 0 && a >= 3) nuevos.push(fila);
    else if (a === 0 && b >= 3) dejaron.push(fila);
    else if (b > 0 && a - b >= UMBRALES.diferenciaItem && variacion >= UMBRALES.variacionItem) suben.push(fila);
    else if (b > 0 && b - a >= UMBRALES.diferenciaItem && variacion <= -UMBRALES.variacionItem) bajan.push(fila);
  });
  const porDif = (x, y) => Math.abs(y.diferencia) - Math.abs(x.diferencia);
  return {
    suben: suben.sort(porDif).slice(0, 3),
    bajan: bajan.sort(porDif).slice(0, 3),
    nuevos: nuevos.sort(porDif).slice(0, 3),
    dejaron: dejaron.sort(porDif).slice(0, 3),
    pocosDatos: nombres.size === 0,
  };
}

// ---------- 3) Días y horas más flojos (últimos 28 días completos, sin contar hoy) ----------
function horasAbiertas(horarioDia) {
  const horas = new Set();
  if (!horarioDia || !horarioDia.activo) return horas;
  (horarioDia.bloques || []).forEach((b) => {
    const ini = Math.floor(minutosDesdeHora(b.apertura) / 60);
    const fin = Math.ceil(minutosDesdeHora(b.cierre) / 60);
    for (let h = ini; h < fin; h++) horas.add(h % 24);
  });
  return horas;
}

function patronDiasYHoras({ eventos, horarios, hoy }) {
  const desde = sumarDias(hoy, -28);
  const hasta = sumarDias(hoy, -1);
  const fechas = fechasEntre(desde, hasta);
  const enVentana = eventos.filter((e) => enRango(e.fecha, desde, hasta));
  const sinHorarios = !horarios || !horarios.length;
  const horarioDe = (fecha) => (horarios || []).find((h) => h.dia === DIAS[diaDeSemana(fecha)]);
  const abierto = (fecha) => sinHorarios || !!(horarioDe(fecha) && horarioDe(fecha).activo);

  // Por día de la semana: promedio por cada vez que ese día estuvo abierto
  const porDia = DIAS.map((dia, idx) => {
    const ocurrencias = fechas.filter((f) => diaDeSemana(f) === idx && abierto(f)).length;
    const total = enVentana.filter((e) => diaDeSemana(e.fecha) === idx).length;
    return { dia, nombre: NOMBRE_DIA[dia], ocurrencias, total, promedio: ocurrencias ? Math.round((total / ocurrencias) * 10) / 10 : null };
  }).filter((d) => d.ocurrencias > 0);

  const suficiente = enVentana.length >= UMBRALES.eventosPatron;
  const resultado = { desde, hasta, totalEventos: enVentana.length, minimo: UMBRALES.eventosPatron, pocosDatos: !suficiente, dias: porDia, diaFlojo: null, diaFuerte: null, diasFlojos: [], diasFuertes: [], horas: null };
  if (!suficiente || !porDia.length) return resultado;

  const ordenados = [...porDia].sort((a, b) => a.promedio - b.promedio);
  const flojo = ordenados[0]; const fuerte = ordenados[ordenados.length - 1];
  if (fuerte.promedio > flojo.promedio && (fuerte.promedio >= flojo.promedio * 1.5 || fuerte.promedio - flojo.promedio >= 1)) {
    resultado.diaFlojo = flojo; resultado.diaFuerte = fuerte;
    // Si varios días empatan, se nombran todos (no se elige uno al azar)
    resultado.diasFlojos = porDia.filter((d) => d.promedio === flojo.promedio).map((d) => d.nombre);
    resultado.diasFuertes = porDia.filter((d) => d.promedio === fuerte.promedio).map((d) => d.nombre);
  }

  // Por hora: solo dentro del horario de atención, dividido por las veces que esa hora estuvo abierta
  if (!sinHorarios) {
    const aperturas = new Array(24).fill(0);
    fechas.forEach((f) => horasAbiertas(horarioDe(f)).forEach((h) => { aperturas[h] += 1; }));
    const conteo = new Array(24).fill(0);
    enVentana.forEach((e) => { if (e.hora >= 0 && e.hora < 24) conteo[e.hora] += 1; });
    const horas = [];
    for (let h = 0; h < 24; h++) {
      if (aperturas[h] > 0) horas.push({ hora: h, franja: franja(h), total: conteo[h], promedio: Math.round((conteo[h] / aperturas[h]) * 100) / 100 });
    }
    if (horas.length) {
      const prom = horas.reduce((a, x) => a + x.promedio, 0) / horas.length;
      const orden = [...horas].sort((a, b) => a.promedio - b.promedio);
      resultado.horas = {
        promedioGeneral: Math.round(prom * 100) / 100,
        flojas: orden.filter((x) => x.promedio <= prom * 0.5).slice(0, 3),
        fuertes: [...orden].reverse().filter((x) => x.promedio >= prom * 1.5 && x.promedio > 0).slice(0, 3),
        todas: horas,
      };
    }
  }
  return resultado;
}

// ---------- 4) Cambios de precio y cómo cambió la demanda (solo pedidos con precio cargado) ----------
function cambiosDePrecio({ pedidos, hoy }) {
  // Serie de ventas por producto, en orden cronológico
  const series = {};
  (pedidos || [])
    .map((p) => ({ ...fechaHoraAR(p.createdAt), createdAt: new Date(p.createdAt), items: p.items || [] }))
    .sort((a, b) => a.createdAt - b.createdAt)
    .forEach((p) => p.items.forEach((i) => {
      (series[i.producto] = series[i.producto] || []).push({ fecha: p.fecha, precio: i.precioUnitario, cantidad: i.cantidad || 1 });
    }));

  const limite = sumarDias(hoy, -90);
  const cambios = [];
  Object.entries(series).forEach(([producto, ventas]) => {
    const conPrecio = ventas.filter((v) => v.precio > 0);
    if (conPrecio.length < 3) return;
    let base = conPrecio[0].precio;
    for (let i = 1; i < conPrecio.length; i++) {
      const nuevo = conPrecio[i].precio;
      if (nuevo === base || Math.abs(nuevo - base) / base < 0.02) continue;
      // Solo cuenta si el precio nuevo se repite (evita confundir una promo puntual con un cambio de precio)
      const repeticiones = conPrecio.slice(i).filter((v) => v.precio === nuevo).length;
      if (repeticiones < 2) continue;
      const fecha = conPrecio[i].fecha;
      if (fecha >= limite) {
        cambios.push({ producto, fecha, precioAnterior: base, precioNuevo: nuevo, variacionPrecio: pct(nuevo, base), ventas });
      }
      base = nuevo;
    }
  });

  const dias = UMBRALES.ventanaPrecioDias;
  const resultado = cambios.sort((a, b) => (a.fecha < b.fecha ? 1 : -1)).slice(0, 5).map((c) => {
    const unidades = (desde, hasta) => c.ventas.filter((v) => enRango(v.fecha, desde, hasta)).reduce((a, v) => a + v.cantidad, 0);
    const completo = sumarDias(c.fecha, dias - 1) < hoy; // ya pasaron los días completos de comparación
    const salida = { producto: c.producto, fecha: c.fecha, precioAnterior: c.precioAnterior, precioNuevo: c.precioNuevo, variacionPrecio: c.variacionPrecio, sube: c.precioNuevo > c.precioAnterior };
    if (!completo) return { ...salida, efecto: null };
    const antes = unidades(sumarDias(c.fecha, -dias), sumarDias(c.fecha, -1));
    const despues = unidades(c.fecha, sumarDias(c.fecha, dias - 1));
    const porSemana = (n) => Math.round((n / (dias / 7)) * 10) / 10;
    let veredicto;
    if (antes < UMBRALES.minVentasPrecio && despues < UMBRALES.minVentasPrecio) veredicto = 'pocos_datos';
    else {
      const v = pct(despues, antes);
      if (v === null) veredicto = 'sube';
      else if (v <= -25) veredicto = 'baja';
      else if (v >= 25) veredicto = 'sube';
      else veredicto = 'igual';
    }
    return { ...salida, efecto: { dias, antes, despues, porSemanaAntes: porSemana(antes), porSemanaDespues: porSemana(despues), variacion: pct(despues, antes), veredicto } };
  });

  const hayPrecios = (pedidos || []).some((p) => (p.items || []).some((i) => i.precioUnitario > 0));
  return { hayPrecios, cambios: resultado };
}

// ---------- 5) Ausentismo (solo negocios con turnos) ----------
function ausentismo({ eventos, hoy }) {
  const desde = sumarDias(hoy, -28);
  const cerrados = eventos.filter((e) => enRango(e.fecha, desde, hoy) && (e.ausente || e.atendido));
  const ausentes = cerrados.filter((e) => e.ausente);
  const suficiente = cerrados.length >= UMBRALES.minAusentismo;
  const porDia = DIAS.map((dia, idx) => ({ dia, nombre: NOMBRE_DIA[dia], ausentes: ausentes.filter((e) => diaDeSemana(e.fecha) === idx).length }));
  const peor = [...porDia].sort((a, b) => b.ausentes - a.ausentes)[0];
  return {
    desde, hasta: hoy,
    turnosCerrados: cerrados.length,
    ausentes: ausentes.length,
    tasa: suficiente ? Math.round((ausentes.length / cerrados.length) * 100) : null,
    diaConMasAusentes: ausentes.length >= 4 && peor.ausentes > 0 ? peor : null,
    pocosDatos: !suficiente,
    minimo: UMBRALES.minAusentismo,
  };
}

// ---------- Frases del resumen (todas salen de los números de arriba) ----------
function armarResumen({ esTurnos, semanas, items, patron, precios, aus }) {
  const frases = [];
  const etiquetaItem = esTurnos ? 'servicio' : 'producto';

  const principal = semanas.metricas[0];
  if (!semanas.pocosDatos && principal) {
    const nombre = principal.nombre.toLowerCase();
    if (principal.tendencia === 'sube') frases.push({ tipo: 'sube', texto: `Esta semana tuviste ${principal.actual} ${nombre}, un ${principal.variacion}% más que la anterior (${principal.anterior}).` });
    else if (principal.tendencia === 'baja') frases.push({ tipo: 'baja', texto: `Esta semana tuviste ${principal.actual} ${nombre}, un ${Math.abs(principal.variacion)}% menos que la anterior (${principal.anterior}).` });
    else if (principal.tendencia === 'igual') frases.push({ tipo: 'igual', texto: `Esta semana tuviste ${principal.actual} ${nombre}, parecido a la anterior (${principal.anterior}).` });
  }
  if (items.suben[0]) frases.push({ tipo: 'sube', texto: `Sube: ${items.suben[0].nombre} (${items.suben[0].actual} esta semana contra ${items.suben[0].anterior} la anterior).` });
  if (items.bajan[0]) frases.push({ tipo: 'baja', texto: `Baja: ${items.bajan[0].nombre} (${items.bajan[0].actual} esta semana contra ${items.bajan[0].anterior} la anterior).` });
  if (patron.diaFlojo && patron.diaFuerte) {
    const flojos = unir(patron.diasFlojos); const fuertes = unir(patron.diasFuertes);
    const parteFlojo = patron.diasFlojos.length === 1 ? `El ${flojos} es tu día más flojo` : `Tus días más flojos son ${flojos}`;
    const parteFuerte = patron.diasFuertes.length === 1 ? `el ${fuertes} el más fuerte` : `${fuertes} los más fuertes`;
    frases.push({ tipo: 'info', texto: `${parteFlojo} (${patron.diaFlojo.promedio} por día) y ${parteFuerte} (${patron.diaFuerte.promedio} por día).` });
  }
  if (patron.horas && patron.horas.flojas[0]) {
    frases.push({ tipo: 'info', texto: `Tu franja más floja dentro del horario de atención es de ${patron.horas.flojas[0].franja}.` });
  }
  if (aus && aus.tasa !== null) {
    frases.push({ tipo: aus.tasa >= 15 ? 'baja' : 'info', texto: `En los últimos 28 días faltó el ${aus.tasa}% de los turnos que ya se cerraron (${aus.ausentes} de ${aus.turnosCerrados}).` });
  }
  if (precios && precios.cambios[0]) {
    const c = precios.cambios[0];
    frases.push({ tipo: 'info', texto: `${c.sube ? 'Subiste' : 'Bajaste'} el precio de ${c.producto} el ${c.fecha.split('-').reverse().join('/')}.` });
  }
  return frases;
}

// ---------- Función principal ----------
function calcularTendencias({ negocio, pedidos, turnos, conversaciones, hoy }) {
  const esTurnos = negocio.tipoOperacion === 'turnos';
  const eventos = esTurnos ? eventosDeTurnos(turnos) : eventosDePedidos(pedidos);
  const horarios = (negocio.horarios || []).map((h) => (h.toObject ? h.toObject() : h));

  const semanas = compararSemanas({ eventos, conversaciones, hoy, esTurnos });
  const items = tendenciaItems({ eventos, hoy });
  const patron = patronDiasYHoras({ eventos, horarios, hoy });
  const precios = esTurnos ? null : cambiosDePrecio({ pedidos, hoy });
  const aus = esTurnos ? ausentismo({ eventos, hoy }) : null;
  const resumen = armarResumen({ esTurnos, semanas, items, patron, precios, aus });

  return { tipoOperacion: negocio.tipoOperacion, hoy, semanas, items, patron, precios, ausentismo: aus, resumen };
}

module.exports = { calcularTendencias, sumarDias, diaDeSemana, fechaHoraAR, UMBRALES };
