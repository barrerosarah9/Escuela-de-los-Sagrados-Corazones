import { validarNombre } from './validaciones-registro';

export type DatosPerfilEditables = {
  nombre: string;
  telefono: string;
};

export type ErroresPerfil = Partial<Record<keyof DatosPerfilEditables, string>>;

const PATRON_TELEFONO = /^\+?[0-9 ]{7,20}$/;
const MINIMO_DIGITOS_TELEFONO = 7;

export function normalizarNombre(nombre: string) {
  return nombre.trim().replace(/\s+/g, ' ');
}

export function normalizarTelefono(telefono: string) {
  const limpio = telefono.trim().replace(/\s+/g, ' ');
  return limpio === '' ? null : limpio;
}

function validarTelefono(telefono: string) {
  const limpio = normalizarTelefono(telefono);
  if (limpio === null) return undefined;
  const digitos = limpio.replace(/\D/g, '').length;
  if (!PATRON_TELEFONO.test(limpio) || digitos < MINIMO_DIGITOS_TELEFONO) {
    return 'Ingresa un teléfono válido, por ejemplo 300 123 4567.';
  }
  return undefined;
}

export function validarPerfil(datos: DatosPerfilEditables): ErroresPerfil {
  const errores: ErroresPerfil = {
    nombre: validarNombre(datos.nombre),
    telefono: validarTelefono(datos.telefono),
  };

  return Object.fromEntries(
    Object.entries(errores).filter(([, mensaje]) => mensaje !== undefined),
  ) as ErroresPerfil;
}

export function tieneErroresPerfil(errores: ErroresPerfil) {
  return Object.keys(errores).length > 0;
}
