// Pantallas de Ajustes: Mi cuenta, Notificaciones, Seguridad, Apariencia, Privacidad, Centro de ayuda, Soporte y Acerca de.
// Cada una se dibuja al abrirla (dentro de la "pantalla completa" del panel) con datos reales de la cuenta.

const AJ = { pila: [], resumen: null, actividad: null };

// ---------- Navegación dentro de una pantalla (subpantallas con "volver") ----------
function ajTitulo(texto) { document.getElementById('pantalla-completa-titulo').textContent = texto; }
function ajHero(mostrar) { const h = document.getElementById('pantalla-completa-hero'); if (h) h.style.display = mostrar ? '' : 'none'; }
function ajReset() { AJ.pila = []; ajHero(true); }
// Devuelve true si "volver" se resolvió dentro de la pantalla (y no hay que cerrarla del todo)
function ajVolver() {
  if (!AJ.pila.length) return false;
  const anterior = AJ.pila.pop();
  anterior();
  ajAnimarContenido('mv-atras');
  return true;
}
// Pequeño deslizamiento al entrar a una subpantalla ('mv-adelante') o volver ('mv-atras')
function ajAnimarContenido(clase) {
  const el = document.getElementById('pantalla-completa-contenido');
  if (!el) return;
  el.classList.remove('mv-adelante', 'mv-atras');
  void el.offsetWidth; // reinicia la animación
  el.classList.add(clase);
}
function ajSub(panel, titulo, volverA, tituloAnterior, dibujar) {
  AJ.pila.push(() => { ajTitulo(tituloAnterior); volverA(); });
  ajTitulo(titulo); ajHero(false);
  panel.scrollTop = 0; document.getElementById('pantalla-completa').scrollTop = 0;
  dibujar();
  ajAnimarContenido('mv-adelante');
}

// ---------- Piezas de interfaz ----------
const ajGrupo = (titulo, cuerpo, nota = '') => `<div class="aj-grupo">${titulo ? `<h4>${titulo}</h4>` : ''}<div class="aj-caja">${cuerpo}</div>${nota ? `<p class="aj-nota">${nota}</p>` : ''}</div>`;
function ajFila({ icono, color = 'azul', titulo, desc = '', valor = '', accion = '', info = false, peligro = false }) {
  const flecha = info ? '' : `<span class="list-row-flecha">${ajIcono('chevron', 17)}</span>`;
  const attrs = info ? 'class="list-row aj-fila-info"' : `class="list-row ${peligro ? 'destructivo' : ''}" data-accion="${accion}"`;
  return `<${info ? 'div' : 'button'} ${attrs}>
    <span class="list-row-icono ic-${color}">${ajIcono(icono, 20)}</span>
    <span class="list-row-texto"><strong>${titulo}</strong>${desc ? `<span>${desc}</span>` : ''}</span>
    ${valor ? `<span class="aj-valor">${valor}</span>` : ''}${flecha}
  </${info ? 'div' : 'button'}>`;
}
const ajFilaSwitch = ({ icono, color, titulo, desc, clave, activo }) => `<label class="list-row aj-fila-switch">
  <span class="list-row-icono ic-${color}">${ajIcono(icono, 20)}</span>
  <span class="list-row-texto"><strong>${titulo}</strong>${desc ? `<span>${desc}</span>` : ''}</span>${ajSwitch(clave, activo)}</label>`;
const ajBanner = (tipo, icono, titulo, texto) => `<div class="aj-banner aj-banner-${tipo}"><span>${ajIcono(icono, 22)}</span><div><strong>${titulo}</strong><p>${texto}</p></div></div>`;
const ajError = (m) => `<div class="aj-aviso aj-aviso-error" role="alert">${ajIcono('alert', 16)}<span>${ajEsc(m)}</span></div>`;
const ajEnlazar = (panel, mapa) => panel.querySelectorAll('[data-accion]').forEach((el) => el.addEventListener('click', () => mapa[el.dataset.accion] && mapa[el.dataset.accion](el)));

async function ajResumen(forzar = false) {
  if (!AJ.resumen || forzar) AJ.resumen = await ajApi('/cuenta/resumen');
  return AJ.resumen;
}
const ajEsTurnos = () => negocioActual && negocioActual.tipoOperacion === 'turnos';
function ajFalloCarga(panel, reintentar) {
  panel.innerHTML = `<div class="aj-vacio"><span class="ic-gris">${ajIcono('alert', 26)}</span><strong>No pudimos cargar esto</strong><p>Revisá tu conexión y probá de nuevo.</p><button class="aj-btn aj-btn-suave" id="aj-reintentar">Reintentar</button></div>`;
  document.getElementById('aj-reintentar').addEventListener('click', reintentar);
}

