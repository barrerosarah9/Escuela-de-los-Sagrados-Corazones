import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type Administrador = {
  id: string;
  nombre: string;
  correo: string;
};

export type ResultadoIngreso =
  | { estado: 'ok'; administrador: Administrador }
  | { estado: 'error'; mensaje: string };

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const MENSAJES_INGRESO = {
  incompleto: 'Ingresa tu correo y tu contraseña.',
  correoInvalido: 'Ingresa un correo válido.',
  credenciales: 'Correo o contraseña incorrectos.',
  sinPermisos: 'Esta cuenta no tiene permisos de administración.',
  bloqueada: 'Esta cuenta está bloqueada.',
  sinConfirmar: 'Confirma tu correo desde la app antes de entrar al portal.',
  limite: 'Hiciste varios intentos seguidos. Espera un minuto e inténtalo de nuevo.',
  sinConexion: 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
  desconocido: 'No pudimos iniciar sesión. Inténtalo de nuevo en unos minutos.',
};

function mensajeDeError(error: Error) {
  if (isAuthRetryableFetchError(error)) {
    return MENSAJES_INGRESO.sinConexion;
  }
  if (!isAuthApiError(error)) {
    return MENSAJES_INGRESO.desconocido;
  }
  if (error.code === 'invalid_credentials' || error.status === 400) {
    return MENSAJES_INGRESO.credenciales;
  }
  if (error.code === 'email_not_confirmed') {
    return MENSAJES_INGRESO.sinConfirmar;
  }
  if (error.code === 'user_banned') {
    return MENSAJES_INGRESO.bloqueada;
  }
  if (error.status === 429) {
    return MENSAJES_INGRESO.limite;
  }
  return MENSAJES_INGRESO.desconocido;
}

async function rechazar(mensaje: string): Promise<ResultadoIngreso> {
  await supabase.auth.signOut({ scope: 'local' });
  return { estado: 'error', mensaje };
}

export async function ingresarAdministrador(
  correo: string,
  contrasena: string,
): Promise<ResultadoIngreso> {
  const correoNormalizado = correo.trim().toLowerCase();

  if (!correoNormalizado || !contrasena) {
    return { estado: 'error', mensaje: MENSAJES_INGRESO.incompleto };
  }
  if (!CORREO_VALIDO.test(correoNormalizado)) {
    return { estado: 'error', mensaje: MENSAJES_INGRESO.correoInvalido };
  }

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: correoNormalizado,
      password: contrasena,
    });
    if (error) {
      return { estado: 'error', mensaje: mensajeDeError(error) };
    }

    const { data: perfil, error: errorPerfil } = await supabase
      .from('perfiles')
      .select('nombre, correo, rol, bloqueado')
      .eq('id', data.user.id)
      .maybeSingle();

    if (errorPerfil || !perfil) {
      return rechazar(MENSAJES_INGRESO.desconocido);
    }
    if (perfil.rol !== 'administrador') {
      return rechazar(MENSAJES_INGRESO.sinPermisos);
    }
    if (perfil.bloqueado) {
      return rechazar(MENSAJES_INGRESO.bloqueada);
    }

    return {
      estado: 'ok',
      administrador: {
        id: data.user.id,
        nombre: perfil.nombre || correoNormalizado,
        correo: perfil.correo || correoNormalizado,
      },
    };
  } catch {
    return rechazar(MENSAJES_INGRESO.sinConexion);
  }
}

export function iniciales(nombre: string) {
  const letras = nombre
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((palabra) => palabra[0])
    .join('');
  return letras.toUpperCase() || '?';
}
