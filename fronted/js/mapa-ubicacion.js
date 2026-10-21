// Elegir la ubicación del negocio en un mapa. Se abre en vista SATÉLITE (imágenes Esri con calles y nombres), igual que el mapa de Mi Zona;
// con el botón de capas se puede pasar a mapa común o relieve. Se recuerda la última capa elegida.
// Uso:  const r = await MapaUbicacion.abrir({ direccion, localidad, lat, lng });   // null si cancela
//       r = { direccion, localidad, lat, lng }  → se escribe en el formulario.
// Leaflet se descarga solo la primera vez que se abre el mapa.
(function () {
  const TUCUMAN = [-26.8241, -65.2226];
  const NOMINATIM = 'https://nominatim.openstreetmap.org';
  const LEAFLET = 'https://unpkg.com/leaflet@1.9.4/dist/';
  const ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  const CAPAS = {
    satelite: { label: 'Satélite', muestra: 'linear-gradient(135deg,#27402B 0%,#5D5A3A 45%,#2F4A5E 100%)', atribucion: 'Imágenes © Esri, Maxar, Earthstar Geographics · Nombres © Esri',
      capas: [{ url: ESRI + 'World_Imagery/MapServer/tile/{z}/{y}/{x}', op: { maxZoom: 19, maxNativeZoom: 18 } },
        { url: ESRI + 'Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', op: { maxZoom: 19, maxNativeZoom: 17, opacity: 0.9 } },
        { url: ESRI + 'Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', op: { maxZoom: 19, maxNativeZoom: 17 } }] },
    mapa: { label: 'Mapa', muestra: 'linear-gradient(135deg,#E8EEF6 0%,#F6E9C8 50%,#CFE3D2 100%)', atribucion: '© OpenStreetMap · © CARTO',
      capas: [{ url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', op: { maxZoom: 19, subdomains: 'abcd', detectRetina: true } }] },
    relieve: { label: 'Relieve', muestra: 'linear-gradient(135deg,#DCE8C8 0%,#C9B98E 55%,#9FB7A0 100%)', atribucion: 'Mapa topográfico © Esri, USGS, NOAA',
      capas: [{ url: ESRI + 'World_Topo_Map/MapServer/tile/{z}/{y}/{x}', op: { maxZoom: 19, maxNativeZoom: 17 } }] },
  };
  const CLAVE_CAPA = 'miAsistenteCapaMapa';
  const capaGuardada = () => { try { const c = localStorage.getItem(CLAVE_CAPA); return CAPAS[c] ? c : 'satelite'; } catch (e) { return 'satelite'; } };
  const IC = (d) => `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
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
      .mu{position:fixed;inset:0;z-index:99999;display:flex;flex-direction:column;background:#0b1437;font-family:'Manrope',system-ui,sans-serif}
      .mu-top{display:flex;gap:10px;align-items:center;padding:max(10px,env(safe-area-inset-top)) 12px 12px;background:#0b1a2e;color:#fff}
      .mu-top button{width:42px;height:42px;flex:none;border-radius:13px;border:1px solid #ffffff2e;background:#ffffff14;color:#fff;cursor:pointer;display:grid;place-items:center}
      .mu-top form{flex:1;display:flex}
      .mu-top input{flex:1;min-width:0;height:42px;border-radius:13px;border:1px solid #ffffff2e;padding:0 14px;font-size:15px;background:#ffffff1c;color:#fff;font-family:inherit}
      .mu-top input::placeholder{color:#b8c9ea}
      .mu-mapa{position:relative;flex:1;min-height:0;background:#1d2a1f}
      .mu-mapa>div#mu-mapa{position:absolute;inset:0}
      .mu-tip{position:absolute;z-index:500;left:10px;top:10px;background:rgba(11,20,55,.85);color:#fff;font-size:12px;font-weight:600;padding:6px 12px;border-radius:999px}
      .mu-ctl{position:absolute;z-index:500;right:12px;top:12px;display:flex;flex-direction:column;gap:10px}
      .mu-grupo{background:#fff;border-radius:14px;box-shadow:0 4px 14px rgba(0,0,0,.28);overflow:hidden}
      .mu-b{display:grid;place-items:center;width:46px;height:46px;border:0;background:#fff;color:#0b1437;cursor:pointer}
      .mu-b+.mu-b{border-top:1px solid #e3e7f1}
      .mu-b:active{background:#eef1f8}
      .mu-capas{position:absolute;z-index:600;right:68px;top:62px;background:#fff;border-radius:16px;box-shadow:0 8px 26px rgba(0,0,0,.35);padding:8px;display:none;gap:8px}
      .mu-capas.abierto{display:flex}
      .mu-capa{display:flex;flex-direction:column;align-items:center;gap:5px;border:2px solid transparent;border-radius:12px;background:none;padding:5px;cursor:pointer;font:600 11px 'Manrope',sans-serif;color:#2b3768}
      .mu-capa i{display:block;width:54px;height:40px;border-radius:9px;border:1px solid #0000001a}
      .mu-capa.sel{border-color:#2f6df0;color:#2f6df0}
      .mu-atrib{position:absolute;z-index:450;left:0;bottom:0;background:rgba(255,255,255,.82);color:#2b3768;font-size:10.5px;padding:2px 8px;border-top-right-radius:6px}
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
        <div class="mu-top"><button type="button" id="mu-volver" aria-label="Volver">${IC('<path d="M19 12H5M12 19l-7-7 7-7"/>')}</button>
          <form id="mu-form"><input id="mu-q" placeholder="Buscar calle y número" aria-label="Buscar una dirección" value="${esc(op.direccion || '')}"></form></div>
        <div class="mu-mapa"><div id="mu-mapa"></div><span class="mu-tip">Arrastrá el pin o tocá el mapa</span>
          <div class="mu-ctl">
            <div class="mu-grupo"><button type="button" class="mu-b" id="mu-mas" aria-label="Acercar">${IC('<path d="M12 5v14M5 12h14"/>')}</button><button type="button" class="mu-b" id="mu-menos" aria-label="Alejar">${IC('<path d="M5 12h14"/>')}</button></div>
            <div class="mu-grupo"><button type="button" class="mu-b" id="mu-capas-b" aria-label="Cambiar tipo de mapa">${IC('<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 13 9 5 9-5"/><path d="m3 17.5 9 5 9-5" opacity=".45"/>')}</button></div>
            <div class="mu-grupo"><button type="button" class="mu-b" id="mu-gps" aria-label="Usar mi ubicación">${IC('<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7.5"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>')}</button></div>
          </div>
          <div class="mu-capas" id="mu-capas">${Object.entries(CAPAS).map(([id, c]) => `<button type="button" class="mu-capa" data-capa="${id}"><i style="background:${c.muestra}"></i>${c.label}</button>`).join('')}</div>
          <div class="mu-atrib" id="mu-atrib"></div></div>
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
        let capaActual = capaGuardada(), capasMapa = [];
        const dibujarCapa = () => {
          capasMapa.forEach((l) => mapa.removeLayer(l));
          capasMapa = CAPAS[capaActual].capas.map((c, i) => { const l = L.tileLayer(c.url, c.op).addTo(mapa); if (i > 0) l.bringToFront(); return l; });
          $('mu-atrib').textContent = CAPAS[capaActual].atribucion;
          caja.querySelectorAll('.mu-capa').forEach((b) => b.classList.toggle('sel', b.dataset.capa === capaActual));
          try { localStorage.setItem(CLAVE_CAPA, capaActual); } catch (e) { /* sin almacenamiento */ }
        };
        dibujarCapa();
        $('mu-mas').onclick = () => mapa.zoomIn();
        $('mu-menos').onclick = () => mapa.zoomOut();
        $('mu-capas-b').onclick = () => $('mu-capas').classList.toggle('abierto');
        caja.querySelectorAll('.mu-capa').forEach((b) => { b.onclick = () => { capaActual = b.dataset.capa; dibujarCapa(); $('mu-capas').classList.remove('abierto'); }; });
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