// =====================================================================
// MI CUENTA
// =====================================================================
async function ajCuenta(panel) {
  panel.innerHTML = ajEsqueleto(4);
  let r;
  try { r = await ajResumen(true); } catch (e) { return ajFalloCarga(panel, () => ajCuenta(panel)); }
  const c = r.cuenta, n = r.negocio, q = r.cantidades;
  const nombre = c.nombre || n.nombre;
  const acceso = !c.conCuenta ? 'Sesión del negocio' : c.proveedor === 'google' ? (c.conClave ? 'Ingresás con Google o con tu usuario' : 'Ingresás con Google') : 'Ingresás con usuario y contraseña';
  const ETQ = { activa: 'Activa', prueba: 'En prueba', vencida: 'Vencida' };
  const pill = `<span class="aj-pill aj-pill-${n.suscripcion.estado}">${ETQ[n.suscripcion.estado] || n.suscripcion.estado}</span>`;
  const esT = ajEsTurnos();

  panel.innerHTML = `
    <div class="aj-perfil">
      <div class="aj-perfil-av">${ajEsc((nombre || 'M').trim().charAt(0).toUpperCase())}</div>
      <div><strong>${ajEsc(nombre)}</strong><span>${ajEsc(c.email || 'Sin correo')}</span><em>${ajIcono(c.proveedor === 'google' ? 'globe' : 'mail', 13)} ${acceso}</em></div>
    </div>
    ${c.conCuenta ? ajGrupo('Tus datos de acceso', `
      ${ajFila({ icono: 'user', color: 'azul', titulo: 'Nombre', desc: 'Cómo te llamamos en el panel', valor: ajEsc(c.nombre || 'Sin nombre'), accion: 'nombre' })}
      ${ajFila({ icono: 'at', color: 'violeta', titulo: 'Usuario', desc: 'Con el que entrás a tu cuenta', valor: c.usuario ? ajEsc(c.usuario) : 'Elegir', accion: 'usuario' })}
      ${ajFila({ icono: 'mail', color: 'celeste', titulo: 'Correo', desc: c.proveedor === 'google' ? 'Viene de tu cuenta de Google' : 'Tu correo de contacto', valor: ajEsc(c.email), accion: 'correo' })}
      ${ajFila({ icono: 'key', color: 'naranja', titulo: 'Contraseña', desc: c.conClave ? 'Para entrar con tu usuario' : 'Creá tu contraseña', valor: c.conClave ? '••••••••' : 'Crear', accion: 'clave' })}`,
      c.usuario ? '' : 'Elegí un usuario para poder entrar con él además de con Google o tu correo.') : ''}
    ${ajGrupo('Tu negocio', `
      ${ajFila({ icono: 'store', color: 'azul', titulo: ajEsc(n.nombre), desc: `${ajEsc(n.rubro || '')} · ${esT ? 'trabaja con turnos' : 'trabaja con pedidos'}`, info: true })}
      ${ajFila({ icono: 'card', color: 'verde', titulo: 'Suscripción', valor: pill, accion: 'plan' })}
      ${ajFila({ icono: 'calendar', color: 'celeste', titulo: 'Asistente creado', desc: ajFecha(n.creadoEn), info: true })}`)}
    ${ajGrupo('Tu actividad en Mi Asistente', `
      ${ajFila({ icono: 'message', color: 'violeta', titulo: 'Conversaciones con clientes', valor: q.conversaciones, info: true })}
      ${ajFila({ icono: 'users', color: 'naranja', titulo: 'Clientes recordados', valor: q.clientes, info: true })}
      ${ajFila({ icono: esT ? 'calendarCheck' : 'package', color: 'azul', titulo: esT ? 'Turnos recibidos' : 'Pedidos recibidos', valor: esT ? q.turnos : q.pedidos, accion: 'pedidos' })}
      ${ajFila({ icono: 'star', color: 'amarillo', titulo: 'Calificaciones', valor: q.resenas, accion: 'resenas' })}
      ${ajFila({ icono: 'tag', color: 'verde', titulo: 'Productos y servicios', valor: q.productos, accion: 'productos' })}`)}
    <div class="aj-acciones">
      <button class="aj-btn aj-btn-suave aj-btn-ancho" data-accion="salir">${ajIcono('logout', 18)} Cerrar sesión</button>
    </div>
    <div class="aj-zona-peligro">
      <button class="aj-zona-peligro-cab" id="aj-eliminar-abrir" aria-expanded="false">${ajIcono('trash', 18)}<span><strong>Eliminar cuenta</strong><small>Borra tu negocio y todos tus datos</small></span>${ajIcono('chevron', 16)}</button>
      <div class="aj-zona-peligro-cuerpo" id="aj-eliminar-cuerpo"><div>
        <p>Se eliminan para siempre tu cuenta, tu asistente, productos, fotos, pedidos, turnos, clientes, conversaciones y calificaciones. <strong>No se puede deshacer.</strong> Si tenés una suscripción activa, no se reembolsa.</p>
        <p class="aj-nota" style="margin-top:0">Antes de borrar, podés descargar una copia desde Ajustes → Privacidad.</p>
        <label for="aj-el-nombre">Para confirmar, escribí <b>${ajEsc(n.nombre)}</b></label>
        <input id="aj-el-nombre" type="text" autocomplete="off" placeholder="${ajEsc(n.nombre)}">
        ${c.conClave ? '<label for="aj-el-clave">Tu contraseña</label><input id="aj-el-clave" type="password" autocomplete="current-password">' : ''}
        <div id="aj-el-msg"></div>
        <button class="aj-btn aj-btn-peligro aj-btn-ancho" id="aj-eliminar" disabled>Eliminar mi cuenta definitivamente</button>
      </div></div>
    </div>`;

  ajEnlazar(panel, {
    nombre: () => ajSub(panel, 'Nombre', () => ajCuenta(panel), 'Mi cuenta', () => ajVistaNombre(panel, c)),
    usuario: () => ajSub(panel, 'Usuario', () => ajCuenta(panel), 'Mi cuenta', () => ajVistaUsuario(panel, c)),
    correo: () => ajSub(panel, 'Correo', () => ajCuenta(panel), 'Mi cuenta', () => ajVistaCorreo(panel, c)),
    clave: () => ajSub(panel, 'Contraseña', () => ajCuenta(panel), 'Mi cuenta', () => ajVistaClave(panel, c)),
    plan: () => { cerrarPantallaCompleta(); ajAbrirFS('panel-planes'); },
    pedidos: () => { cerrarPantallaCompleta(); mostrarSeccion('pedidos'); },
    resenas: () => { cerrarPantallaCompleta(); ajAbrirFS('panel-experiencia'); },
    productos: () => { cerrarPantallaCompleta(); mostrarSeccion('negocio'); ajAbrirFS('panel-productos'); },
    salir: async () => { if (await ajConfirmar({ titulo: '¿Seguro que querés cerrar sesión?', texto: 'Vas a tener que volver a ingresar con tu usuario y contraseña (o con Google) para usar el panel.', boton: 'Confirmar', icono: 'logout' })) cerrarSesion(); },
  });

  const abrir = document.getElementById('aj-eliminar-abrir'), cuerpo = document.getElementById('aj-eliminar-cuerpo');
  abrir.addEventListener('click', () => { const ab = cuerpo.classList.toggle('abierto'); abrir.setAttribute('aria-expanded', String(ab)); abrir.classList.toggle('abierto', ab); });
  const nom = document.getElementById('aj-el-nombre'), clave = document.getElementById('aj-el-clave'), bEl = document.getElementById('aj-eliminar');
  const validar = () => { bEl.disabled = nom.value.trim().toLowerCase() !== n.nombre.trim().toLowerCase() || (clave && !clave.value); };
  nom.addEventListener('input', validar); if (clave) clave.addEventListener('input', validar);
  bEl.addEventListener('click', async () => {
    const ok = await ajConfirmar({ titulo: '¿Eliminar todo?', texto: 'Última oportunidad: tu cuenta y tu negocio se borran para siempre.', boton: 'Sí, eliminar', peligro: true, icono: 'trash' });
    if (!ok) return;
    ajConCarga(bEl, 'Eliminando', async () => {
      try {
        await ajApi('/cuenta', { metodo: 'DELETE', cuerpo: { confirmacion: nom.value, password: clave ? clave.value : undefined } });
        try { await avDesactivarPush(); } catch (e) { /* ya no importa */ }
        localStorage.removeItem('jwtToken'); localStorage.removeItem('destinoAcceso');
        ['leidas', 'borradas', 'vistas'].forEach((k) => localStorage.removeItem(NT_K[k]));
        location.replace('index.html');
      } catch (e) { document.getElementById('aj-el-msg').innerHTML = ajError(e.message); }
    });
  });
}

// ---------- Subpantallas de Mi cuenta: nombre, usuario y correo ----------
const ajAyudaCampo = (id) => `<p class="aj-ayuda-campo" id="${id}"></p>`;

function ajVistaNombre(panel, c) {
  panel.innerHTML = `<form class="aj-form" id="aj-form-nombre" novalidate>
    <p class="aj-nota" style="margin:0 0 6px">Es el nombre que ves en tu panel y en tu perfil. Podés cambiarlo cuando quieras.</p>
    <label for="aj-nombre">Tu nombre</label>
    <input id="aj-nombre" type="text" maxlength="60" value="${ajEsc(c.nombre)}" autocomplete="name">
    <div id="aj-nombre-msg"></div>
    <button class="aj-btn aj-btn-primario aj-btn-ancho" id="aj-nombre-ok" type="submit" disabled style="margin-top:14px">Guardar nombre</button></form>`;
  const inp = document.getElementById('aj-nombre'), ok = document.getElementById('aj-nombre-ok');
  inp.addEventListener('input', () => { ok.disabled = inp.value.trim() === c.nombre || inp.value.trim().length < 2; });
  document.getElementById('aj-form-nombre').addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (ok.disabled) return;
    ajConCarga(ok, 'Guardando', async () => {
      try {
        await ajApi('/cuenta/nombre', { metodo: 'PUT', cuerpo: { nombre: inp.value } });
        ajToast('Nombre actualizado.');
        if (!ajVolver()) cerrarPantallaCompleta();
      } catch (e) { document.getElementById('aj-nombre-msg').innerHTML = ajError(e.message); }
    });
  });
}

