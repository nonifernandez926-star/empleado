const params = new URLSearchParams(window.location.search);
const codigoPublico = params.get('codigo');

// Generamos (o recuperamos) un id anonimo para este cliente en este navegador/dispositivo.
// Usamos localStorage (no sessionStorage) para que persista aunque cierre la pestaña o el navegador,
// asi el asistente puede "recordarlo" si vuelve otro dia.
function obtenerSesionCliente() {
  let id = localStorage.getItem('sesionClienteId');
  if (!id) {
    id = 'sesion-' + Math.random().toString(36).slice(2) + Date.now();
    localStorage.setItem('sesionClienteId', id);
  }
  return id;
}

const contenedorMensajes = document.getElementById('chat-mensajes');
const inputMensaje = document.getElementById('input-mensaje');
const btnEnviar = document.getElementById('btn-enviar');
const btnAdjuntar = document.getElementById('btn-adjuntar');
const inputComprobante = document.getElementById('input-comprobante');

let ultimoPedidoId = null;

function horaActual() {
  return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

// Convierte la respuesta del asistente en un mensaje bien presentado:
// **negrita**, títulos, listas de productos con precio, resumen de pedido con total, avisos, enlaces y precios resaltados.
// Todo el texto se escapa primero: lo que escribe la IA (o un cliente) nunca se interpreta como HTML.
function escaparHtml(t) {
  const div = document.createElement('div');
  div.textContent = t;
  return div.innerHTML;
}
// $18000 -> $18.000 (los montos de 4 o más cifras sin separador se muestran con puntos)
const bonito = (t) => String(t).replace(/\$\s?(\d{4,})(?![\d.,])/g, (m, n) => '$' + Number(n).toLocaleString('es-AR'));
function inline(t) {
  let h = escaparHtml(bonito(t));
  h = h.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  h = h.replace(/(^|[\s(])_([^_\s][^_]*?)_(?=[\s).,;:!?]|$)/g, '$1<em>$2</em>');
  h = h.replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
  h = h.replace(/(^|[\s(>])(\$\s?\d[\d.,]*)/g, '$1<span class="msg-precio">$2</span>');
  return h;
}
const RE_PRECIO_FINAL = /^(.*?)\s*(?:[-–—:]\s*)?(\$\s?[\d.,]+(?:\s?(?:c\/u|cada uno|ARS))?)\**\s*$/;
const RE_TOTAL = /^\**\s*(total(?:\s+(?:a pagar|final|del pedido))?)\s*[:\-–—]?\s*\**\s*(\$\s?[\d.,]+)\**\s*$/i;

function formatearTexto(texto) {
  const lineas = String(texto).split('\n');
  let html = '';
  let lista = [];
  const cerrarLista = (total) => {
    if (!lista.length) { if (total) html += `<div class="msg-lista"><div class="msg-total"><span>${escaparHtml(total.etiqueta)}</span><b>${escaparHtml(total.monto)}</b></div></div>`; return; }
    const conTotal = !!total;
    html += `<div class="msg-lista${conTotal ? ' ticket' : ''}">${lista.join('')}${conTotal ? `<div class="msg-total"><span>${escaparHtml(total.etiqueta)}</span><b>${escaparHtml(total.monto)}</b></div>` : ''}</div>`;
    lista = [];
  };
  for (const crudo of lineas) {
    const linea = crudo.trim();
    // Total del pedido: se une a la lista anterior como un "ticket"
    const tot = linea.match(RE_TOTAL);
    if (tot) { cerrarLista({ etiqueta: tot[1].replace(/^./, (c) => c.toUpperCase()), monto: bonito(tot[2].replace(/\s/g, '')) }); continue; }
    const item = linea.match(/^(?:[-•*]|\d+[.)])\s+(.*)$/);
    if (item) {
      const cuerpo = item[1];
      const conPrecio = cuerpo.match(RE_PRECIO_FINAL);
      if (conPrecio && conPrecio[1].replace(/\*/g, '').trim().length > 1) {
        let nombre = conPrecio[1].replace(/\*\*/g, '').replace(/[\s:–—-]+$/, '');
        const cant = nombre.match(/^(\d+)\s*[x×]\s+(.*)$/i);
        const cantHtml = cant ? `<span class="msg-item-cant">${cant[1]}×</span>` : '';
        if (cant) nombre = cant[2];
        lista.push(`<div class="msg-item">${cantHtml}<span class="msg-item-nombre">${escaparHtml(nombre)}</span><span class="msg-item-precio">${escaparHtml(bonito(conPrecio[2]))}</span></div>`);
      } else {
        lista.push(`<div class="msg-item"><span class="msg-item-punto"></span><span class="msg-item-nombre">${inline(cuerpo)}</span></div>`);
      }
      continue;
    }
    cerrarLista();
    if (linea === '') { html += '<div class="msg-espacio"></div>'; continue; }
    // Título: una línea que es solo **texto** (con o sin dos puntos)
    const tit = linea.match(/^\*\*([^*]{2,60}?)\*\*\s*:?\s*$/) || linea.match(/^#{1,3}\s+(.{2,60})$/);
    if (tit) { html += `<div class="msg-titulo">${escaparHtml(tit[1].replace(/:$/, ''))}</div>`; continue; }
    // Avisos destacados
    const av = linea.match(/^(?:>\s*|(✅|⚠️|ℹ️|💡))\s*(.+)$/u);
    if (av) { const ic = av[1] || 'ℹ️'; html += `<div class="msg-aviso ${ic === '✅' ? 'ok' : ic === '⚠️' ? 'warn' : ''}"><span>${ic}</span><span>${inline(av[2])}</span></div>`; continue; }
    html += `<p>${inline(linea)}</p>`;
  }
  cerrarLista();
  return html.replace(/(<div class="msg-espacio"><\/div>)+/g, '<div class="msg-espacio"></div>').replace(/^<div class="msg-espacio"><\/div>|<div class="msg-espacio"><\/div>$/g, '');
}

// ---- Respuestas rápidas: botones debajo del último mensaje del asistente cuando está pidiendo algo concreto ----
function limpiarRapidas() { document.querySelectorAll('.msg-rapidas').forEach((e) => e.remove()); }
function opcionesRapidas(texto) {
  const t = String(texto).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (!/\?/.test(t)) return [];
  if (/delivery/.test(t) && /(retir|local|buscar)/.test(t)) return [['Delivery', 'Quiero delivery'], ['Retiro en el local', 'Lo retiro en el local']];
  if (/efectivo/.test(t) && /transferencia/.test(t)) return [['Efectivo', 'Pago en efectivo'], ['Transferencia', 'Pago por transferencia']];
  if (/(confirm|te parece bien|esta todo bien|es correcto|lo anoto|lo registro|todo correcto)/.test(t) && /(total|pedido|turno|resumen)/.test(t)) return [['Sí, confirmar', 'Sí, confirmo'], ['Quiero cambiar algo', 'Quiero cambiar algo']];
  return [];
}
function mostrarRapidas(texto) {
  limpiarRapidas();
  const ops = opcionesRapidas(texto);
  if (!ops.length) return;
  const caja = document.createElement('div');
  caja.className = 'msg-rapidas';
  ops.forEach(([etiqueta, envio]) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'msg-rapida'; b.textContent = etiqueta;
    b.addEventListener('click', () => { inputMensaje.value = envio; enviarMensaje(); });
    caja.appendChild(b);
  });
  contenedorMensajes.appendChild(caja);
  contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
}

// Avatar del negocio (logo o inicial) al lado de las respuestas del asistente
function avatarHtml() {
  const logo = window.__chatLogo, ini = window.__chatInicial || 'A';
  return `<span class="msg-av" aria-hidden="true">${logo ? `<img src="${escaparHtml(logo)}" alt="">` : escaparHtml(ini)}</span>`;
}
function continuaGrupo(rol) {
  const prev = contenedorMensajes.lastElementChild;
  return !!(prev && prev.classList.contains('msg-fila') && prev.classList.contains(rol) && !prev.id);
}

// Indicador de que el asistente está escribiendo
function mostrarEscribiendo() {
  if (document.getElementById('msg-escribiendo')) return;
  limpiarRapidas();
  const fila = document.createElement('div');
  fila.className = 'msg-fila asistente' + (continuaGrupo('asistente') ? ' cont' : '');
  fila.id = 'msg-escribiendo';
  fila.innerHTML = avatarHtml() + '<div class="msg asistente msg-escribiendo" aria-label="El asistente está escribiendo"><span></span><span></span><span></span></div>';
  contenedorMensajes.appendChild(fila);
  contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
}
function ocultarEscribiendo() {
  const el = document.getElementById('msg-escribiendo');
  if (el) el.remove();
}

function agregarMensaje(texto, rol, opciones = {}) {
  const fila = document.createElement('div');
  fila.className = `msg-fila ${rol}` + (continuaGrupo(rol) ? ' cont' : '');
  if (rol === 'asistente') fila.insertAdjacentHTML('afterbegin', avatarHtml());

  const burbuja = document.createElement('div');
  burbuja.className = `msg ${rol}`;
  burbuja.innerHTML = rol === 'cliente' ? `<p>${escaparHtml(texto)}</p>` : formatearTexto(texto);

  const hora = document.createElement('div');
  hora.className = 'msg-hora';
  hora.textContent = horaActual();

  fila.appendChild(burbuja);
  fila.appendChild(hora);
  // Debajo de cada respuesta de la IA: reportarla (Google Play lo exige en apps con IA generativa)
  if (rol === 'asistente' && !opciones.sinReporte) {
    const rep = document.createElement('button');
    rep.type = 'button'; rep.className = 'msg-reportar'; rep.textContent = 'Reportar';
    rep.setAttribute('aria-label', 'Reportar esta respuesta');
    rep.addEventListener('click', () => reportarRespuesta(texto, rep));
    hora.appendChild(document.createTextNode(' · '));
    hora.appendChild(rep);
  }
  contenedorMensajes.appendChild(fila);
  if (rol === 'asistente' && !opciones.sinReporte) mostrarRapidas(texto);
  contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
}

function agregarImagenes(urls) {
  const fila = document.createElement('div');
  fila.className = 'msg-fila asistente' + (continuaGrupo('asistente') ? ' cont' : '');
  fila.insertAdjacentHTML('afterbegin', avatarHtml());
  const burbuja = document.createElement('div');
  burbuja.className = 'msg asistente';
  burbuja.style.padding = '4px';

  if (urls.length === 1) {
    // Una sola foto: se muestra grande directamente, igual que en WhatsApp
    const img = document.createElement('img');
    img.src = urls[0];
    img.alt = 'Foto';
    img.className = 'msg-imagen-unica';
    img.addEventListener('click', () => abrirLightbox(urls, 0));
    burbuja.appendChild(img);
  } else {
    // Varias fotos juntas: se ven chicas en grilla, tocando una se abre completa con navegación
    const MAX_VISIBLES = 6;
    const grid = document.createElement('div');
    grid.className = 'msg-imagenes-grid';
    urls.slice(0, MAX_VISIBLES).forEach((url, i) => {
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Foto';
      const esUltimaVisible = i === MAX_VISIBLES - 1 && urls.length > MAX_VISIBLES;
      const celda = document.createElement('div');
      if (esUltimaVisible) {
        celda.className = 'grid-mas';
        celda.dataset.mas = `+${urls.length - MAX_VISIBLES}`;
      }
      celda.appendChild(img);
      celda.addEventListener('click', () => abrirLightbox(urls, i));
      grid.appendChild(celda);
    });
    burbuja.appendChild(grid);
  }

  fila.appendChild(burbuja);
  contenedorMensajes.appendChild(fila);
  contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;
}

// --- Visor de fotos a pantalla completa (lightbox estilo WhatsApp) ---
let lightboxUrls = [];
let lightboxIndice = 0;

function abrirLightbox(urls, indice) {
  lightboxUrls = urls;
  lightboxIndice = indice;
  mostrarFotoLightbox();
  document.getElementById('lightbox-overlay').classList.add('abierto');
}

function mostrarFotoLightbox() {
  document.getElementById('lightbox-img').src = lightboxUrls[lightboxIndice];
  const mostrarNav = lightboxUrls.length > 1;
  document.getElementById('lightbox-prev').style.display = mostrarNav ? 'flex' : 'none';
  document.getElementById('lightbox-next').style.display = mostrarNav ? 'flex' : 'none';
  document.getElementById('lightbox-contador').textContent = mostrarNav ? `${lightboxIndice + 1} / ${lightboxUrls.length}` : '';
}

function cerrarLightbox() {
  document.getElementById('lightbox-overlay').classList.remove('abierto');
}

document.getElementById('lightbox-cerrar').addEventListener('click', cerrarLightbox);
document.getElementById('lightbox-overlay').addEventListener('click', (e) => {
  if (e.target.id === 'lightbox-overlay') cerrarLightbox(); // tocar el fondo también cierra
});
document.getElementById('lightbox-prev').addEventListener('click', () => {
  lightboxIndice = (lightboxIndice - 1 + lightboxUrls.length) % lightboxUrls.length;
  mostrarFotoLightbox();
});
document.getElementById('lightbox-next').addEventListener('click', () => {
  lightboxIndice = (lightboxIndice + 1) % lightboxUrls.length;
  mostrarFotoLightbox();
});


async function cargarInfoNegocio() {
  if (!codigoPublico) return null;
  try {
    const res = await fetch(`${API_URL}/negocios/publico/${codigoPublico}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const info = await res.json();

    document.getElementById('chat-header-nombre').textContent = info.nombreNegocio;
    document.title = info.nombreNegocio + ' - Asistente virtual';
    window.__chatLogo = info.logoUrl || null;
    window.__chatInicial = (info.nombreNegocio || 'A').trim().charAt(0).toUpperCase();

    if (info.logoUrl) {
      document.getElementById('chat-header-logo').innerHTML = `<img src="${info.logoUrl}" alt="Logo">`;
    } else {
      document.getElementById('chat-header-logo').textContent = window.__chatInicial;
    }
    // Color de marca del negocio (si lo eligió): pinta el encabezado, los mensajes del cliente y los botones
    if (/^#[0-9a-f]{6}$/i.test(info.colorMarca || '')) {
      document.documentElement.style.setProperty('--ch-brand', info.colorMarca);
      document.documentElement.style.setProperty('--ch-brand2', `color-mix(in srgb, ${info.colorMarca} 72%, #000)`);
    }
    window.__chatInfo = info;
    return info;
  } catch (error) {
    document.getElementById('chat-header-nombre').textContent = 'Asistente';
    return null;
  }
}

// ---- Bienvenida y "Repetir pedido" ----
const horaDeHace = (f) => { const d = Math.floor((Date.now() - new Date(f).getTime()) / 86400000); return d <= 0 ? 'hoy' : d === 1 ? 'ayer' : d < 30 ? `hace ${d} días` : d < 60 ? 'hace 1 mes' : `hace ${Math.floor(d / 30)} meses`; };
const ICONO_REPETIR = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>';

function mostrarBienvenida(info) {
  const caja = document.createElement('div');
  caja.className = 'chat-bienvenida';
  const nombre = info ? info.nombreNegocio : 'este negocio';
  const texto = (info && info.bienvenida) || (info && info.tipoOperacion === 'turnos' ? 'Consultá horarios, servicios o reservá tu turno.' : 'Mirá lo que tenemos, consultá o hacé tu pedido.');
  caja.innerHTML = `<div class="chat-bienv-logo">${window.__chatLogo ? `<img src="${escaparHtml(window.__chatLogo)}" alt="">` : escaparHtml(window.__chatInicial || 'A')}</div><strong>${escaparHtml(nombre)}</strong><span>${escaparHtml(texto)}</span>`;
  contenedorMensajes.appendChild(caja);
}

function mostrarRepetirPedido(p) {
  if (!p || !p.items || !p.items.length) return;
  const tarjeta = document.createElement('div');
  tarjeta.className = 'repetir-card';
  const resumen = [horaDeHace(p.fecha), p.tipoEntrega === 'delivery' ? 'Delivery' : 'Retiro', p.formaPago || ''].filter(Boolean).join(' · ');
  tarjeta.innerHTML = `
    <div class="repetir-cab"><span class="repetir-ico">${ICONO_REPETIR}</span><div><strong>Tu último pedido</strong><small>${escaparHtml(resumen)}</small></div></div>
    <ul class="repetir-items">${p.items.map((i) => `<li><b>${i.cantidad}×</b><span>${escaparHtml(i.producto)}${i.variante ? ` (${escaparHtml(i.variante)})` : ''}</span></li>`).join('')}</ul>
    <button type="button" class="repetir-btn">${ICONO_REPETIR} Repetir este pedido</button>
    <small class="repetir-nota">Revisamos los precios y el stock de hoy.${/transfer/i.test(p.formaPago || '') ? ' Como pagaste por transferencia, te vamos a pedir el comprobante otra vez.' : ''}</small>`;
  tarjeta.querySelector('.repetir-btn').addEventListener('click', () => {
    tarjeta.remove();
    const lista = p.items.map((i) => `${i.cantidad}x ${i.producto}${i.variante ? ' (' + i.variante + ')' : ''}`).join(', ');
    inputMensaje.value = `Quiero repetir mi último pedido (${lista}) con los mismos datos de entrega y de pago.`;
    enviarMensaje();
  });
  contenedorMensajes.appendChild(tarjeta);
}

async function iniciarChat() {
  const info = await cargarInfoNegocio();
  if (!info) return;
  mostrarBienvenida(info);
  try {
    const res = await fetch(`${API_URL}/chat/${encodeURIComponent(codigoPublico)}/cliente?sesion=${encodeURIComponent(obtenerSesionCliente())}`, { cache: 'no-store' });
    const cli = res.ok ? await res.json() : { pedidos: 0, ultimoPedido: null };
    window.__chatCliente = cli;
    if (!contenedorMensajes.querySelector('.msg-fila.cliente')) mostrarRepetirPedido(cli.ultimoPedido);
  } catch (e) { window.__chatCliente = { pedidos: 0, ultimoPedido: null }; }
  window.dispatchEvent(new CustomEvent('chat-listo'));
}

// Cuando estamos esperando la respuesta a "¿qué te gustó / no te gustó?", el próximo mensaje que
// el cliente escriba en el input de SIEMPRE se manda como comentario de la reseña, no como chat normal.
let resenaEsperandoComentario = null;

async function enviarMensaje() {
  const texto = inputMensaje.value.trim();
  if (!texto || !codigoPublico) return;

  ocultarSugerencias();
  limpiarRapidas();
  contenedorMensajes.querySelectorAll('.repetir-card').forEach((c) => c.remove());
  agregarMensaje(texto, 'cliente');
  inputMensaje.value = '';
  inputMensaje.disabled = true;
  btnEnviar.disabled = true;

  if (resenaEsperandoComentario) {
    const resenaId = resenaEsperandoComentario;
    resenaEsperandoComentario = null;
    try {
      await fetch(`${API_URL}/resenas/${codigoPublico}/${resenaId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comentario: texto }),
      });
      agregarMensaje('¡Gracias por contarnos! 💙', 'asistente', { sinReporte: true });
    } catch (error) {
      agregarMensaje('No se pudo guardar tu respuesta, pero no pasa nada - gracias igual.', 'asistente', { sinReporte: true });
    }
    inputMensaje.disabled = false;
    btnEnviar.disabled = false;
    inputMensaje.focus();
    return;
  }

  try {
    mostrarEscribiendo();
    const res = await fetch(`${API_URL}/chat/${codigoPublico}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mensaje: texto, sesionClienteId: obtenerSesionCliente() }),
    });
    const data = await res.json();
    ocultarEscribiendo();

    if (!res.ok) {
      agregarMensaje(data.mensaje || 'Este asistente no está disponible en este momento.', 'asistente', { sinReporte: true });
    } else {
      agregarMensaje(data.respuesta, 'asistente');
      if (data.imagenes && data.imagenes.length) {
        agregarImagenes(data.imagenes);
      }
      if (data.pedidoCreado && data.pedidoCreado.exito) {
        agregarMensaje(`✅ Pedido registrado (N° ${data.pedidoCreado.pedidoId.slice(-6)})`, 'asistente', { sinReporte: true });
        ultimoPedidoId = data.pedidoCreado.pedidoId;
        btnAdjuntar.style.display = 'inline-block'; // ya puede adjuntar el comprobante si va a pagar por transferencia
        mostrarWidgetCalificacion();
      }
      if (data.turnoCreado && data.turnoCreado.exito) {
        mostrarWidgetCalificacion();
      }
      actualizarFilaCliente(); // por si sacó un turno para hoy, o el asistente le informó su lugar
      intentarActivarPush(); // recién acá, después de la primera respuesta - pedir permiso antes de que hable se siente invasivo
    }
  } catch (error) {
    ocultarEscribiendo();
    agregarMensaje('Hubo un error de conexión. Intentá de nuevo.', 'asistente', { sinReporte: true });
  } finally {
    inputMensaje.disabled = false;
    btnEnviar.disabled = false;
    inputMensaje.focus();
  }
}

