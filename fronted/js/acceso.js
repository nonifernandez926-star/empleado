// Inicio y acceso de Mi Asistente: mismo sistema que Mi Zona.
// "Acceder con Google" inicia sesión; "Registrarme" (azul) abre directo la lista de cuentas de Google;
// también se puede entrar con correo: primero el correo y después la contraseña.
(function () {
  const $ = (id) => document.getElementById(id);
  const TOKEN = 'jwtToken';
  const vistaInicio = $('ini-vista'), vistaAcceso = $('ini-acceso');

  // ---------- navegación inicio <-> acceso ----------
  function abrirAcceso(empujar) {
    vistaInicio.style.display = 'none';
    vistaAcceso.classList.add('abierta');
    precargarGoogle();
    if (empujar) history.pushState({ vista: 'acceso' }, '');
  }
  function cerrarAcceso() { vistaAcceso.classList.remove('abierta'); vistaInicio.style.display = 'flex'; }
  window.addEventListener('popstate', cerrarAcceso);
  $('ini-volver').addEventListener('click', () => history.back());

  $('btn-empezar').addEventListener('click', async () => {
    const t = localStorage.getItem(TOKEN);
    if (t) { // ya tiene sesión: entra directo
      try {
        const r = await fetch(`${API_URL}/auth/me`, { headers: { Authorization: `Bearer ${t}` } });
        if (r.ok) { const d = await r.json(); return irDestino(d.tieneNegocio); }
        localStorage.removeItem(TOKEN);
      } catch (e) { /* sin conexión: mostramos el acceso igual */ }
    }
    abrirAcceso(true);
  });
  if (new URLSearchParams(location.search).get('acceso')) abrirAcceso(false);

  const irDestino = (tieneNegocio) => { location.href = tieneNegocio ? 'admin.html' : 'registro.html'; };
  function alIniciar(r) { localStorage.setItem(TOKEN, r.token); irDestino(r.tieneNegocio); }

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
  function pedirCuentaGoogle() {
    return new Promise((ok, mal) => {
      const oauth2 = window.google && window.google.accounts && window.google.accounts.oauth2;
      if (!oauth2) return mal(new Error('Google todavía está cargando. Esperá un segundo y probá de nuevo.'));
      oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID, scope: 'openid email profile', prompt: 'select_account',
        callback: (r) => r && r.access_token ? ok(r.access_token) : mal(Object.assign(new Error((r && (r.error_description || r.error)) || 'No se pudo entrar con Google.'), { cancelado: r && r.error === 'access_denied' })),
        error_callback: (e) => {
          if (e && e.type === 'popup_closed') mal(Object.assign(new Error('cancelado'), { cancelado: true }));
          else if (e && e.type === 'popup_failed_to_open') mal(new Error('Tu navegador bloqueó la ventana de Google. Permití las ventanas emergentes y probá de nuevo.'));
          else mal(new Error('No se pudo abrir Google. Probá de nuevo.'));
        },
      }).requestAccessToken();
    });
  }

  async function pedir(ruta, cuerpo) {
    let res;
    try { res = await fetch(`${API_URL}${ruta}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) }); }
    catch (e) { throw new Error('No se pudo conectar con el servidor. Si estaba dormido, esperá un minuto y probá de nuevo.'); }
    const datos = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(datos.mensaje || datos.error || 'Algo salió mal. Probá de nuevo.'), { datos });
    return datos;
  }

  let entrando = false;
  const errGoogle = $('ini-error-google');
  async function conGoogle(modo) {
    if (entrando) return;
    errGoogle.textContent = '';
    let token;
    try { token = await pedirCuentaGoogle(); }
    catch (e) { if (!e.cancelado) errGoogle.textContent = e.message; return; }
    entrando = true; $('btn-google').disabled = true; $('btn-google-txt').textContent = 'Entrando...';
    try { alIniciar(await pedir('/auth/google', { accessToken: token, modo })); }
    catch (e) { errGoogle.textContent = e.message; entrando = false; $('btn-google').disabled = false; $('btn-google-txt').textContent = 'Acceder con Google'; }
  }
  $('btn-google').addEventListener('click', () => conGoogle('login'));
  $('btn-registrarme').addEventListener('click', () => conGoogle('registro'));

  // ---------- correo y contraseña, en pasos ----------
  const form = $('ini-form');
  let paso = 'correo', correo = '', ver = false, ocupado = false;
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function pintar(error) {
    const crear = paso === 'crear';
    form.innerHTML = paso === 'correo'
      ? `<input id="f-correo" type="email" inputmode="email" autocomplete="email" placeholder="Correo electrónico" value="${esc(correo)}">
         ${error ? `<p class="ini-error">${esc(error)}</p>` : ''}
         <button class="ini-enviar" id="f-ok">Continuar</button>`
      : `<div class="ini-correo-fijo"><span>${esc(correo)}</span><button type="button" class="ini-link" id="f-cambiar">Cambiar</button></div>
         ${crear ? '<input id="f-nombre" maxlength="60" autocomplete="name" placeholder="Tu nombre">' : ''}
         <div class="ini-clave"><input id="f-clave" type="${ver ? 'text' : 'password'}" maxlength="100" autocomplete="${crear ? 'new-password' : 'current-password'}" placeholder="${crear ? 'Contraseña (mínimo 8 caracteres)' : 'Contraseña'}" style="padding-right:64px"><button type="button" class="ini-link" id="f-ver">${ver ? 'Ocultar' : 'Ver'}</button></div>
         ${error ? `<p class="ini-error">${esc(error)}</p>` : ''}
         <button class="ini-enviar" id="f-ok">${crear ? 'Crear cuenta' : 'Iniciar sesión'}</button>`;
    const ok = $('f-ok'), c = $('f-correo'), k = $('f-clave'), n = $('f-nombre');
    const habilitar = () => { ok.disabled = paso === 'correo' ? !c.value.trim() : !k.value || (crear && n.value.trim().length < 2); };
    [c, k, n].forEach((el) => el && el.addEventListener('input', habilitar));
    [c, k, n].forEach((el) => el && el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !ok.disabled) ok.click(); }));
    habilitar();
    if (paso === 'correo') { /* sin autofocus: en el celular abriría el teclado de golpe */ } else (crear ? n : k).focus();
    if ($('f-cambiar')) $('f-cambiar').onclick = () => { paso = 'correo'; pintar(); };
    if ($('f-ver')) $('f-ver').onclick = () => { const v = k.value, nom = n && n.value; ver = !ver; pintar(); $('f-clave').value = v; if (nom) $('f-nombre').value = nom; $('f-ok').disabled = !$('f-clave').value; $('f-clave').focus(); };
    ok.onclick = async () => {
      if (ocupado) return; ocupado = true; ok.disabled = true; const txt = ok.textContent; ok.textContent = 'Un momento...';
      try {
        if (paso === 'correo') {
          correo = c.value.trim();
          const r = await pedir('/auth/correo', { email: correo });
          if (r.paso === 'google') { ocupado = false; return pintar('Ese correo se registró con Google. Tocá "Acceder con Google".'); }
          paso = r.paso; ocupado = false; return pintar();
        }
        alIniciar(crear ? await pedir('/auth/registro', { nombre: n.value, email: correo, password: k.value }) : await pedir('/auth/login', { email: correo, password: k.value }));
      } catch (e) {
        const v = k && k.value, nom = n && n.value; ocupado = false; pintar(e.message);
        if (v && $('f-clave')) $('f-clave').value = v; if (nom && $('f-nombre')) $('f-nombre').value = nom; if ($('f-ok') && paso !== 'correo') $('f-ok').disabled = !(v && (paso !== 'crear' || (nom || '').trim().length >= 2));
      }
      ocupado = false;
    };
  }
  pintar();
})();