function ajVistaUsuario(panel, c) {
  panel.innerHTML = `<form class="aj-form" id="aj-form-usuario" novalidate>
    <p class="aj-nota" style="margin:0 0 6px">Con este usuario y tu contraseña entrás a tu cuenta. Tiene que ser único: si ya lo usa otra persona, te avisamos.</p>
    <label for="aj-usuario">Tu usuario</label>
    <input id="aj-usuario" type="text" maxlength="20" value="${ajEsc(c.usuario)}" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Ej: panaderia.lucia">
    ${ajAyudaCampo('aj-usuario-ayuda')}
    <div id="aj-usuario-msg"></div>
    <button class="aj-btn aj-btn-primario aj-btn-ancho" id="aj-usuario-ok" type="submit" disabled style="margin-top:14px">Guardar usuario</button></form>`;
  const inp = document.getElementById('aj-usuario'), ok = document.getElementById('aj-usuario-ok'), ayuda = document.getElementById('aj-usuario-ayuda');
  const AYUDA = 'De 5 a 20 caracteres. Empieza con una letra; podés usar números, punto o guion bajo.';
  let estado = '', n = 0, reloj = null;
  const pintar = (cls, txt) => { ayuda.className = `aj-ayuda-campo ${cls}`; ayuda.textContent = txt; inp.classList.toggle('ok', cls === 'ok'); inp.classList.toggle('mal', cls === 'mal'); };
  ayuda.textContent = AYUDA;
  const revisar = () => {
    clearTimeout(reloj); const mio = ++n;
    const u = inp.value.trim().toLowerCase(); estado = '';
    ok.disabled = true;
    if (u === (c.usuario || '')) return pintar('', AYUDA);
    if (!u) return pintar('', AYUDA);
    const invalido = validarUsuario(u);
    if (invalido) { estado = 'mal'; return pintar('mal', invalido); }
    pintar('', 'Revisando si está libre...');
    reloj = setTimeout(async () => {
      try {
        const r = await ajApi(`/cuenta/usuario-disponible?usuario=${encodeURIComponent(u)}`);
        if (mio !== n) return;
        estado = r.disponible ? 'ok' : 'mal';
        pintar(estado, r.disponible ? '✓ Ese usuario está disponible.' : (r.mensaje || 'Ese usuario ya está en uso. Elegí otro.'));
        ok.disabled = !r.disponible;
      } catch (e) { if (mio === n) { pintar('', AYUDA); ok.disabled = false; } } // si no se pudo revisar, el servidor lo controla al guardar
    }, 350);
  };
  inp.addEventListener('input', revisar);
  document.getElementById('aj-form-usuario').addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (ok.disabled) return;
    ajConCarga(ok, 'Guardando', async () => {
      try {
        await ajApi('/cuenta/usuario', { metodo: 'PUT', cuerpo: { usuario: inp.value } });
        ajToast('Usuario actualizado.');
        if (!ajVolver()) cerrarPantallaCompleta();
      } catch (e) {
        if (/ya está en uso/i.test(e.message)) { pintar('mal', e.message); ok.disabled = true; } else document.getElementById('aj-usuario-msg').innerHTML = ajError(e.message);
      }
    });
  });
}

function ajVistaCorreo(panel, c) {
  if (c.proveedor !== 'email' || !c.conClave) {
    panel.innerHTML = `${ajBanner('ok', 'globe', 'Tu correo viene de Google', 'Ingresás con tu cuenta de Google y ese es tu correo: <b>' + ajEsc(c.email) + '</b>. Si querés usar otro, tenés que cambiarlo en tu cuenta de Google.')}
      <a class="aj-btn aj-btn-primario aj-btn-ancho" href="https://myaccount.google.com/email" target="_blank" rel="noopener">Abrir mi cuenta de Google</a>`;
    return;
  }
  panel.innerHTML = `<form class="aj-form" id="aj-form-correo" novalidate>
    <p class="aj-nota" style="margin:0 0 6px">Tu correo actual es <b>${ajEsc(c.email)}</b>. Por seguridad, para cambiarlo te pedimos tu contraseña.</p>
    <label for="aj-correo">Correo nuevo</label>
    <input id="aj-correo" type="email" inputmode="email" autocomplete="email" autocapitalize="none" placeholder="nuevocorreo@ejemplo.com">
    <label for="aj-correo-clave">Tu contraseña</label>
    <div class="aj-clave"><input id="aj-correo-clave" type="password" autocomplete="current-password"><button type="button" class="aj-ojo" id="aj-correo-ojo" aria-label="Mostrar contraseña">${ajIcono('eye', 18)}</button></div>
    <div id="aj-correo-msg"></div>
    <button class="aj-btn aj-btn-primario aj-btn-ancho" id="aj-correo-ok" type="submit" disabled style="margin-top:14px">Guardar correo</button></form>`;
  const em = document.getElementById('aj-correo'), cl = document.getElementById('aj-correo-clave'), ok = document.getElementById('aj-correo-ok');
  document.getElementById('aj-correo-ojo').addEventListener('click', (e) => { const ver = cl.type === 'password'; cl.type = ver ? 'text' : 'password'; e.currentTarget.innerHTML = ajIcono(ver ? 'eyeOff' : 'eye', 18); });
  const validar = () => { ok.disabled = !(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim()) && em.value.trim().toLowerCase() !== c.email && cl.value); };
  em.addEventListener('input', validar); cl.addEventListener('input', validar);
  document.getElementById('aj-form-correo').addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (ok.disabled) return;
    ajConCarga(ok, 'Guardando', async () => {
      try {
        await ajApi('/cuenta/correo', { metodo: 'PUT', cuerpo: { email: em.value, password: cl.value } });
        ajToast('Correo actualizado.');
        if (!ajVolver()) cerrarPantallaCompleta();
      } catch (e) { document.getElementById('aj-correo-msg').innerHTML = ajError(e.message); }
    });
  });
}

// =====================================================================
// NOTIFICACIONES
// =====================================================================
async function ajNotificaciones(panel) {
  panel.innerHTML = ajEsqueleto(4);
  let prefs, push;
  try { [prefs, push] = await Promise.all([ajApi('/cuenta/notificaciones'), avEstadoPush()]); } catch (e) { return ajFalloCarga(panel, () => ajNotificaciones(panel)); }
  const esT = ajEsTurnos();
  const ESTADOS = {
    activo: ['ok', 'bell', 'Avisos activados en este dispositivo', 'Te llegan al celular aunque tengas el panel cerrado.'],
    inactivo: ['aviso', 'bellOff', 'Avisos desactivados en este dispositivo', 'Activalos para enterarte al instante de pedidos, turnos y reseñas.'],
    bloqueado: ['error', 'bellOff', 'Los avisos están bloqueados', 'Habilitalos desde los permisos del navegador para este sitio y volvé acá.'],
    'no-soportado': ['aviso', 'info', 'Este navegador no permite avisos', 'En iPhone: abrí el panel en Safari → Compartir → "Agregar a pantalla de inicio" y activalos desde ahí.'],
    'sin-servidor': ['aviso', 'info', 'Avisos al celular no disponibles', 'El servidor todavía no los tiene configurados. Mientras tanto, los avisos funcionan con el panel abierto.'],
  };
  const e = ESTADOS[push.estado] || ESTADOS.inactivo;
  const sonido = ntSonidoActivo();

  const filas = [
    esT ? ['turnos', 'calendarCheck', 'azul', 'Turnos nuevos', 'Reservas y turnos por confirmar.'] : ['pedidos', 'package', 'azul', 'Pedidos nuevos', 'Cuando un cliente hace un pedido por el chat.'],
    esT ? null : ['comprobantes', 'receipt', 'verde', 'Comprobantes de pago', 'Cuando alguien adjunta una transferencia para revisar.'],
    ['resenas', 'star', 'amarillo', 'Calificaciones y reseñas', 'Lo que opinan tus clientes de tu atención.'],
    ['preguntas', 'help', 'violeta', 'Preguntas sin responder', 'Cuando tu asistente no supo qué contestar.'],
    ['agenda', 'calendar', 'celeste', 'Recordatorios de tu agenda', 'Eventos y tareas que cargaste.'],
    ['suscripcion', 'card', 'naranja', 'Tu suscripción', 'Aviso antes de que venza y cuando vence.'],
    ['soporte', 'message', 'verde', 'Respuestas de soporte', 'Cuando respondemos una consulta tuya.'],
  ].filter(Boolean);

  const dispositivos = push.dispositivos || [];
  panel.innerHTML = `
    ${ajBanner(e[0], e[1], e[2], e[3])}
    ${push.estado === 'activo' || push.estado === 'inactivo' ? `<div class="aj-acciones" style="margin-top:0">
      ${push.estado === 'activo'
        ? '<button class="aj-btn aj-btn-suave aj-btn-ancho" id="aj-push-off">Desactivar en este dispositivo</button><button class="aj-btn aj-btn-primario aj-btn-ancho" id="aj-push-test">Enviarme un aviso de prueba</button>'
        : '<button class="aj-btn aj-btn-primario aj-btn-ancho" id="aj-push-on">Activar en este dispositivo</button>'}
    </div>` : ''}
    ${ajGrupo('Qué avisos querés recibir en el celular', filas.map((f) => ajFilaSwitch({ clave: f[0], icono: f[1], color: f[2], titulo: f[3], desc: f[4], activo: prefs[f[0]] !== false })).join(''),
      'La campana del panel siempre muestra todos los avisos; esto controla solo los que llegan al celular.')}
    ${ajGrupo('Dentro del panel', ajFilaSwitch({ clave: '__sonido', icono: 'bell', color: 'naranja', titulo: 'Sonido al llegar un aviso', desc: 'Suena mientras tenés el panel abierto.', activo: sonido }))}
    ${dispositivos.length ? ajGrupo(`Dispositivos con avisos (${dispositivos.length})`, dispositivos.map((d, i) => `
      <div class="list-row aj-fila-info"><span class="list-row-icono ic-${/Android|iPhone/.test(d.nombre) ? 'violeta' : 'celeste'}">${ajIcono(/Android|iPhone/.test(d.nombre) ? 'phone' : 'monitor', 20)}</span>
      <span class="list-row-texto"><strong>${ajEsc(d.nombre || 'Dispositivo')}${d.endpoint === push.endpointActual ? ' <em class="aj-este">Este</em>' : ''}</strong><span>Desde el ${ajFecha(d.desde)}</span></span>
      <button class="aj-btn aj-btn-suave aj-btn-chico" data-quitar="${i}">Quitar</button></div>`).join('')) : ''}`;

  const guardar = async (clave, valor, el) => {
    try {
      const nuevas = {}; nuevas[clave] = valor;
      await ajApi('/cuenta/notificaciones', { metodo: 'PUT', cuerpo: nuevas });
      ajToast(valor ? 'Aviso activado.' : 'Aviso desactivado.', 'ok', { duracion: 1800 });
    } catch (err) { el.checked = !valor; ajToast(err.message, 'error'); }
  };
  panel.querySelectorAll('.aj-sw input').forEach((el) => el.addEventListener('change', () => {
    if (el.dataset.k === '__sonido') { localStorage.setItem(NT_K.sonido, el.checked ? '1' : '0'); if (el.checked && typeof reproducirSonidoAviso === 'function') reproducirSonidoAviso(); ajToast(el.checked ? 'Sonido activado.' : 'Sonido desactivado.', 'ok', { duracion: 1800 }); return; }
    guardar(el.dataset.k, el.checked, el);
  }));
  const on = document.getElementById('aj-push-on');
  if (on) on.addEventListener('click', () => ajConCarga(on, 'Activando', async () => { try { await avActivarPush(); ajToast('Avisos activados en este dispositivo.'); } catch (err) { ajToast(err.message, 'error'); } ajNotificaciones(panel); }));
  const off = document.getElementById('aj-push-off');
  if (off) off.addEventListener('click', () => ajConCarga(off, 'Desactivando', async () => { try { await avDesactivarPush(); ajToast('Avisos desactivados en este dispositivo.'); } catch (err) { ajToast(err.message, 'error'); } ajNotificaciones(panel); }));
  const test = document.getElementById('aj-push-test');
  if (test) test.addEventListener('click', () => ajConCarga(test, 'Enviando', async () => {
    try { const d = await ajApi('/push/dueno/probar', { metodo: 'POST' }); ajToast(d.enviados ? 'Listo: revisá las notificaciones de tu celular.' : 'No se pudo enviar. Probá desactivar y volver a activar.', d.enviados ? 'ok' : 'error'); } catch (err) { ajToast(err.message, 'error'); }
  }));
  panel.querySelectorAll('[data-quitar]').forEach((b) => b.addEventListener('click', () => ajConCarga(b, '...', async () => {
    try { await avDesactivarPush(dispositivos[b.dataset.quitar].endpoint); ajToast('Dispositivo quitado.'); } catch (err) { ajToast(err.message, 'error'); }
    ajNotificaciones(panel);
  })));
}