// --- Notificaciones push: para que el negocio te pueda avisar algo aunque tengas el chat cerrado ---
// No se pide apenas se abre la página (se sentiría invasivo); se pide después de la primera
// respuesta del asistente, y como mucho una vez por navegador (si el cliente lo rechaza, no insistimos).
async function intentarActivarPush() {
  if (localStorage.getItem('pushYaPreguntado')) return;
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return; // el navegador no soporta push (ej. Safari fuera de una PWA instalada)
  localStorage.setItem('pushYaPreguntado', '1');

  try {
    const resClave = await fetch(`${API_URL}/push/clave-publica`);
    if (!resClave.ok) return; // el negocio/servidor todavía no configuró las claves VAPID

    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') return;

    const { publicKey } = await resClave.json();
    const registro = await navigator.serviceWorker.register('/sw.js');
    const subscription = await registro.pushManager.subscribe({
      userVisibleOnly: true, // obligatorio: toda notificación que recibamos se le muestra al usuario, nunca en silencio
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await fetch(`${API_URL}/push/suscribirse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codigoPublico, sesionClienteId: obtenerSesionCliente(), subscription }),
    });
  } catch (error) {
    // Si algo falla (el usuario cerró el cartel del navegador, no hay conexión, etc.) seguimos sin push:
    // el mensaje de recuperación igual le va a llegar la próxima vez que escriba, como fallback.
  }
}

// La clave pública VAPID viene en base64url; el navegador la necesita como bytes (Uint8Array).
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}


// --- Fila virtual: el cliente ve su lugar en vivo (se refresca solo mientras tiene el chat abierto) ---
const bannerFila = document.getElementById('fila-cliente');

function textoFila(t) {
  switch (t.situacion) {
    case 'atendiendo_ahora':
      return { clase: 'ahora', titulo: 'Te están atendiendo', sub: `Turno de las ${t.hora}` };
    case 'sos_el_siguiente':
      return { clase: 'siguiente', titulo: 'Sos el siguiente', sub: `Acercate: te atienden aprox. a las ${t.horaEstimada}${t.puedeAdelantar ? ' (se liberó un lugar, podés venir antes)' : ''}` };
    case 'esperando': {
      const n = t.personasDelante;
      const demora = t.atrasoMinutos > 10 ? ` · demora de unos ${t.atrasoMinutos} min` : '';
      return { clase: 'espera', titulo: `${n} ${n === 1 ? 'persona' : 'personas'} antes que vos`, sub: `Turno de las ${t.hora} · atención estimada ${t.horaEstimada}${demora}` };
    }
    case 'pendiente_confirmacion':
      return { clase: 'pendiente', titulo: 'Turno pendiente de confirmación', sub: `Hoy a las ${t.hora} · el negocio te va a confirmar` };
    case 'ya_atendido':
      return { clase: 'listo', titulo: 'Ya fuiste atendido', sub: '¡Gracias por venir!' };
    default:
      return null;
  }
}

async function actualizarFilaCliente() {
  if (!codigoPublico || !bannerFila) return;
  try {
    const res = await fetch(`${API_URL}/fila/mia/${encodeURIComponent(codigoPublico)}/${encodeURIComponent(obtenerSesionCliente())}`, { cache: 'no-store' });
    if (!res.ok) return;
    const { turnos } = await res.json();
    const activos = (turnos || []).map((t) => ({ t, txt: textoFila(t) })).filter((x) => x.txt && x.t.situacion !== 'ya_atendido');
    if (!activos.length) { bannerFila.style.display = 'none'; bannerFila.innerHTML = ''; return; }
    bannerFila.style.display = 'block';
    bannerFila.innerHTML = activos.map(({ txt }) => `
      <div class="fila-cliente-item ${txt.clase}">
        <div class="fila-cliente-punto"></div>
        <div><strong>${txt.titulo}</strong><span>${txt.sub}</span></div>
      </div>`).join('');
  } catch (e) { /* sin conexión: dejamos lo último que se mostró */ }
}

actualizarFilaCliente();
setInterval(() => { if (!document.hidden) actualizarFilaCliente(); }, 20000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) actualizarFilaCliente(); });

// --- Calificación con estrellas (aparece una sola vez, después de cerrar un pedido o turno) ---
let yaSeMostroCalificacion = false;

function mostrarWidgetCalificacion() {
  if (yaSeMostroCalificacion) return; // no lo mostramos más de una vez por conversación
  yaSeMostroCalificacion = true;

  const fila = document.createElement('div');
  fila.className = 'msg-fila asistente';
  const burbuja = document.createElement('div');
  burbuja.className = 'msg asistente resena-widget';
  burbuja.innerHTML = `
    <p class="resena-texto">¿Cómo te resultó la experiencia? Calificanos</p>
    <div class="resena-estrellas">
      ${[1, 2, 3, 4, 5].map((n) => `<button type="button" class="resena-estrella" data-valor="${n}">★</button>`).join('')}
    </div>
    <button type="button" class="resena-enviar" disabled>Enviar</button>
  `;
  fila.appendChild(burbuja);
  contenedorMensajes.appendChild(fila);
  contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;

  let estrellasElegidas = 0;
  const botones = burbuja.querySelectorAll('.resena-estrella');
  const btnEnviarResena = burbuja.querySelector('.resena-enviar');

  function pintarEstrellas() {
    botones.forEach((b) => b.classList.toggle('llena', Number(b.dataset.valor) <= estrellasElegidas));
    btnEnviarResena.disabled = estrellasElegidas === 0;
  }
  botones.forEach((boton) => {
    boton.addEventListener('click', () => {
      estrellasElegidas = Number(boton.dataset.valor);
      pintarEstrellas();
    });
  });

  btnEnviarResena.addEventListener('click', async () => {
    if (!estrellasElegidas) return;
    botones.forEach((b) => { b.disabled = true; });
    btnEnviarResena.disabled = true;
    btnEnviarResena.textContent = 'Enviando...';
    try {
      const res = await fetch(`${API_URL}/resenas/${codigoPublico}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sesionClienteId: obtenerSesionCliente(), estrellas: estrellasElegidas }),
      });
      const data = await res.json();
      burbuja.remove(); // el widget de estrellas ya cumplió su función, no queda ocupando lugar
      if (res.ok && data.resenaId) {
        // La pregunta de seguimiento se muestra como un mensaje normal, y la respuesta se
        // escribe en el mismo cuadro de texto de siempre (no se crea un input nuevo).
        agregarMensaje(data.preguntaSeguimiento, 'asistente', { sinReporte: true });
        resenaEsperandoComentario = data.resenaId;
      }
    } catch (error) {
      agregarMensaje('No se pudo enviar la calificación, pero gracias igual por tu tiempo.', 'asistente', { sinReporte: true });
    }
  });
}

