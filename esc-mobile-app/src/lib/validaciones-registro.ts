export type DatosRegistro = {
  nombre: string;
  correo: string;
  contrasena: string;
  confirmacion: string;
};

export type ErroresRegistro = Partial<Record<keyof DatosRegistro, string>>;

export const LONGITUD_MAXIMA_NOMBRE = 120;
export const LONGITUD_MINIMA_CONTRASENA = 8;

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizarCorreo(correo: string) {
  return correo.trim().toLowerCase();
}

export function validarNombre(nombre: string) {
  const limpio = nombre.trim();
  if (!limpio) return 'El nombre es obligatorio.';
  if (limpio.length > LONGITUD_MAXIMA_NOMBRE) {
    return `Usa máximo ${LONGITUD_MAXIMA_NOMBRE} caracteres.`;
  }
  return undefined;
}

function validarCorreo(correo: string) {
  const limpio = normalizarCorreo(correo);
  if (!limpio) return 'El correo es obligatorio.';
  if (!PATRON_CORREO.test(limpio)) return 'Ingresa un correo válido.';
  return undefined;
}

function validarContrasena(contrasena: string) {
  if (!contrasena) return 'La contraseña es obligatoria.';
  if (contrasena.length < LONGITUD_MINIMA_CONTRASENA) {
    return `Usa al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`;
  }
  if (!/[a-z]/.test(contrasena) || !/[A-Z]/.test(contrasena) || !/\d/.test(contrasena)) {
    return 'Incluye una minúscula, una mayúscula y un número.';
  }
  return undefined;
}

function validarConfirmacion(contrasena: string, confirmacion: string) {
  if (!confirmacion) return 'Confirma tu contraseña.';
  if (confirmacion !== contrasena) return 'Las contraseñas no coinciden.';
  return undefined;
}

export function validarRegistro(datos: DatosRegistro): ErroresRegistro {
  const errores: ErroresRegistro = {
    nombre: validarNombre(datos.nombre),
    correo: validarCorreo(datos.correo),
    contrasena: validarContrasena(datos.contrasena),
    confirmacion: validarConfirmacion(datos.contrasena, datos.confirmacion),
  };

  return Object.fromEntries(
    Object.entries(errores).filter(([, mensaje]) => mensaje !== undefined),
  ) as ErroresRegistro;
}

export function tieneErrores(errores: ErroresRegistro) {
  return Object.keys(errores).length > 0;
}