// =====================================================================
// SEGURIDAD
// =====================================================================
async function ajSeguridad(panel) {
  panel.innerHTML = ajEsqueleto(3);
  let r, act;
  try { [r, act] = await Promise.all([ajResumen(true), ajApi('/cuenta/actividad')]); } catch (e) { return ajFalloCarga(panel, () => ajSeguridad(panel)); }
  AJ.actividad = act;
  const c = r.cuenta;
  const ayer = Date.now() - 86400000;
  const otros = act.filter((a) => a.tipo === 'inicio_sesion' && new Date(a.fecha).getTime() > ayer);
  const dibujar = () => {
    panel.innerHTML = `
      ${c.conCuenta
        ? (otros.length > 1
          ? ajBanner('aviso', 'shieldAlert', 'Hubo varios accesos en las últimas 24 horas', 'Revisá la actividad reciente. Si no fuiste vos, cerrá las sesiones en otros dispositivos.')
          : ajBanner('ok', 'shield', 'Tu cuenta está al día', c.proveedor === 'google' ? 'Ingresás con Google o con tu usuario y contraseña.' : 'No detectamos nada raro en tu cuenta.'))
        : ajBanner('aviso', 'info', 'Esta sesión no tiene cuenta personal', 'Ingresá con Google o con tu correo para acceder a todas las opciones de seguridad.')}
      ${ajGrupo('Acceso', `
        ${ajFila({ icono: 'key', color: 'violeta', titulo: 'Contraseña', desc: c.conClave ? 'Cambiala cuando quieras' : 'Creá tu contraseña', valor: c.conClave ? '' : 'Crear', accion: 'clave' })}
        ${ajFila({ icono: 'phone', color: 'naranja', titulo: 'Cerrar sesión en otros dispositivos', desc: 'Deja afuera a cualquiera que haya ingresado antes', accion: 'cerrar-otros' })}`)}
      ${ajGrupo('Movimientos', `
        ${ajFila({ icono: 'history', color: 'azul', titulo: 'Actividad reciente', desc: 'Inicios de sesión de los últimos 90 días', valor: act.length || '', accion: 'actividad' })}`)}
      ${ajGrupo('Cuidá tus datos', `
        ${ajFila({ icono: 'bell', color: 'celeste', titulo: 'Avisos de tu cuenta', desc: 'Enterate de lo que pasa en tu negocio al instante', accion: 'avisos' })}
        ${ajFila({ icono: 'shield', color: 'verde', titulo: 'Privacidad y datos', desc: 'Qué guardamos, descargar o borrar', accion: 'privacidad' })}`)}`;
    ajEnlazar(panel, {
      clave: () => ajSub(panel, 'Contraseña', dibujar, 'Seguridad', () => ajVistaClave(panel, c)),
      'cerrar-otros': async () => {
        if (!c.conCuenta) return ajToast('Necesitás una cuenta personal para esto.', 'error');
        if (!(await ajConfirmar({ titulo: '¿Cerrar sesión en otros dispositivos?', texto: 'Cualquier otro celular o computadora que tenga tu cuenta abierta va a tener que ingresar de nuevo. Este dispositivo sigue adentro.', boton: 'Cerrar las demás sesiones', icono: 'phone' }))) return;
        try {
          const d = await ajApi('/cuenta/cerrar-sesiones', { metodo: 'POST' });
          jwtTokenActual = d.token; localStorage.setItem('jwtToken', d.token);
          ajToast('Cerraste las sesiones en los demás dispositivos.'); ajSeguridad(panel);
        } catch (e) { ajToast(e.message, 'error'); }
      },
      actividad: () => ajSub(panel, 'Actividad reciente', dibujar, 'Seguridad', () => ajVistaActividad(panel, act)),
      avisos: () => { cerrarPantallaCompleta(); ajAbrirFS('panel-notificaciones'); },
      privacidad: () => { cerrarPantallaCompleta(); ajAbrirFS('panel-privacidad'); },
    });
  };
  dibujar();
}

// Cuenta sin contraseña todavía: se crea acá (solo hace falta la nueva).
function ajVistaCrearClave(panel, c) {
  panel.innerHTML = `<form class="aj-form" id="aj-form-nueva" novalidate>
    <p class="aj-nota" style="margin:0 0 6px">Con tu usuario y esta contraseña vas a poder entrar cuando quieras, además de Google. Puede ser solo números, solo letras o una mezcla (mínimo 8, sin espacios).</p>
    <label for="aj-nueva1">Tu contraseña</label>
    <input id="aj-nueva1" type="password" autocomplete="new-password" maxlength="100">
    <div id="aj-nueva-msg"></div>
    <button class="aj-btn aj-btn-primario aj-btn-ancho" id="aj-nueva-ok" type="submit" disabled style="margin-top:14px">Crear contraseña</button></form>`;
  const i = document.getElementById('aj-nueva1'), ok = document.getElementById('aj-nueva-ok');
  i.addEventListener('input', () => { ok.disabled = !!validarContrasena(i.value, c.usuario); });
  document.getElementById('aj-form-nueva').addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (ok.disabled) return;
    ajConCarga(ok, 'Guardando', async () => {
      try {
        const d = await ajApi('/cuenta/contrasena', { metodo: 'POST', cuerpo: { nueva: i.value } });
        jwtTokenActual = d.token; localStorage.setItem('jwtToken', d.token);
        ajToast('Contraseña creada.');
        if (!ajVolver()) cerrarPantallaCompleta();
      } catch (err) { document.getElementById('aj-nueva-msg').innerHTML = ajError(err.message); }
    });
  });
}

