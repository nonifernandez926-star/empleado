// Elegir la ubicación del negocio en un mapa (el mismo estilo de mapa que Mi Zona: OpenStreetMap + CARTO).
// Uso:  const r = await MapaUbicacion.abrir({ direccion, localidad, lat, lng });   // null si cancela
//       r = { direccion, localidad, lat, lng }  → se escribe en el formulario.
// Leaflet se descarga solo la primera vez que se abre el mapa.
(function () {
  const TUCUMAN = [-26.8241, -65.2226];
  const NOMINATIM = 'https://nominatim.openstreetmap.org';
  const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/';
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  let cargaLeaflet = null;
  function cargarLeaflet() {
    if (window.L && window.L.map) return Promise.resolve();
    if (cargaLeaflet) return cargaLeaflet;
    cargaLeaflet = new Promise((ok, mal) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = LEAFLET + 'leaflet.css'; document.head.appendChild(css);
      const s = document.createElement('script'); s.src = LEAFLET + 'leaflet.js';
      s.onload = ok; s.onerror = () => { cargaLeaflet = null; mal(new Error('No se pudo cargar el mapa. Revisá tu conexión.')); };
      document.head.appendChild(s);
    });
    return cargaLeaflet;
  }

  function estilos() {
    if (document.getElementById('mu-estilos')) return;
    const st = document.createElement('style'); st.id = 'mu-estilos';
    st.textContent = `
      .mu{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;background:#f3f5fa;font-family:inherit}
      .mu-top{display:flex;gap:8px;align-items:center;padding:12px;background:#fff;border-bottom:1px solid #e3e7f1}
      .mu-top button{width:42px;height:42px;flex:none;border-radius:12px;border:1px solid #e3e7f1;background:#fff;font-size:20px;cursor:pointer}
      .mu-top form{flex:1;display:flex}
      .mu-top input{flex:1;min-width:0;height:42px;border-radius:12px;border:1px solid #e3e7f1;padding:0 12px;font-size:15px;background:#f3f5fa}
      .mu-mapa{position:relative;flex:1;min-height:0}
      .mu-mapa>div{position:absolute;inset:0}
      .mu-tip{position:absolute;z-index:500;left:10px;top:10px;background:rgba(11,20,55,.85);color:#fff;font-size:12px;font-weight:600;padding:6px 12px;border-radius:999px}
      .mu-gps{position:absolute;z-index:500;right:10px;bottom:14px;width:44px;height:44px;border-radius:14px;border:0;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.25);font-size:20px;cursor:pointer}
      .mu-pie{background:#fff;border-top:1px solid #e3e7f1;padding:14px 16px max(16px,env(safe-area-inset-bottom))}
      .mu-pie small{display:block;color:#5b6482;font-size:12px;font-weight:600;margin-bottom:2px}
      .mu-dir{font-size:15px;font-weight:700;color:#0b1437;min-height:22px;margin-bottom:10px}
      .mu-aviso{color:#c1443a;font-size:13px;margin:0 0 8px}
      .mu-ok{width:100%;padding:14px;border:0;border-radius:12px;background:#2f6df0;color:#fff;font-size:16px;font-weight:700;cursor:pointer}
      .mu-ok:disabled{background:#b8c2e0;cursor:default}
      .mu-btn-abrir{margin-top:8px;width:100%;padding:11px;border-radius:12px;border:1.5px solid #2f6df0;background:#fff;color:#2f6df0;font-weight:700;font-size:14px;cursor:pointer}
    `;
    document.head.appendChild(st);
  }

  const pinHtml = '<svg width="40" height="52" viewBox="0 0 40 52" style="filter:drop-shadow(0 4px 6px rgba(0,0,0,.35))"><path d="M20 1C10 1 2 9 2 19c0 13 18 31 18 31s18-18 18-31C38 9 30 1 20 1z" fill="#2f6df0" stroke="#fff" stroke-width="2.5"/><circle cx="20" cy="19" r="7" fill="#fff"/></svg>';

  async function reverso(lat, lng) {
    try {
      const r = await fetch(`${NOMINATIM}/reverse?format=json&zoom=18&addressdetails=1&accept-language=es&lat=${lat}&lon=${lng}`);
      if (!r.ok) return { direccion: '', localidad: '' };
      const d = await r.json(); const a = d.address || {};
      const calle = a.road || a.pedestrian || a.footway || a.path || a.residential || '';
      let direccion = calle ? [calle, a.house_number].filter(Boolean).join(' ') : String(d.display_name || '').split(',').slice(0, 2).map((x) => x.trim()).join(', ');
      return { direccion, localidad: a.city || a.town || a.village || a.municipality || a.suburb || '' };
    } catch (e) { return { direccion: '', localidad: '' }; }
  }
  async function buscar(texto, localidad) {
    const intentos = [[texto, localidad, 'Argentina'], [texto, 'Argentina']].map((p) => p.filter(Boolean).join(', '));
    for (const q of intentos) {
      try {
        const r = await fetch(`${NOMINATIM}/search?format=json&limit=1&countrycodes=ar&q=${encodeURIComponent(q)}`);
        if (!r.ok) continue;
        const d = await r.json();
        if (d && d[0]) return { lat: parseFloat(d[0].lat), lng: parseFloat(d[0].lon) };
      } catch (e) { /* siguiente formato */ }
    }
    return null;
  }

  function abrir(op) {
    op = op || {};
    estilos();
    return new Promise((resolver) => {
      const caja = document.createElement('div');
      caja.className = 'mu'; caja.setAttribute('role', 'dialog'); caja.setAttribute('aria-label', 'Elegir ubicación en el mapa');
      caja.innerHTML = `
        <div class="mu-top"><button type="button" id="mu-volver" aria-label="Volver">←</button>
          <form id="mu-form"><input id="mu-q" placeholder="Buscar calle y número" aria-label="Buscar una dirección" value="${esc(op.direccion || '')}"></form></div>
        <div class="mu-mapa"><div id="mu-mapa"></div><span class="mu-tip">Arrastrá el pin o tocá el mapa</span>
          <button type="button" class="mu-gps" id="mu-gps" aria-label="Usar mi ubicación">◎</button></div>
        <div class="mu-pie"><small>Ubicación elegida</small><div class="mu-dir" id="mu-dir">Cargando el mapa...</div>
          <p class="mu-aviso" id="mu-aviso" hidden></p>
          <button type="button" class="mu-ok" id="mu-ok" disabled>✓ Confirmar ubicación</button></div>`;
      document.body.appendChild(caja);
      const $ = (id) => caja.querySelector('#' + id);

      let mapa = null, pin = null, punto = null, dato = { direccion: '', localidad: '' }, sec = 0, cerrado = false;
      const aviso = (t) => { $('mu-aviso').hidden = !t; $('mu-aviso').textContent = t || ''; };

      function cerrar(resultado, deHistorial) {
        if (cerrado) return; cerrado = true;
        window.removeEventListener('popstate', alAtras);
        if (mapa) mapa.remove();
        caja.remove();
        if (!deHistorial) history.back(); // retira la entrada que agregamos para el botón "atrás" de Android
        resolver(resultado);
      }
      function alAtras() { cerrar(null, true); }
      history.pushState({ mapaUbicacion: true }, '');
      window.addEventListener('popstate', alAtras);
      $('mu-volver').onclick = () => cerrar(null, false);

      async function describir() {
        const n = ++sec; $('mu-ok').disabled = true; $('mu-dir').textContent = 'Buscando la dirección...';
        const d = await reverso(punto.lat, punto.lng);
        if (n !== sec || cerrado) return;
        dato = d;
        $('mu-dir').textContent = d.direccion || 'Sin nombre de calle: se guardará el punto del mapa';
        $('mu-ok').disabled = false;
      }
      function poner(p, centrar, zoom) {
        punto = p; aviso('');
        pin.setLatLng([p.lat, p.lng]);
        if (centrar) mapa.setView([p.lat, p.lng], zoom || 17);
        describir();
      }

      cargarLeaflet().then(async () => {
        if (cerrado) return;
        const L = window.L;
        mapa = L.map($('mu-mapa'), { zoomControl: false, attributionControl: false, zoomSnap: 0.5, maxZoom: 19 });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', { maxZoom: 19, subdomains: 'abcd', detectRetina: true }).addTo(mapa);
        L.control.attribution({ prefix: false, position: 'bottomleft' }).addAttribution('© OpenStreetMap · © CARTO').addTo(mapa);
        L.control.zoom({ position: 'topright' }).addTo(mapa);
        pin = L.marker(TUCUMAN, { draggable: true, autoPan: true, icon: L.divIcon({ className: '', iconSize: [40, 52], iconAnchor: [20, 50], html: pinHtml }) }).addTo(mapa);
        pin.on('dragend', () => { const ll = pin.getLatLng(); punto = { lat: ll.lat, lng: ll.lng }; aviso(''); describir(); });
        mapa.on('click', (e) => poner({ lat: e.latlng.lat, lng: e.latlng.lng }, false));
        mapa.setView(op.lat && op.lng ? [op.lat, op.lng] : TUCUMAN, op.lat && op.lng ? 17 : 13);
        setTimeout(() => mapa.invalidateSize(), 50);
        if (op.lat && op.lng) poner({ lat: op.lat, lng: op.lng }, true);
        else if ((op.direccion || '').trim()) {
          const g = await buscar(op.direccion.trim(), op.localidad);
          if (g && !cerrado) poner(g, true); else $('mu-dir').textContent = 'Movés el pin hasta tu local';
        } else $('mu-dir').textContent = 'Movés el pin hasta tu local';
      }).catch((e) => { $('mu-dir').textContent = ''; aviso(e.message); });

      $('mu-form').onsubmit = async (e) => {
        e.preventDefault();
        const t = $('mu-q').value.trim(); if (!t || !mapa) return;
        $('mu-dir').textContent = 'Buscando...';
        const g = await buscar(t, op.localidad);
        if (cerrado) return;
        if (!g) { $('mu-dir').textContent = dato.direccion || ''; return aviso('No encontramos ese lugar. Probá con calle y número, o movés el pin a mano.'); }
        poner(g, true);
      };
      $('mu-gps').onclick = () => {
        if (!mapa) return;
        if (!navigator.geolocation) return aviso('Tu dispositivo no permite ubicarte.');
        navigator.geolocation.getCurrentPosition(
          (pos) => poner({ lat: pos.coords.latitude, lng: pos.coords.longitude }, true, 18),
          () => aviso('No pudimos ver tu ubicación. Revisá el permiso del navegador o movés el pin a mano.'),
          { enableHighAccuracy: true, timeout: 10000 });
      };
      $('mu-ok').onclick = () => { if (punto) cerrar({ direccion: dato.direccion, localidad: dato.localidad, lat: punto.lat, lng: punto.lng }, false); };
    });
  }

  window.MapaUbicacion = { abrir };
})();
