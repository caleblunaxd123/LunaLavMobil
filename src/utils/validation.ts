/**
 * Reglas de validación compartidas con el backend de LunaLav (NegociosController / ClienteDto),
 * para avisar al usuario antes de enviar y con mensajes claros.
 */
const RESERVED_SLUGS = new Set([
  'login', 'ticket', 'cuadre-caja', 'seleccionar-sede', 'inicio', 'pedidos', 'registrar', 'registro-antiguo',
  'clientes', 'promociones', 'reportes', 'inventario', 'ajustes', 'facturacion', 'assets', 'plataforma',
  'seguimiento', 'repartidor', 'recibo-suscripcion', 'privacidad', 'terminos', 'nosotros', 'marketing', 'demo',
  // Reservados también por el alta del servidor (RegistroPublicoController).
  'api', 'admin', 'app', 'soporte', 'caja',
]);

/** "Lavandería Doña Rosa" → "lavanderia-dona-rosa" */
export function slugify(text: string) {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

/**
 * Código de empresa tal como lo escribe o pega el usuario: acepta el enlace completo
 * ("https://app.lunalav.pe/mi-empresa/login") y se queda solo con "mi-empresa".
 */
export function normalizeEmpresa(input: string) {
  let value = input.trim().toLowerCase();
  const link = value.match(/lunalav\.pe\/([^/?#\s]+)/);
  if (link) value = link[1];
  return value.split(/[/?#]/)[0].replace(/[^a-z0-9-]/g, '');
}

export function slugError(slug: string) {
  if (!slug) return 'Elige un código para tu empresa.';
  if (slug.length < 3) return 'Usa al menos 3 caracteres.';
  if (!/^[a-z0-9][a-z0-9-]{1,49}$/.test(slug)) return 'Solo letras minúsculas, números y guiones; debe empezar con letra o número.';
  if (RESERVED_SLUGS.has(slug)) return 'Ese código está reservado por LunaLav. Prueba con otro.';
  return '';
}

export function usuarioError(usuario: string) {
  if (usuario.length < 3) return 'El usuario debe tener al menos 3 caracteres.';
  if (!/^[a-z0-9._-]{3,50}$/i.test(usuario)) return 'Usa solo letras, números, punto, guion o guion bajo (sin espacios).';
  return '';
}

export const emailValido = (email: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
export const celularValido = (celular: string) => /^\+?\d{6,20}$/.test(celular.replace(/\s/g, ''));

/** Fuerza de la contraseña de 0 a 4, con una etiqueta legible. */
export function passwordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  else if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score += password.length >= 8 ? 0.5 : 0;
  const value = Math.min(4, Math.floor(score));
  const label = password.length < 8 ? 'Muy corta' : ['Débil', 'Débil', 'Aceptable', 'Buena', 'Excelente'][value];
  return { value: password.length < 8 ? 0 : Math.max(1, value), label };
}