function ajVistaClave(panel, c) {
  if (!c.conClave) { ajVistaCrearClave(panel, c); return; }
  panel.innerHTML = `<form class="aj-form" id="aj-form-clave" novalidate>
    <p class="aj-nota" style="margin:0 0 6px">Al cambiarla, se cierra la sesión en los demás dispositivos. Este sigue adentro.</p>
    ${['actual:Contraseña actual:current-password', 'nueva:Contraseña nueva (mínimo 8 caracteres):new-password', 'repetir:Repetí la contraseña nueva:new-password'].map((x) => { const [id, et, ac] = x.split(':'); return `<label for="aj-${id}">${et}</label><div class="aj-clave"><input id="aj-${id}" type="password" autocomplete="${ac}"><button type="button" class="aj-ojo" data-ojo="aj-${id}" aria-label="Mostrar contraseña">${ajIcono('eye', 18)}</button></div>`; }).join('')}
    <div class="aj-medidor" id="aj-medidor"><i></i><i></i><i></i><i></i><span id="aj-medidor-tx"></span></div>
    <div id="aj-clave-msg"></div>
    <button class="aj-btn aj-btn-primario aj-btn-ancho" id="aj-clave-ok" type="submit" disabled>Cambiar contraseña</button></form>`;
  panel.querySelectorAll('.aj-ojo').forEach((b) => b.addEventListener('click', () => { const i = document.getElementById(b.dataset.ojo); const ver = i.type === 'password'; i.type = ver ? 'text' : 'password'; b.innerHTML = ajIcono(ver ? 'eyeOff' : 'eye', 18); }));
  const [a, n, r] = ['aj-actual', 'aj-nueva', 'aj-repetir'].map((id) => document.getElementById(id));
  const ok = document.getElementById('aj-clave-ok');
  const fuerza = (t) => { let p = 0; if (t.length >= 8) p++; if (t.length >= 12) p++; if (/[A-Z]/.test(t) && /[a-z]/.test(t)) p++; if (/\d/.test(t) && /[^A-Za-z0-9]|[a-z]/.test(t)) p++; return t ? Math.max(1, p) : 0; };
  const refrescar = () => {
    const f = fuerza(n.value);
    document.getElementById('aj-medidor').dataset.n = f;
    document.getElementById('aj-medidor-tx').textContent = ['', 'Débil', 'Aceptable', 'Buena', 'Muy buena'][f];
    ok.disabled = !(a.value && !validarContrasena(n.value, c.usuario) && n.value === r.value);
  };
  [a, n, r].forEach((i) => i.addEventListener('input', refrescar));
  document.getElementById('aj-form-clave').addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (ok.disabled) return;
    ajConCarga(ok, 'Cambiando', async () => {
      try {
        const d = await ajApi('/cuenta/contrasena', { metodo: 'POST', cuerpo: { actual: a.value, nueva: n.value } });
        jwtTokenActual = d.token; localStorage.setItem('jwtToken', d.token);
        ajToast('Contraseña cambiada. Cerramos las demás sesiones.');
        if (!ajVolver()) cerrarPantallaCompleta();
      } catch (err) { document.getElementById('aj-clave-msg').innerHTML = ajError(err.message); }
    });
  });
}

function ajVistaActividad(panel, act) {
  if (!act.length) { panel.innerHTML = `<div class="aj-vacio"><span class="ic-azul">${ajIcono('history', 26)}</span><strong>Sin movimientos todavía</strong><p>Acá vas a ver cada inicio de sesión de tu cuenta.</p></div>`; return; }
  const T = { inicio_sesion: ['Inicio de sesión', 'user', 'azul'], registro: ['Creaste tu cuenta', 'sparkles', 'verde'], cambio_clave: ['Cambiaste tu contraseña', 'key', 'violeta'], cierre_global: ['Cerraste las demás sesiones', 'phone', 'naranja'], cambio_usuario: ['Cambiaste tu usuario', 'at', 'violeta'], cambio_correo: ['Cambiaste tu correo', 'mail', 'celeste'] };
  panel.innerHTML = `<p class="aj-nota" style="margin:0 0 10px">Si ves un acceso que no reconocés, cerrá las sesiones en otros dispositivos y cambiá tu contraseña.</p>` +
    ajGrupo('', act.map((a, i) => { const t = T[a.tipo] || ['Movimiento', 'info', 'gris']; return `<div class="list-row aj-fila-info ${i === 0 ? '' : ''}"><span class="list-row-icono ic-${t[2]}">${ajIcono(t[1], 20)}</span><span class="list-row-texto"><strong>${t[0]}</strong><span>${ajEsc(a.dispositivo || 'Dispositivo')}${a.metodo ? ` · con ${a.metodo === 'google' ? 'Google' : 'correo'}` : ''}</span></span><span class="aj-valor">${ajHace(a.fecha)}</span></div>`; }).join(''));
}

