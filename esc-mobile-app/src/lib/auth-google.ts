import { isAuthApiError } from '@supabase/supabase-js';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { cuentaBloqueada } from './cuenta';
import { supabase } from './supabase';

type ModuloGoogle = typeof import('@react-native-google-signin/google-signin');

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

const enExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const MENSAJE_EXPO_GO =
  'El inicio de sesión con Google no funciona en Expo Go. Abre la app desde el development build.';

let moduloCargado: ModuloGoogle | null = null;

async function cargarGoogle(): Promise<ModuloGoogle> {
  if (moduloCargado) {
    return moduloCargado;
  }
  if (!webClientId) {
    throw new Error('Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en .env.local.');
  }
  const modulo = await import('@react-native-google-signin/google-signin');
  modulo.GoogleSignin.configure({ webClientId, iosClientId });
  moduloCargado = modulo;
  return modulo;
}

export type ResultadoGoogle =
  | { estado: 'ok' }
  | { estado: 'cancelado' }
  | { estado: 'bloqueada' }
  | { estado: 'error'; mensaje: string };

function codigoDeError(error: unknown) {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code: unknown }).code);
  }
  return null;
}

function mensajeDeError(error: unknown) {
  const base = 'No pudimos iniciar sesión con Google. Inténtalo de nuevo.';
  if (!__DEV__) {
    return base;
  }
  const codigo = codigoDeError(error);
  if (codigo) {
    return `${base}\n\nCódigo: ${codigo}`;
  }
  return error instanceof Error ? `${base}\n\n${error.message}` : base;
}

export async function iniciarSesionConGoogle(): Promise<ResultadoGoogle> {
  if (enExpoGo) {
    return { estado: 'error', mensaje: MENSAJE_EXPO_GO };
  }

  try {
    const { GoogleSignin, isSuccessResponse } = await cargarGoogle();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    if (GoogleSignin.hasPreviousSignIn()) {
      await GoogleSignin.signOut();
    }

    const respuesta = await GoogleSignin.signIn();
    if (!isSuccessResponse(respuesta)) {
      return { estado: 'cancelado' };
    }

    const idToken = respuesta.data.idToken;
    if (!idToken) {
      return { estado: 'error', mensaje: 'Google no devolvió el token de identidad.' };
    }

    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) {
      if (isAuthApiError(error) && error.code === 'user_banned') {
        return { estado: 'bloqueada' };
      }
      return { estado: 'error', mensaje: mensajeDeError(error) };
    }

    if (await cuentaBloqueada(data.user.id)) {
      await supabase.auth.signOut();
      await GoogleSignin.signOut();
      return { estado: 'bloqueada' };
    }

    return { estado: 'ok' };
  } catch (error) {
    const codigo = codigoDeError(error);
    if (moduloCargado && codigo === moduloCargado.statusCodes.IN_PROGRESS) {
      return { estado: 'cancelado' };
    }
    if (moduloCargado && codigo === moduloCargado.statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return {
        estado: 'error',
        mensaje: 'Google Play Services no está disponible en este dispositivo.',
      };
    }
    return { estado: 'error', mensaje: mensajeDeError(error) };
  }
}

export async function cerrarSesionDeGoogle() {
  if (enExpoGo) {
    return;
  }
  try {
    const { GoogleSignin } = await cargarGoogle();
    await GoogleSignin.signOut();
  } catch {
    return;
  }
}
