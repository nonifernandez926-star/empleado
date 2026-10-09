// Inicio y acceso de Mi Asistente (mismo flujo que Mi Zona).
//  - "Acceder con Google": se elige la cuenta de Google y se entra al panel.
//  - "Registrarme" (texto azul): abre directo la lista de cuentas de Google; después se crea el usuario y, por último, la contraseña.
//  - Con usuario y contraseña: se escribe el usuario, después la contraseña.
//  - Con el correo: es lo mismo que "Acceder con Google", pero escribiendo el correo en vez de elegir la cuenta.
//  - Si ya hay una sesión guardada, entra directo al panel (sin pasar por la portada).
(function () {
  const $ = (id) => document.getElementById(id);
  const TOKEN = 'jwtToken', DESTINO = 'destinoAcceso';
  const raiz = document.documentElement;
  const vistaInicio = $('ini-vista'), vistaAcceso = $('ini-acceso');
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const IC_CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5L20 7"/></svg>';

  // ---------- adónde se entra según la cuenta ----------
  const rutaDestino = (tieneNegocio) => (tieneNegocio ? 'admin.html' : 'registro.html');
  function irDestino(tieneNegocio) {
    const ruta = rutaDestino(tieneNegocio);
    try { localStorage.setItem(DESTINO, ruta); } catch (e) { /* sin almacenamiento */ }
    location.replace(ruta);
  }
  function entrar(r) { localStorage.setItem(TOKEN, r.token); irDestino(r.tieneNegocio); }
  const faltaCompletar = (r) => !!(r && r.pendiente && (r.pendiente.usuario || r.pendiente.clave));

  // ---------- sesión guardada: entra directo ----------
  async function revisarSesion() {
    const t = localStorage.getItem(TOKEN);
    if (!t || new URLSearchParams(location.search).get('acceso')) return false;
    const ctl = new AbortController();
    const reloj = setTimeout(() => ctl.abort(), 7000);
    try {
      const r = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${t}` }, signal: ctl.signal });
      clearTimeout(reloj);
      if (r.ok) {
        const d = await r.json();
        // cuenta de Google que todavía no eligió usuario o contraseña: último paso antes de entrar
        if (faltaCompletar(d)) { sesion = { token: t, usuario: d.usuario, pendiente: d.pendiente, tieneNegocio: d.tieneNegocio }; abrirAcceso(false); irACrear(); return false; }
        irDestino(d.tieneNegocio); return true;
      }
      if (r.status === 401) { localStorage.removeItem(TOKEN); localStorage.removeItem(DESTINO); } // la sesión venció o se cerró en otro dispositivo
    } catch (e) {
      clearTimeout(reloj);
      // sin conexión o servidor dormido: vamos al último lugar donde estuvo (el panel vuelve a revisar la sesión por su cuenta)
      const ultimo = localStorage.getItem(DESTINO);
      if (ultimo) { location.replace(ultimo); return true; }
    }
    return false;
  }

  // ---------- navegación portada <-> acceso ----------
  function abrirAcceso(empujar) {
    vistaInicio.style.display = 'none';
    vistaAcceso.classList.add('abierta');
    precargarGoogle();
    if (empujar) history.pushState({ vista: 'acceso' }, '');
  }
  function cerrarAcceso() { vistaAcceso.classList.remove('abierta'); vistaInicio.style.display = 'flex'; }
  window.addEventListener('popstate', () => { if (vista === 'crear') { vista = 'login'; sesion = null; pintar(); } cerrarAcceso(); });
  $('ini-volver').addEventListener('click', () => history.back());
  $('btn-empezar').addEventListener('click', () => abrirAcceso(true));

  // ---------- Google: elegir cuenta ----------
  let googleCargado = null;
  function precargarGoogle() {
    if (window.google && window.google.accounts) return Promise.resolve();
    if (googleCargado) return googleCargado;
    googleCargado = new Promise((ok, mal) => {
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client'; s.async = true; s.defer = true;
      s.onload = ok; s.onerror = () => { googleCargado = null; mal(new Error('No se pudo cargar Google. Revisá tu conexión.')); };
      document.head.appendChild(s);
    });
    googleCargado.catch(() => {});
    return googleCargado;
  }
  // Tiene que llamarse directo desde un toque (si no, el navegador bloquea la ventana).
  // Sin "hint": lista de cuentas del celular. Con "hint" (un correo escrito a mano): Google abre ese correo y pide su contraseña en su propia página; Mi Asistente nunca la ve.
  function pedirCuentaGoogle(hint) {
    return new Promise((ok, mal) => {
      const oauth2 = window.google && window.google.accounts && window.google.accounts.oauth2;
      if (!oauth2) return mal(new Error('Google todavía está cargando. Esperá un segundo y probá de nuevo.'));
      oauth2.initTokenClient(Object.assign({
        client_id: GOOGLE_CLIENT_ID, scope: 'openid email profile',
        callback: (r) => r && r.access_token ? ok(r.access_token) : mal(Object.assign(new Error((r && (r.error_description || r.error)) || 'No se pudo entrar con Google.'), { cancelado: !!(r && r.error === 'access_denied') })),
        error_callback: (e) => {
          if (e && e.type === 'popup_closed') mal(Object.assign(new Error('cancelado'), { cancelado: true }));
          else if (e && e.type === 'popup_failed_to_open') mal(Object.assign(new Error('Tu navegador bloqueó la ventana de Google. Permití las ventanas emergentes y probá de nuevo.'), { bloqueada: true }));
          else mal(new Error('No se pudo abrir Google. Probá de nuevo.'));
        },
      }, hint ? { hint, prompt: '' } : { prompt: 'select_account' })).requestAccessToken();
    });
  }

  async function pedir(ruta, cuerpo, metodo, token) {
    let res;
    const opciones = cuerpo === undefined ? { method: 'GET' } : { method: metodo || 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) };
    if (token) opciones.headers = Object.assign({}, opciones.headers, { Authorization: `Bearer ${token}` });
    try { res = await fetch(`${API_URL}${ruta}`, opciones); }
    catch (e) { throw new Error('No se pudo conectar con el servidor. Si estaba dormido, esperá un minuto y probá de nuevo.'); }
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(datos.mensaje || datos.error || 'Algo salió mal. Probá de nuevo.'), { datos });
    return datos;
  }

  // ---------- estado de la hoja ----------
  // vista: 'login' | 'crear'.  login → paso: 'usuario' | 'clave' | 'google'.  crear → paso: 'usuario' | 'clave'
  let vista = 'login', paso = 'usuario', ver = false, ocupado = false;
  let sesion = null; // sesión de Google ya verificada que todavía necesita usuario y/o contraseña: { token, usuario, pendiente }
  const v = { ident: '', usuario: '', clave: '' };
  let disp = { estado: '', texto: '' }; // estado: '' | 'revisando' | 'libre' | 'ocupado' | 'invalido' | 'error'
  let secuencia = 0, reloj = null;
  const errGoogle = $('ini-error-google'), form = $('ini-form');
  const AYUDA_USUARIO = 'De 5 a 20 caracteres. Empieza con una letra; podés usar números, punto o guion bajo.';

  // Un solo botón para entrar con Google. modo "login": solo entra si ya hay cuenta. modo "registro": crea la cuenta si es la primera vez.
  async function conGoogle(modo, hint, enSilencio) {
    if (ocupado) return;
    errGoogle.textContent = '';
    let token;
    try { token = await pedirCuentaGoogle(hint); }
    catch (e) { if (!e.cancelado && !(enSilencio && e.bloqueada)) errGoogle.textContent = e.message; return; }
    ocupado = true; pintarGoogle();
    try {
      const r = await pedir('/auth/google', { accessToken: token, modo });
      ocupado = false;
      // cuenta nueva (o vieja) sin usuario/contraseña: primero el usuario, después la contraseña
      if (faltaCompletar(r)) { sesion = r; irACrear(); return; }
      entrar(r);
    } catch (e) { errGoogle.textContent = e.message; ocupado = false; pintarGoogle(); }
  }
  function pintarGoogle() {
    $('btn-google').disabled = ocupado;
    $('btn-google-txt').textContent = ocupado ? 'Entrando...' : 'Acceder con Google';
  }
  $('btn-google').addEventListener('click', () => conGoogle('login'));

  function irACrear() {
    vista = 'crear'; v.usuario = ''; v.clave = ''; ver = false; errGoogle.textContent = '';
    paso = sesion.pendiente.usuario ? 'usuario' : 'clave';
    disp = { estado: '', texto: '' };
    pintar();
  }

  // Revisa en vivo (con una pausa corta) si el usuario es válido y está libre
  function revisarUsuario(valor) {
    clearTimeout(reloj);
    const n = ++secuencia;
    const u = normalizarUsuario(valor);
    if (!u) { disp = { estado: '', texto: '' }; return pintarDisponibilidad(); }
    const err = validarUsuario(u);
    if (err) { disp = { estado: 'invalido', texto: err }; return pintarDisponibilidad(); }
    disp = { estado: 'revisando', texto: 'Revisando si está libre...' };
    pintarDisponibilidad();
    reloj = setTimeout(async () => {
      try {
        const r = await pedir(`/auth/usuario-disponible?usuario=${encodeURIComponent(u)}`);
        if (n !== secuencia) return;
        disp = r.disponible ? { estado: 'libre', texto: '¡Está disponible!' } : { estado: 'ocupado', texto: r.mensaje || 'Ese usuario ya está en uso. Elegí otro.' };
      } catch (e) {
        if (n !== secuencia) return;
        disp = { estado: 'error', texto: 'No pudimos revisar si está libre; lo comprobamos al crear la cuenta.' };
      }
      pintarDisponibilidad();
    }, 450);
  }
  function pintarDisponibilidad() {
    const a = $('f-usuario-ayuda'), i = $('f-usuario');
    if (!a || !i) return;
    const bien = disp.estado === 'libre', mal = disp.estado === 'ocupado' || disp.estado === 'invalido';
    a.textContent = disp.texto || AYUDA_USUARIO;
    a.className = `ini-ayuda ${bien ? 'ok' : mal ? 'mal' : ''}`;
    i.classList.toggle('ok', bien); i.classList.toggle('mal', mal);
    habilitar();
  }
  function pintarReglas() {
    const ul = $('f-reglas'); if (!ul) return;
    ul.innerHTML = requisitosContrasena(v.clave).map((r) => `<li class="${r.ok ? 'ok' : ''}"><i>${IC_CHECK}</i>${r.texto}</li>`).join('');
    const nota = $('f-clave-nota');
    const err = v.clave ? validarContrasena(v.clave, v.usuario || (sesion && sesion.usuario && sesion.usuario.usuario)) : '';
    if (nota) { nota.textContent = err && /usuario/.test(err) ? err : ''; nota.className = `ini-nota ${err && /usuario/.test(err) ? 'mal' : ''}`; }
  }

  function habilitar() {
    const ok = $('f-ok'); if (!ok) return;
    if (vista === 'login') ok.disabled = paso === 'clave' ? !v.clave : paso === 'usuario' ? !v.ident.trim() : false;
    else if (paso === 'usuario') ok.disabled = !(disp.estado === 'libre' || disp.estado === 'error');
    else ok.disabled = !!validarContrasena(v.clave, v.usuario || (sesion && sesion.usuario && sesion.usuario.usuario));
  }

  function campoClave(placeholder, autocompletar) {
    return `<div class="ini-clave"><input id="f-clave" type="${ver ? 'text' : 'password'}" maxlength="100" autocomplete="${autocompletar}" placeholder="${placeholder}" aria-label="${placeholder}" value="${esc(v.clave)}" style="padding-right:64px"><button type="button" class="ini-link" id="f-ver">${ver ? 'Ocultar' : 'Ver'}</button></div>`;
  }

  const TEXTOS = {
    login: ['Entrá a tu cuenta', 'Entrá a Mi Asistente o creá tu cuenta.'],
    usuario: ['Creá tu usuario', ''],
    clave: ['Creá tu contraseña', 'Con tu usuario y contraseña vas a poder entrar cuando quieras, además de Google.'],
  };

  function pintar(error, enfocar) {
    const clave = vista === 'crear' ? paso : 'login';
    const email = sesion && sesion.usuario && sesion.usuario.email;
    $('ini-titulo').textContent = vista === 'crear' && paso === 'usuario' && sesion && sesion.usuario && sesion.usuario.usuario ? 'Creá tu contraseña' : TEXTOS[clave][0];
    $('ini-sub').textContent = clave === 'usuario' ? `Casi listo${email ? `: tu cuenta de Google es ${email}` : ''}. Elegí cómo vas a entrar a Mi Asistente.` : TEXTOS[clave][1];
    $('ini-google-bloque').style.display = vista === 'login' ? '' : 'none';
    pintarGoogle();
    $('ini-cambio').innerHTML = vista === 'login'
      ? '¿No tenés cuenta? <button type="button" class="ini-link" id="ir-registro">Registrarme</button>'
      : '<button type="button" class="ini-link" id="ir-salir">Salir</button>';
    if ($('ir-registro')) $('ir-registro').onclick = () => conGoogle('registro');
    if ($('ir-salir')) $('ir-salir').onclick = () => { sesion = null; vista = 'login'; paso = 'usuario'; localStorage.removeItem(TOKEN); localStorage.removeItem(DESTINO); v.ident = ''; v.clave = ''; pintar(); };

    const msg = error ? `<p class="ini-error" role="alert">${esc(error)}</p>` : '';
    if (vista === 'login' && paso === 'usuario') {
      form.innerHTML = `<input id="f-ident" maxlength="120" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="Usuario o correo electrónico" aria-label="Usuario o correo electrónico" value="${esc(v.ident)}">
        ${msg}
        <button class="ini-enviar" id="f-ok" type="button">${ocupado ? 'Un momento...' : 'Continuar'}</button>`;
    } else if (vista === 'login' && paso === 'clave') {
      form.innerHTML = `<div class="ini-correo-fijo"><span>${esc(v.ident)}</span><button type="button" class="ini-link" id="f-cambiar">Cambiar</button></div>
        ${campoClave('Contraseña', 'current-password')}
        ${msg}
        <button class="ini-enviar" id="f-ok" type="button">Iniciar sesión</button>`;
    } else if (vista === 'login') { // paso 'google': el correo escrito abre Google con ese correo
      form.innerHTML = `<div class="ini-correo-fijo"><span>${esc(v.ident)}</span><button type="button" class="ini-link" id="f-cambiar">Cambiar</button></div>
        <button class="ini-enviar" id="f-ok" type="button">Continuar con Google</button>
        <p class="ini-nota" style="text-align:center">Google te va a pedir la contraseña de ese correo en su propia página. Mi Asistente nunca la ve.</p>`;
    } else if (paso === 'usuario') {
      form.innerHTML = `<label class="ini-etq" for="f-usuario">Tu usuario</label>
        <input id="f-usuario" maxlength="20" autocomplete="username" autocapitalize="none" autocorrect="off" spellcheck="false" placeholder="ej: maria.lopez" value="${esc(v.usuario)}">
        <p class="ini-ayuda" id="f-usuario-ayuda"></p>
        ${msg}
        <button class="ini-enviar" id="f-ok" type="button">${sesion.pendiente.clave ? 'Continuar' : 'Guardar usuario'}</button>`;
      pintarDisponibilidad();
    } else {
      const usu = v.usuario || (sesion.usuario && sesion.usuario.usuario) || '';
      form.innerHTML = `<div class="ini-correo-fijo"><span>@${esc(usu)}</span>${sesion.pendiente.usuario ? '<button type="button" class="ini-link" id="f-cambiar">Cambiar</button>' : ''}</div>
        <label class="ini-etq" for="f-clave">Tu contraseña</label>
        ${campoClave('Creá tu contraseña', 'new-password')}
        <p class="ini-nota">Es solo para entrar a Mi Asistente con tu usuario; no es la contraseña de tu cuenta de Google. Puede ser solo números, solo letras o una mezcla.</p>
        <ul class="ini-reglas" id="f-reglas"></ul>
        <p class="ini-nota" id="f-clave-nota"></p>
        ${msg}
        <button class="ini-enviar" id="f-ok" type="button">Crear mi cuenta</button>
        <p class="ini-nota" style="text-align:center">Después podés cambiar tu usuario y tu contraseña desde Ajustes.</p>`;
      pintarReglas();
    }

    const campos = {
      'f-ident': (x) => { v.ident = x; },
      'f-usuario': (x) => { v.usuario = x.replace(/\s/g, ''); revisarUsuario(v.usuario); },
      'f-clave': (x) => { v.clave = x; pintarReglas(); },
    };
    Object.keys(campos).forEach((id) => {
      const el = $(id); if (!el) return;
      el.addEventListener('input', () => { campos[id](el.value); habilitar(); });
      el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !$('f-ok').disabled) $('f-ok').click(); });
    });
    habilitar();
    if (enfocar && $(enfocar)) $(enfocar).focus();
    else if ($('f-usuario') && !v.usuario) $('f-usuario').focus();
    else if ($('f-clave') && !v.clave && vista === 'login') $('f-clave').focus();
    if (vista === 'crear' && paso === 'usuario' && v.usuario && !disp.estado) revisarUsuario(v.usuario);

    if ($('f-cambiar')) $('f-cambiar').onclick = () => {
      if (vista === 'crear') { paso = 'usuario'; v.clave = ''; pintar(); }
      else { paso = 'usuario'; v.clave = ''; errGoogle.textContent = ''; pintar(); }
    };
    if ($('f-ver')) $('f-ver').onclick = () => { ver = !ver; pintar(error, 'f-clave'); };
    $('f-ok').onclick = enviar;
  }

  async function enviar() {
    if (ocupado) return;
    const ok = $('f-ok');
    try {
      if (vista === 'login') {
        if (paso === 'usuario') {
          const ident = v.ident.trim();
          errGoogle.textContent = '';
          // con un usuario se pide la contraseña acá; con un correo se revisa qué cuenta es
          if (!ident.includes('@')) { paso = 'clave'; return pintar(); }
          ocupado = true; ok.disabled = true; ok.textContent = 'Un momento...';
          const r = await pedir('/auth/correo', { email: ident });
          ocupado = false;
          if (r.paso === 'crear') return pintar('No encontramos una cuenta con ese correo. Tocá “Registrarme” para crearla.');
          if (r.paso === 'clave') { paso = 'clave'; return pintar(); }
          paso = 'google'; pintar();
          return conGoogle('login', ident.toLowerCase(), true); // abre Google con ese correo; si el navegador bloquea la ventana, queda el botón
        }
        if (paso === 'google') return conGoogle('login', v.ident.trim().toLowerCase());
        ocupado = true; ok.disabled = true; ok.textContent = 'Un momento...';
        entrar(await pedir('/auth/login', { usuario: v.ident.trim(), password: v.clave }));
        return;
      }
      // crear: usuario → contraseña
      if (paso === 'usuario' && sesion.pendiente.clave) { paso = 'clave'; return pintar(); }
      ocupado = true; ok.disabled = true; ok.textContent = 'Guardando...';
      const cuerpo = {};
      if (sesion.pendiente.usuario) cuerpo.usuario = normalizarUsuario(v.usuario);
      if (sesion.pendiente.clave) cuerpo.password = v.clave;
      const r = await pedir('/auth/completar', cuerpo, 'PUT', sesion.token);
      entrar(r);
    } catch (e) {
      ocupado = false;
      if (e.datos && e.datos.codigo === 'usuario_en_uso') { disp = { estado: 'ocupado', texto: e.message }; paso = 'usuario'; return pintar(); }
      if (vista === 'crear' && /sesión inválida|vencida/i.test(e.message)) { sesion = null; vista = 'login'; paso = 'usuario'; return pintar('Tu sesión venció. Volvé a elegir tu cuenta de Google.'); }
      pintar(e.message);
    }
  }

  // ---------- arranque ----------
  if (new URLSearchParams(location.search).get('acceso')) abrirAcceso(false);
  pintar();
  revisarSesion().then((entro) => { if (!entro) raiz.classList.remove('ini-revisando'); });
})();