// =====================================================================
// APARIENCIA
// =====================================================================
function ajApariencia(panel) {
  const cfg = Apariencia.leer();
  const TEMAS = [['claro', 'Claro', 'sun', 'naranja', 'Fondo blanco, ideal de día.'], ['oscuro', 'Oscuro', 'moon', 'violeta', 'Descansa la vista de noche.'], ['auto', 'Automático', 'phone', 'celeste', 'Sigue el modo de tu celular.']];
  const NIVELES = [['sutil', 'Sutil', 'Solo botones y detalles.'], ['equilibrado', 'Equilibrado', 'Cabeceras, botones y gráficos.'], ['intenso', 'Intenso', 'Más color en toda la app.']];
  const FORMAS = [['recta', 'Rectas', 6], ['suave', 'Suaves', 12], ['redondeada', 'Redondeadas', 20]];
  const FUENTES = [['moderna', 'Moderna', "'Manrope', sans-serif", 'Manrope'], ['sistema', 'Del sistema', "-apple-system, 'Segoe UI', system-ui, sans-serif", 'Sistema'], ['clasica', 'Clásica', 'Georgia, serif', 'Títulos clásicos']];
  const fila = (clave, valor, actual, cuerpo, extra = '') => `<button type="button" class="ap-op ${actual === valor ? 'sel' : ''}" data-ap="${clave}:${valor}" ${extra}>${cuerpo}<span class="ap-check">${ajIcono('check', 12)}</span></button>`;

  panel.innerHTML = `
    <div class="aj-previa" id="aj-previa"><div class="aj-previa-top"><span></span><b>Así se va a ver</b></div>
      <div class="aj-previa-cuerpo"><div class="aj-previa-ic">${ajIcono('sparkles', 18)}</div><div><strong>Tu asistente está trabajando</strong><span>Hoy atendió 14 conversaciones.</span></div></div>
      <div class="aj-previa-botones"><span class="aj-previa-btn">Probar</span><span class="aj-previa-chip">Pedidos</span></div></div>

    ${ajGrupo('Tema', TEMAS.map((t) => `<button class="list-row aj-opcion ${cfg.tema === t[0] ? 'sel' : ''}" data-tema="${t[0]}"><span class="list-row-icono ic-${t[3]}">${ajIcono(t[2], 20)}</span><span class="list-row-texto"><strong>${t[1]}</strong><span>${t[4]}</span></span><span class="aj-radio">${ajIcono('check', 14)}</span></button>`).join(''))}

    ${ajGrupo('Color de la app', `<div class="aj-colores">${Object.entries(Apariencia.ACENTOS).map(([id, a]) => `<button class="aj-color ${cfg.acento === id ? 'sel' : ''}" data-acento="${id}" style="--c:${a.main}" aria-label="${a.nombre}"><i>${ajIcono('check', 16)}</i><span>${a.nombre}</span></button>`).join('')}
      <label class="aj-color aj-color-propio ${cfg.acento === 'personal' ? 'sel' : ''}" data-acento="personal" style="--c:${Apariencia.derivar(cfg.acentoPersonal).main}"><i>${ajIcono('check', 16)}</i><span>Propio</span><input type="color" id="ap-color-propio" value="${cfg.acentoPersonal}" aria-label="Elegir un color propio"></label></div>`,
      'Elegí uno de la lista o tocá “Propio” para crear el tuyo (por ejemplo, el color de tu marca).')}

    ${ajGrupo('Cuánto color querés ver', `<div class="ap-grid ap-grid-3">${NIVELES.map((n) => fila('nivel', n[0], cfg.nivel, `<span class="ap-nivel ap-nivel-${n[0]}"><i></i><i></i><i></i></span><b>${n[1]}</b><small>${n[2]}</small>`)).join('')}</div>`,
      'Cambia cuánto se nota el color en la barra de arriba, el menú, los gráficos y los fondos.')}

    ${ajGrupo('Forma de las esquinas', `<div class="ap-grid ap-grid-3">${FORMAS.map((f) => fila('forma', f[0], cfg.forma, `<span class="ap-forma" style="border-top-left-radius:${f[2]}px"></span><b>${f[1]}</b>`)).join('')}</div>`)}

    ${ajGrupo('Tipografía', `<div class="ap-grid ap-grid-3">${FUENTES.map((f) => fila('fuente', f[0], cfg.fuente, `<span class="ap-aa" style="font-family:${f[2]}">Aa</span><b>${f[1]}</b>`)).join('')}</div>`)}

    ${ajGrupo('Tamaño del texto', `<div class="aj-caja-pad"><div class="seg" id="aj-seg-texto" data-i="0"><i class="seg-thumb"></i>${[['normal', 'Normal'], ['grande', 'Grande'], ['extra', 'Muy grande']].map(([id, n]) => `<button class="${cfg.texto === id ? 'activo' : ''}" data-texto="${id}">${n}</button>`).join('')}</div></div>`)}

    ${ajGrupo('Espaciado', `<div class="ap-grid ap-grid-2">${fila('densidad', 'comoda', cfg.densidad, `<span class="ap-dens ap-dens-comoda"><i></i><i></i><i></i></span><b>Cómodo</b><small>Más aire entre elementos.</small>`)}${fila('densidad', 'compacta', cfg.densidad, `<span class="ap-dens ap-dens-compacta"><i></i><i></i><i></i><i></i></span><b>Compacto</b><small>Más cosas en pantalla.</small>`)}</div>`)}

    ${ajGrupo('Barra de abajo', `<div class="ap-grid ap-grid-2">${fila('barra', 'texto', cfg.barra, `<span class="ap-barra"><i></i><i></i><i></i></span><b>Íconos y nombres</b>`)}${fila('barra', 'iconos', cfg.barra, `<span class="ap-barra ap-barra-sola"><i></i><i></i><i></i></span><b>Solo íconos</b>`)}</div>`)}

    ${ajGrupo('Movimiento', ajFilaSwitch({ clave: 'mov', icono: 'zap', color: 'amarillo', titulo: 'Reducir animaciones', desc: 'Menos movimiento en pantallas y transiciones.', activo: cfg.movimiento === 'reducido' }))}
    <button class="aj-btn aj-btn-suave aj-btn-ancho" id="aj-ap-reset">Restablecer apariencia</button>`;

  const refrescar = () => {
    const c = Apariencia.leer();
    panel.querySelectorAll('[data-tema]').forEach((b) => b.classList.toggle('sel', b.dataset.tema === c.tema));
    panel.querySelectorAll('[data-acento]').forEach((b) => b.classList.toggle('sel', b.dataset.acento === c.acento));
    panel.querySelectorAll('[data-texto]').forEach((b) => b.classList.toggle('activo', b.dataset.texto === c.texto));
    panel.querySelectorAll('[data-ap]').forEach((b) => { const [k, v] = b.dataset.ap.split(':'); b.classList.toggle('sel', c[k] === v); });
    const propio = panel.querySelector('.aj-color-propio'); if (propio) propio.style.setProperty('--c', Apariencia.derivar(c.acentoPersonal).main);
    if (typeof posicionarSelectores === 'function') posicionarSelectores();
  };
  panel.querySelectorAll('[data-tema]').forEach((b) => b.addEventListener('click', () => { Apariencia.guardar({ tema: b.dataset.tema }); refrescar(); }));
  panel.querySelectorAll('button[data-acento]').forEach((b) => b.addEventListener('click', () => { Apariencia.guardar({ acento: b.dataset.acento }); refrescar(); }));
  const propio = document.getElementById('ap-color-propio');
  propio.addEventListener('input', () => { Apariencia.guardar({ acento: 'personal', acentoPersonal: propio.value }); refrescar(); });
  panel.querySelectorAll('[data-texto]').forEach((b) => b.addEventListener('click', () => { Apariencia.guardar({ texto: b.dataset.texto }); refrescar(); }));
  panel.querySelectorAll('[data-ap]').forEach((b) => b.addEventListener('click', () => { const [k, v] = b.dataset.ap.split(':'); Apariencia.guardar({ [k]: v }); refrescar(); }));
  panel.querySelector('[data-k="mov"]').addEventListener('change', (e) => Apariencia.guardar({ movimiento: e.target.checked ? 'reducido' : 'normal' }));
  document.getElementById('aj-ap-reset').addEventListener('click', () => { Apariencia.guardar(Apariencia.DEFECTO); ajApariencia(panel); ajToast('Apariencia restablecida.'); });
  if (typeof posicionarSelectores === 'function') posicionarSelectores();
}