btnEnviar.addEventListener('click', enviarMensaje);

// Sugerencias rápidas: desaparecen apenas la persona empieza a conversar
const cajaSugerencias = document.getElementById('chat-sugerencias');
if (cajaSugerencias) {
  cajaSugerencias.querySelectorAll('.chat-sug').forEach((b) => b.addEventListener('click', () => {
    inputMensaje.value = b.textContent.trim();
    enviarMensaje();
  }));
}
function ocultarSugerencias() { if (cajaSugerencias) cajaSugerencias.classList.add('oculto'); }

inputMensaje.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') enviarMensaje();
});

btnAdjuntar.addEventListener('click', () => inputComprobante.click());

inputComprobante.addEventListener('change', async () => {
  const archivo = inputComprobante.files[0];
  if (!archivo || !ultimoPedidoId) return;

  // Mostramos la imagen en el chat, del lado del cliente, para que vea que se envió
  const urlLocal = URL.createObjectURL(archivo);
  const fila = document.createElement('div');
  fila.className = 'msg-fila cliente';
  const burbuja = document.createElement('div');
  burbuja.className = 'msg cliente';
  burbuja.style.padding = '4px';
  burbuja.innerHTML = `<img src="${urlLocal}" alt="Comprobante" style="max-width:100%; border-radius:10px; display:block;">`;
  fila.appendChild(burbuja);
  contenedorMensajes.appendChild(fila);
  contenedorMensajes.scrollTop = contenedorMensajes.scrollHeight;

  btnAdjuntar.disabled = true;

  const formData = new FormData();
  formData.append('foto', archivo);

  try {
    const res = await fetch(`${API_URL}/pedidos/${ultimoPedidoId}/comprobante`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Error al subir');

    agregarMensaje('Recibimos tu comprobante. El negocio va a revisar que la transferencia haya llegado correctamente y va a confirmar tu pedido a la brevedad.', 'asistente', { sinReporte: true });
  } catch (error) {
    agregarMensaje('No se pudo enviar el comprobante, intentá de nuevo.', 'asistente', { sinReporte: true });
  } finally {
    btnAdjuntar.disabled = false;
    inputComprobante.value = '';
  }
});

iniciarChat();

if (!codigoPublico) {
  agregarMensaje('Falta el código del negocio en la URL (?codigo=...)', 'asistente', { sinReporte: true });
}


// --- Reportar una respuesta de la IA ---
function reportarRespuesta(texto, boton) {
  if (!codigoPublico || boton.dataset.hecho) return;
  const fondo = document.createElement('div');
  fondo.className = 'rep-fondo';
  fondo.innerHTML = `
    <div class="rep-hoja" role="dialog" aria-modal="true" aria-labelledby="rep-titulo">
      <h3 id="rep-titulo">Reportar respuesta</h3>
      <p>¿Qué pasó con esta respuesta?</p>
      <div class="rep-opciones">
        <button type="button" data-m="incorrecta">Es incorrecta o confusa</button>
        <button type="button" data-m="ofensiva">Es ofensiva o inapropiada</button>
        <button type="button" data-m="danina">Es peligrosa o dañina</button>
        <button type="button" data-m="otro">Otro motivo</button>
      </div>
      <button type="button" class="rep-cancelar">Cancelar</button>
      <p class="rep-estado" role="status"></p>
    </div>`;
  document.body.appendChild(fondo);
  const estado = fondo.querySelector('.rep-estado');
  const cerrar = () => fondo.remove();
  fondo.addEventListener('click', (e) => { if (e.target === fondo) cerrar(); });
  fondo.querySelector('.rep-cancelar').addEventListener('click', cerrar);
  fondo.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', async () => {
    fondo.querySelectorAll('button').forEach((x) => { x.disabled = true; });
    try {
      const r = await fetch(`${API_URL}/reportes/ia/${codigoPublico}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ respuesta: texto, motivo: b.dataset.m }),
      });
      if (!r.ok) throw new Error('fallo');
      boton.textContent = 'Reportado'; boton.dataset.hecho = '1'; boton.disabled = true;
      estado.textContent = 'Gracias, lo vamos a revisar.';
      setTimeout(cerrar, 1100);
    } catch (e) {
      estado.textContent = 'No se pudo enviar. Probá de nuevo.';
      fondo.querySelectorAll('button').forEach((x) => { x.disabled = false; });
    }
  }));
  const primero = fondo.querySelector('[data-m]'); if (primero) primero.focus();
}
