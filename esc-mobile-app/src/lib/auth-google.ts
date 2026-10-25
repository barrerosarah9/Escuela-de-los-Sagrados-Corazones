import {
  GoogleSignin,
  isErrorWithCode,
  isSuccessResponse,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';

const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;

let configurado = false;

function configurarGoogle() {
  if (configurado) {
    return;
  }
  if (!webClientId) {
    throw new Error('Falta EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID en .env.local.');
  }
  GoogleSignin.configure({ webClientId, iosClientId });
  configurado = true;
}

export type ResultadoGoogle =
  { estado: 'ok' } | { estado: 'cancelado' } | { estado: 'error'; mensaje: string };

function mensajeDeError(error: unknown) {
  const base = 'No pudimos iniciar sesión con Google. Inténtalo de nuevo.';
  if (!__DEV__) {
    return base;
  }
  if (isErrorWithCode(error)) {
    return `${base}\n\nCódigo: ${error.code}`;
  }
  return error instanceof Error ? `${base}\n\n${error.message}` : base;
}

async function olvidarCuentaAnterior() {
  if (GoogleSignin.hasPreviousSignIn()) {
    await GoogleSignin.signOut();
  }
}

export async function iniciarSesionConGoogle(): Promise<ResultadoGoogle> {
  try {
    configurarGoogle();
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    await olvidarCuentaAnterior();

    const respuesta = await GoogleSignin.signIn();
    if (!isSuccessResponse(respuesta)) {
      return { estado: 'cancelado' };
    }

    const idToken = respuesta.data.idToken;
    if (!idToken) {
      return { estado: 'error', mensaje: 'Google no devolvió el token de identidad.' };
    }

    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });
    if (error) {
      return { estado: 'error', mensaje: mensajeDeError(error) };
    }

    return { estado: 'ok' };
  } catch (error) {
    if (isErrorWithCode(error)) {
      if (error.code === statusCodes.IN_PROGRESS) {
        return { estado: 'cancelado' };
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        return {
          estado: 'error',
          mensaje: 'Google Play Services no está disponible en este dispositivo.',
        };
      }
    }
    return { estado: 'error', mensaje: mensajeDeError(error) };
  }
}

export async function cerrarSesionDeGoogle() {
  try {
    configurarGoogle();
    await GoogleSignin.signOut();
  } catch {
    return;
  }
}