// =====================================================================
// PRIVACIDAD
// =====================================================================
async function ajPrivacidad(panel) {
  panel.innerHTML = ajEsqueleto(4);
  let r;
  try { r = await ajResumen(true); } catch (e) { return ajFalloCarga(panel, () => ajPrivacidad(panel)); }
  const q = r.cantidades, esT = ajEsTurnos();
  const memoria = r.negocio.memoriaActiva;
  const proveedores = [
    ['sparkles', 'violeta', 'Anthropic (Claude)', 'La inteligencia artificial que redacta las respuestas. Recibe los mensajes del chat y la información de tu negocio necesaria para responder.'],
    ['globe', 'azul', 'Google', 'Inicio de sesión con tu cuenta.'],
    ['card', 'verde', 'Mercado Pago', 'Cobro de tu suscripción. Nunca vemos los datos de tu tarjeta.'],
    ['image', 'naranja', 'Cloudinary', 'Guarda tus fotos y los comprobantes de pago.'],
    ['shield', 'celeste', 'Alojamiento y base de datos', 'Los servicios donde viven tus datos de forma segura.'],
  ];
  const borrables = [
    ['conversaciones', 'message', 'violeta', 'Borrar historial de conversaciones', `${q.conversaciones} conversaciones con clientes`, 'Se borran los chats guardados. Los pedidos y turnos no se tocan.'],
    ['clientes', 'users', 'naranja', 'Borrar fichas de clientes', `${q.clientes} clientes recordados`, 'El asistente olvida a quienes ya compraron: nombre, último pedido y dirección. Los pedidos no se tocan.'],
    ['resenas', 'star', 'amarillo', 'Borrar calificaciones', `${q.resenas} calificaciones`, 'Se borran todas las calificaciones y reseñas, y se reinicia tu promedio.'],
    ['agenda', 'calendar', 'celeste', 'Borrar mi agenda personal', `${q.agenda} eventos y tareas`, 'Se borran todos los eventos y tareas de la pestaña Agenda.'],
    ['pruebas', 'zap', 'verde', `Borrar ${esT ? 'turnos' : 'pedidos'} de prueba`, `${q.pruebas} de "Probar al asistente"`, 'Se borran solo los que se generaron probando al asistente. Los reales no se tocan.'],
  ];
  panel.innerHTML = `
    ${ajGrupo('Cómo se usan tus datos', `
      ${ajFilaSwitch({ clave: 'memoria', icono: 'users', color: 'naranja', titulo: 'Recordar a mis clientes', desc: 'El asistente reconoce a quien ya compró antes.', activo: memoria })}
      ${ajFila({ icono: 'zap', color: 'violeta', titulo: 'Permisos del asistente', desc: 'Qué puede hacer por su cuenta', accion: 'permisos' })}`,
      'Apagar la memoria no borra lo ya guardado: usá "Borrar fichas de clientes" más abajo.')}
    ${ajGrupo('Lo que guardamos de tu negocio', `
      ${ajFila({ icono: 'message', color: 'violeta', titulo: 'Conversaciones', valor: q.conversaciones, info: true })}
      ${ajFila({ icono: 'users', color: 'naranja', titulo: 'Fichas de clientes', valor: q.clientes, info: true })}
      ${ajFila({ icono: esT ? 'calendarCheck' : 'package', color: 'azul', titulo: esT ? 'Turnos' : 'Pedidos', valor: esT ? q.turnos : q.pedidos, info: true })}
      ${ajFila({ icono: 'star', color: 'amarillo', titulo: 'Calificaciones', valor: q.resenas, info: true })}
      ${ajFila({ icono: 'tag', color: 'verde', titulo: 'Productos y fotos', valor: `${q.productos} · ${r.negocio.fotos}`, info: true })}`)}
    ${ajGrupo('Qué ve cada uno', `
      <div class="aj-dos"><div><h5>${ajIcono('globe', 15)} Es público</h5><p>Lo que ve cualquiera que abre tu chat: nombre y logo, horarios, productos y precios, fotos que cargaste y promociones activas.</p></div>
      <div><h5>${ajIcono('lock', 15)} Es privado</h5><p>Solo lo ves vos: pedidos, datos de contacto de tus clientes, conversaciones, comprobantes, estadísticas y tu cuenta.</p></div></div>`)}
    ${ajGrupo('Quién recibe datos', proveedores.map((p) => ajFila({ icono: p[0], color: p[1], titulo: p[2], desc: p[3], info: true })).join(''), 'No vendemos tus datos ni los de tus clientes, ni los usamos para publicidad.')}
    ${ajGrupo('Tus datos, tu decisión', `
      ${ajFila({ icono: 'download', color: 'azul', titulo: 'Descargar mis datos', desc: 'Una copia de todo, en un archivo', accion: 'descargar' })}
      ${borrables.map((b) => ajFila({ icono: b[1], color: b[2], titulo: b[3], desc: b[4], accion: `borrar:${b[0]}` })).join('')}
      ${ajFila({ icono: 'trash', color: 'rojo', titulo: 'Eliminar mi cuenta', desc: 'Borra el negocio y todos tus datos', accion: 'eliminar', peligro: true })}`)}`;

  panel.querySelector('[data-k="memoria"]').addEventListener('change', async (ev) => {
    const el = ev.target, v = el.checked;
    try {
      const d = await ajApi('/negocios/mi-negocio', { metodo: 'PUT', cuerpo: { memoriaActiva: v } });
      negocioActual = d.negocio; const chk = document.getElementById('check-memoria-activa'); if (chk) chk.checked = v;
      AJ.resumen = null; ajToast(v ? 'El asistente va a recordar a tus clientes.' : 'El asistente ya no recuerda a tus clientes.');
    } catch (e) { el.checked = !v; ajToast(e.message, 'error'); }
  });
  panel.querySelectorAll('[data-accion]').forEach((el) => el.addEventListener('click', async () => {
    const [acc, que] = el.dataset.accion.split(':');
    if (acc === 'permisos') { cerrarPantallaCompleta(); mostrarSeccion('negocio'); return ajAbrirFS('panel-vendedor-memoria'); }
    if (acc === 'eliminar') { cerrarPantallaCompleta(); ajAbrirFS('panel-cuenta'); return; }
    if (acc === 'descargar') {
      return ajConCarga(el, 'Preparando...', async () => {
        try {
          const blob = await ajApi('/cuenta/descargar', { blob: true });
          const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'mis-datos-mi-asistente.json'; document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(a.href), 4000); ajToast('Descarga lista.');
        } catch (e) { ajToast(e.message, 'error'); }
      });
    }
    if (acc === 'borrar') {
      const b = borrables.find((x) => x[0] === que);
      if (!(await ajConfirmar({ titulo: b[3] + '?', texto: b[5] + ' No se puede deshacer.', boton: 'Sí, borrar', peligro: true, icono: 'trash' }))) return;
      try {
        const d = await ajApi(`/cuenta/datos/${que}`, { metodo: 'DELETE' });
        ajToast(d.borrados ? `Listo: se borraron ${d.borrados}.` : 'No había nada para borrar.');
        if (que === 'resenas' && typeof cargarExperiencia === 'function') cargarExperiencia();
        if (que === 'pruebas' && typeof cargarPedidos === 'function' && !ajEsTurnos()) cargarPedidos();
        ajPrivacidad(panel);
      } catch (e) { ajToast(e.message, 'error'); }
    }
  }));
}

// =====================================================================
// CENTRO DE AYUDA
// =====================================================================
function ajAyuda(panel) {
  let tema = 'todos', texto = '';
  const norm = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  panel.innerHTML = `
    <div class="aj-buscador">${ajIcono('search', 18)}<input id="aj-ay-buscar" type="search" placeholder="Buscá: pedidos, pagos, avisos..." autocomplete="off"><button id="aj-ay-limpiar" aria-label="Borrar búsqueda" style="display:none">${ajIcono('x', 16)}</button></div>
    <div class="aj-chips" id="aj-ay-chips"></div>
    <div id="aj-ay-lista"></div>
    <div class="aj-ayuda-pie"><span class="ic-violeta">${ajIcono('message', 22)}</span><div><strong>¿No encontraste lo que buscabas?</strong><p>Escribinos y te respondemos desde acá.</p></div><button class="aj-btn aj-btn-primario aj-btn-chico" id="aj-ay-soporte">Escribir</button></div>`;
  const dibujar = () => {
    const chips = [{ id: 'todos', nombre: 'Todos', color: 'azul' }, ...AYUDA_TEMAS];
    document.getElementById('aj-ay-chips').innerHTML = chips.map((t) => `<button class="aj-chip ${tema === t.id ? 'activo' : ''}" data-tema="${t.id}">${t.nombre}</button>`).join('');
    const q = norm(texto).trim();
    const lista = AYUDA_ARTICULOS.filter((a) => (tema === 'todos' || a.tema === tema) && (!q || norm(a.t + ' ' + a.c.join(' ')).includes(q)));
    const cont = document.getElementById('aj-ay-lista');
    cont.innerHTML = lista.length ? lista.map((a, i) => {
      const t = AYUDA_TEMAS.find((x) => x.id === a.tema);
      return `<details class="aj-articulo" style="animation-delay:${Math.min(i, 8) * 30}ms"><summary><span class="ic-${t.color}">${ajIcono('book', 18)}</span><span><strong>${a.t}</strong><small>${t.nombre}</small></span>${ajIcono('chevron', 16)}</summary>
        <div class="aj-articulo-cuerpo">${a.c.map((p) => `<p>${p}</p>`).join('')}
        <div class="aj-util"><span>¿Te sirvió?</span><button data-util="1">Sí</button><button data-util="0">No</button></div></div></details>`;
    }).join('') : `<div class="aj-vacio"><span class="ic-gris">${ajIcono('search', 26)}</span><strong>Sin resultados</strong><p>Probá con otra palabra o escribinos y te ayudamos.</p></div>`;
    chips.length && document.querySelectorAll('#aj-ay-chips .aj-chip').forEach((b) => b.addEventListener('click', () => { tema = b.dataset.tema; dibujar(); }));
    cont.querySelectorAll('.aj-util button').forEach((b) => b.addEventListener('click', () => {
      const caja = b.closest('.aj-util');
      caja.innerHTML = b.dataset.util === '1' ? `<span class="aj-gracias">${ajIcono('check', 15)} ¡Gracias!</span>` : `<span>Lamentamos eso.</span><button data-sop>Escribir a soporte</button>`;
      const s = caja.querySelector('[data-sop]'); if (s) s.addEventListener('click', () => { cerrarPantallaCompleta(); ajAbrirFS('panel-soporte'); });
    }));
  };
  const inp = document.getElementById('aj-ay-buscar'), limpiar = document.getElementById('aj-ay-limpiar');
  inp.addEventListener('input', () => { texto = inp.value; limpiar.style.display = texto ? '' : 'none'; dibujar(); });
  limpiar.addEventListener('click', () => { inp.value = ''; texto = ''; limpiar.style.display = 'none'; dibujar(); inp.focus(); });
  document.getElementById('aj-ay-soporte').addEventListener('click', () => { cerrarPantallaCompleta(); ajAbrirFS('panel-soporte'); });
  dibujar();
}

