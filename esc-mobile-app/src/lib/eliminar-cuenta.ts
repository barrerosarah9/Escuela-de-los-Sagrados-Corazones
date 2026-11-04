import { Alert } from 'react-native';
import { FunctionsFetchError, FunctionsHttpError } from '@supabase/supabase-js';
import { cerrarSesion } from './cerrar-sesion';
import { supabase } from './supabase';

export type ResultadoEliminacion = { ok: true } | { ok: false; titulo: string; mensaje: string };

const ERROR_GENERAL = {
  titulo: 'No pudimos eliminar tu cuenta',
  mensaje: 'Tu cuenta sigue activa. Inténtalo de nuevo en unos minutos.',
};

export function confirmarEliminacionDeCuenta(alConfirmar: () => void) {
  Alert.alert(
    '¿Eliminar tu cuenta?',
    'Se eliminarán tu cuenta, tu perfil y tu foto, tus comentarios y «Me gusta», tu racha de oración y tu historial de donaciones y compras. Tus donaciones mensuales se cancelarán.\n\nEsta acción no se puede deshacer.',
    [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar cuenta', style: 'destructive', onPress: alConfirmar },
    ],
  );
}

async function codigoDeError(error: unknown): Promise<string | null> {
  if (!(error instanceof FunctionsHttpError)) return null;
  try {
    const cuerpo = await error.context.json();
    return typeof cuerpo?.error === 'string' ? cuerpo.error : null;
  } catch {
    return null;
  }
}

export async function eliminarCuenta(): Promise<ResultadoEliminacion> {
  const { error } = await supabase.functions.invoke('eliminar-cuenta', { method: 'POST' });

  if (error) {
    if (error instanceof FunctionsFetchError) {
      return {
        ok: false,
        titulo: 'Sin conexión',
        mensaje: 'Revisa tu conexión a internet e inténtalo de nuevo. Tu cuenta sigue activa.',
      };
    }
    const codigo = await codigoDeError(error);
    if (codigo === 'cuenta_administrador') {
      return {
        ok: false,
        titulo: 'Cuenta de administrador',
        mensaje:
          'Las cuentas de administrador no se pueden eliminar desde la app. Pide a otro administrador que te quite el rol primero.',
      };
    }
    if (codigo === 'sin_sesion' || codigo === 'sesion_invalida') {
      return {
        ok: false,
        titulo: 'Tu sesión venció',
        mensaje: 'Vuelve a iniciar sesión e inténtalo de nuevo. Tu cuenta sigue activa.',
      };
    }
    return { ok: false, ...ERROR_GENERAL };
  }

  try {
    await cerrarSesion();
  } catch {
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined);
  }
  Alert.alert(
    'Cuenta eliminada',
    'Tu cuenta y tus datos se eliminaron. Gracias por haber sido parte de la comunidad.',
  );
  return { ok: true };
}
