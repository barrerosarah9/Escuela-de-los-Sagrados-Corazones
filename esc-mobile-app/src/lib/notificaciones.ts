import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import { supabase } from './supabase';

type ModuloNotificaciones = typeof import('expo-notifications');

const CANAL = 'general';
const CANAL_RECORDATORIOS = 'recordatorios';
const CLAVE_PERMISO_PEDIDO = 'notificaciones:permiso-pedido';

const disponibles = Platform.OS !== 'web' && !isRunningInExpoGo();

let moduloCargado: ModuloNotificaciones | null = null;
let ultimoToken: string | null = null;

async function crearCanales(modulo: ModuloNotificaciones) {
  await modulo.setNotificationChannelAsync(CANAL, {
    name: 'Avisos de la Escuela',
    description: 'Oraciones del día y publicaciones nuevas.',
    importance: modulo.AndroidImportance.HIGH,
  });
  await modulo.setNotificationChannelAsync(CANAL_RECORDATORIOS, {
    name: 'Recordatorios de oración en vivo',
    description: 'Aviso antes de que empiece la oración en vivo del día.',
    importance: modulo.AndroidImportance.HIGH,
  });
}

export async function cargarNotificaciones(): Promise<ModuloNotificaciones | null> {
  if (!disponibles) {
    return null;
  }
  if (moduloCargado) {
    return moduloCargado;
  }
  const modulo = await import('expo-notifications');
  modulo.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    await crearCanales(modulo);
  }
  moduloCargado = modulo;
  return modulo;
}

async function permisoConcedido(modulo: ModuloNotificaciones) {
  const actual = await modulo.getPermissionsAsync();
  if (actual.granted) {
    return true;
  }
  if (!actual.canAskAgain || localStorage.getItem(CLAVE_PERMISO_PEDIDO) === 'si') {
    return false;
  }
  localStorage.setItem(CLAVE_PERMISO_PEDIDO, 'si');
  const respuesta = await modulo.requestPermissionsAsync();
  return respuesta.granted;
}

async function guardarToken(token: unknown) {
  if (typeof token !== 'string' || token.length === 0) {
    return;
  }
  const { error } = await supabase.rpc('registrar_token_dispositivo', {
    p_token: token,
    p_plataforma: Platform.OS === 'ios' ? 'ios' : 'android',
  });
  if (error) {
    throw error;
  }
  ultimoToken = token;
}

function avisarError(error: unknown) {
  if (__DEV__) {
    console.warn('No se pudieron activar las notificaciones', error);
  }
}

export function activarNotificaciones(): () => void {
  let activo = true;
  let suscripcion: { remove: () => void } | null = null;

  async function iniciar() {
    const modulo = await cargarNotificaciones();
    if (!modulo || !activo) {
      return;
    }
    if (!(await permisoConcedido(modulo)) || !activo) {
      return;
    }
    const { data } = await modulo.getDevicePushTokenAsync();
    if (!activo) {
      return;
    }
    await guardarToken(data);
    suscripcion = modulo.addPushTokenListener((nuevo) => {
      guardarToken(nuevo.data).catch(avisarError);
    });
    if (!activo) {
      suscripcion.remove();
      suscripcion = null;
    }
  }

  iniciar().catch(avisarError);

  return () => {
    activo = false;
    suscripcion?.remove();
    suscripcion = null;
  };
}

export async function olvidarTokenDelDispositivo() {
  if (!ultimoToken) {
    return;
  }
  const token = ultimoToken;
  ultimoToken = null;
  const { error } = await supabase.from('tokens_dispositivo').delete().eq('token', token);
  if (error) {
    throw error;
  }
}