// =====================================================================
// SOPORTE
// =====================================================================
async function ajSoporte(panel) {
  panel.innerHTML = ajEsqueleto(3);
  let mias = [];
  try { mias = await ajApi('/soporte/mias'); } catch (e) { return ajFalloCarga(panel, () => ajSoporte(panel)); }
  const temas = [['asistente', 'Mi asistente'], ['pedidos', esTurnosTxt('Pedidos', 'Turnos')], ['suscripcion', 'Suscripción y pagos'], ['cuenta', 'Mi cuenta'], ['error', 'Algo no funciona'], ['otro', 'Otra cosa']];
  const hayNuevas = mias.some((m) => m.nueva);
  const ESTADO = { abierta: ['En revisión', 'aviso'], respondida: ['Respondida', 'ok'] };
  const contacto = (typeof SOPORTE_WHATSAPP !== 'undefined' && SOPORTE_WHATSAPP ? `<a class="aj-btn aj-btn-suave aj-btn-ancho" target="_blank" rel="noopener" href="https://wa.me/${encodeURIComponent(SOPORTE_WHATSAPP)}?text=${encodeURIComponent(`Hola, te escribo desde Mi Asistente (negocio: ${(negocioActual && negocioActual.formData && negocioActual.formData.nombreNegocio) || ''}). `)}">${ajIcono('whatsapp', 18)} Escribir por WhatsApp</a>` : '')
    + (typeof SOPORTE_EMAIL !== 'undefined' && SOPORTE_EMAIL ? `<a class="aj-btn aj-btn-suave aj-btn-ancho" href="mailto:${ajEsc(SOPORTE_EMAIL)}?subject=${encodeURIComponent('Consulta sobre Mi Asistente')}&body=${encodeURIComponent(`Negocio: ${(negocioActual && negocioActual.formData && negocioActual.formData.nombreNegocio) || ''}\n\n`)}">${ajIcono('mail', 18)} Enviar un correo</a>` : '');

  panel.innerHTML = `
    ${ajGrupo('', ajFila({ icono: 'help', color: 'celeste', titulo: 'Mirá primero el Centro de ayuda', desc: 'Quizás la respuesta ya está ahí', accion: 'ayuda' }))}
    <form class="aj-form aj-tarjeta" id="aj-form-soporte" novalidate>
      <h4 style="margin:0 0 4px">Nueva consulta</h4>
      <label for="aj-so-tema">¿Sobre qué es?</label>
      <select id="aj-so-tema">${temas.map((t) => `<option value="${t[0]}">${t[1]}</option>`).join('')}</select>
      <label for="aj-so-msg">Contanos qué pasa</label>
      <textarea id="aj-so-msg" rows="5" maxlength="2000" placeholder="Cuanto más detalle, más rápido podemos ayudarte."></textarea>
      <div class="aj-contador"><span id="aj-so-ct">0</span>/2000</div>
      <div id="aj-so-err"></div>
      <button class="aj-btn aj-btn-primario aj-btn-ancho" id="aj-so-ok" type="submit" disabled>${ajIcono('send', 18)} Enviar consulta</button>
    </form>
    ${contacto ? `<div class="aj-acciones">${contacto}</div>` : ''}
    <div class="aj-grupo"><h4>Mis consultas${hayNuevas ? ' <span class="aj-pill aj-pill-prueba">Respuesta nueva</span>' : ''}</h4>
    ${mias.length ? mias.map((m) => `<div class="aj-consulta ${m.nueva ? 'nueva' : ''}">
      <div class="aj-consulta-cab"><span class="aj-pill aj-pill-${ESTADO[m.estado][1] === 'ok' ? 'activa' : 'prueba'}">${ESTADO[m.estado][0]}</span><small>${ajHace(m.creadaEn)}</small></div>
      <p>${ajEsc(m.mensaje)}</p>
      ${m.respuesta ? `<div class="aj-respuesta"><strong>${ajIcono('sparkles', 14)} Respuesta del equipo</strong><p>${ajEsc(m.respuesta)}</p></div>` : '<small class="aj-esperando">Te avisamos acá y en tus notificaciones cuando respondamos.</small>'}
    </div>`).join('') : `<div class="aj-vacio"><span class="ic-violeta">${ajIcono('message', 26)}</span><strong>Todavía no escribiste</strong><p>Tus consultas y nuestras respuestas aparecen acá.</p></div>`}</div>`;

  ajEnlazar(panel, { ayuda: () => { cerrarPantallaCompleta(); ajAbrirFS('panel-ayuda'); } });
  const msg = document.getElementById('aj-so-msg'), ok = document.getElementById('aj-so-ok');
  msg.addEventListener('input', () => { document.getElementById('aj-so-ct').textContent = msg.value.length; ok.disabled = msg.value.trim().length < 10; });
  document.getElementById('aj-form-soporte').addEventListener('submit', (ev) => {
    ev.preventDefault(); if (ok.disabled) return;
    ajConCarga(ok, 'Enviando', async () => {
      try {
        await ajApi('/soporte', { metodo: 'POST', cuerpo: { tema: document.getElementById('aj-so-tema').value, mensaje: msg.value } });
        ajToast('Consulta enviada. Te respondemos por acá.'); ajSoporte(panel);
      } catch (e) { document.getElementById('aj-so-err').innerHTML = ajError(e.message); }
    });
  });
  if (hayNuevas) { try { await ajApi('/soporte/vistas', { metodo: 'POST' }); ntRefrescar(); } catch (e) { /* no es crítico */ } }
}
const esTurnosTxt = (a, b) => (ajEsTurnos() ? b : a);

// =====================================================================
// ACERCA DE MI ASISTENTE
// =====================================================================
function ajAcerca(panel) {
  const acordeon = (titulo, filas) => `<details class="aj-articulo aj-legal"><summary><span><strong>${titulo}</strong></span>${ajIcono('chevron', 16)}</summary><div class="aj-articulo-cuerpo">${filas.map(([t, c]) => `<h5>${t}</h5><p>${c}</p>`).join('')}</div></details>`;
  panel.innerHTML = `
    <div class="aj-acerca"><div class="aj-acerca-logo">${ajIcono('sparkles', 30)}</div><strong>Mi Asistente</strong><span>Versión ${LEGAL.version}</span><p>Un empleado virtual con inteligencia artificial que atiende a tus clientes, toma pedidos o turnos y te mantiene al tanto de tu negocio.</p></div>
    ${ajGrupo('Cómo funciona', `
      ${ajFila({ icono: 'message', color: 'violeta', titulo: 'Atiende por chat', desc: 'Tus clientes escriben desde tu enlace o tu QR.', info: true })}
      ${ajFila({ icono: 'sparkles', color: 'azul', titulo: 'Responde con IA', desc: 'Usa lo que cargaste: productos, precios, horarios.', info: true })}
      ${ajFila({ icono: 'bell', color: 'naranja', titulo: 'Te avisa a vos', desc: 'Pedidos, turnos y reseñas, en el panel y en el celular.', info: true })}`)}
    <div class="aj-grupo"><h4>Legal</h4>${acordeon('Términos de uso', LEGAL.terminos)}${acordeon('Política de privacidad', LEGAL.privacidad)}</div>
    <p class="aj-nota" style="text-align:center">Hecho con cariño para negocios que quieren atender mejor.</p>`;
}

// =====================================================================
// Conexión con el panel
// =====================================================================
const AJ_PANELES = {
  'panel-cuenta': ajCuenta, 'panel-notificaciones': ajNotificaciones, 'panel-seguridad': ajSeguridad, 'panel-apariencia': ajApariencia,
  'panel-privacidad': ajPrivacidad, 'panel-ayuda': ajAyuda, 'panel-soporte': ajSoporte, 'panel-acerca': ajAcerca,
};
function ajRenderPanel(panelId, panel) {
  ajReset();
  const propio = !!AJ_PANELES[panelId];
  // las pantallas de Ajustes traen su propio encabezado y su propio diseño de tarjetas: sin caja ni hero genérico
  document.getElementById('pantalla-completa-contenido').classList.toggle('aj-libre', propio);
  if (propio) { ajHero(false); AJ_PANELES[panelId](panel); }
}
