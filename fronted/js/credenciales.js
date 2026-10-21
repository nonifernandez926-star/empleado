// Reglas de usuario y contraseña. Son las mismas que valida el servidor (backend/utils/usuarios.js) y las mismas de Mi Zona:
// cambiar una = cambiar la otra.
const RESERVADOS = ['admin', 'administrador', 'soporte', 'miasistente', 'mi_asistente', 'mi.asistente', 'mizona', 'mi_zona', 'mi.zona', 'moderador', 'equipo', 'ayuda', 'root', 'sistema', 'negocio', 'oficial'];

const normalizarUsuario = (v) => String(v == null ? '' : v).trim().toLowerCase();

// '' si es válido; si no, el mensaje para la persona.
function validarUsuario(valor) {
  const u = normalizarUsuario(valor);
  if (u.length < 5) return 'Tiene que tener al menos 5 caracteres.';
  if (u.length > 20) return 'Puede tener hasta 20 caracteres.';
  if (!/^[a-z]/.test(u)) return 'Tiene que empezar con una letra.';
  if (!/^[a-z0-9._]+$/.test(u)) return 'Usá solo letras, números, punto o guion bajo (sin espacios ni tildes).';
  if (/[._]{2}/.test(u) || /[._]$/.test(u)) return 'No uses dos signos seguidos ni termines con punto o guion bajo.';
  if (RESERVADOS.indexOf(u) !== -1) return 'Ese usuario no está disponible. Elegí otro.';
  return '';
}

// Requisitos que se muestran en vivo mientras se escribe la contraseña (puede ser solo números, solo letras o una mezcla).
const requisitosContrasena = (p) => [
  { ok: String(p).length >= 8, texto: '8 caracteres o más' },
  { ok: String(p).length > 0 && !/\s/.test(p), texto: 'Sin espacios' },
];

function validarContrasena(valor, usuario) {
  const p = String(valor == null ? '' : valor);
  if (p.length < 8) return 'Tiene que tener al menos 8 caracteres.';
  if (p.length > 100) return 'Es demasiado larga (máximo 100).';
  if (/\s/.test(p)) return 'No puede tener espacios.';
  const u = normalizarUsuario(usuario);
  if (u && p.toLowerCase().indexOf(u) !== -1) return 'No puede contener tu usuario.';
  return '';
}
