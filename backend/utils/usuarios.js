// Reglas de usuario y contraseña de Mi Asistente. Son las mismas que usa Mi Zona (así la misma persona puede
// elegir el mismo usuario en las dos apps). Se repiten en la web: frontend/js/credenciales.js. Cambiar una = cambiar la otra.
const RESERVADOS = new Set(['admin', 'administrador', 'soporte', 'miasistente', 'mi_asistente', 'mi.asistente', 'mizona', 'mi_zona', 'mi.zona', 'moderador', 'equipo', 'ayuda', 'root', 'sistema', 'negocio', 'oficial']);

const MSG_USUARIO_EN_USO = 'Ese usuario ya está en uso. Elegí otro.';
const normalizarUsuario = (v) => String(v == null ? '' : v).trim().toLowerCase();

// Devuelve '' si el usuario es válido; si no, el mensaje para la persona.
function errorUsuario(valor) {
  const u = normalizarUsuario(valor);
  if (u.length < 5) return 'El usuario tiene que tener al menos 5 caracteres.';
  if (u.length > 20) return 'El usuario puede tener hasta 20 caracteres.';
  if (!/^[a-z]/.test(u)) return 'El usuario tiene que empezar con una letra.';
  if (!/^[a-z0-9._]+$/.test(u)) return 'Usá solo letras, números, punto o guion bajo (sin espacios ni tildes).';
  if (/[._]{2}/.test(u) || /[._]$/.test(u)) return 'No uses dos signos seguidos ni termines con punto o guion bajo.';
  if (RESERVADOS.has(u)) return 'Ese usuario no está disponible. Elegí otro.';
  return '';
}

// Devuelve '' si la contraseña cumple; si no, el mensaje. Puede ser solo números, solo letras o una mezcla.
function errorContrasena(valor, usuario = '') {
  const p = String(valor == null ? '' : valor);
  if (p.length < 8) return 'La contraseña tiene que tener al menos 8 caracteres.';
  if (p.length > 100) return 'La contraseña es demasiado larga (máximo 100).';
  if (/\s/.test(p)) return 'La contraseña no puede tener espacios.';
  const u = normalizarUsuario(usuario);
  if (u && p.toLowerCase().includes(u)) return 'La contraseña no puede contener tu usuario.';
  return '';
}

module.exports = { normalizarUsuario, errorUsuario, errorContrasena, MSG_USUARIO_EN_USO };
