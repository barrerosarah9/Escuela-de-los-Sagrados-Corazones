import type { NotificationResponse } from 'expo-notifications';
import { router, type Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { cargarNotificaciones } from './notificaciones';
import { supabase } from './supabase';

const RUTA_FEED = '/';
const RUTA_ORACION = '/oracion';
const PATRON_PUBLICACION = /^\/publicacion\/(\d+)$/;

export function rutaDeAviso(pantalla: unknown): string {
  if (pantalla === RUTA_ORACION || pantalla === RUTA_FEED) {
    return pantalla;
  }
  if (typeof pantalla === 'string' && PATRON_PUBLICACION.test(pantalla)) {
    return pantalla;
  }
  return RUTA_FEED;
}

async function publicacionExiste(id: number): Promise<boolean> {
  const { data, error } = await supabase
    .from('publicaciones_con_conteos')
    .select('id')
    .eq('id', id)
    .maybeSingle();
  if (error) {
    return true;
  }
  return data !== null;
}

async function abrirRuta(ruta: string) {
  const coincidencia = PATRON_PUBLICACION.exec(ruta);
  if (!coincidencia) {
    router.navigate(ruta as Href);
    return;
  }
  const id = coincidencia[1];
  if (!(await publicacionExiste(Number(id)))) {
    router.navigate(RUTA_FEED);
    return;
  }
  router.push({ pathname: '/publicacion/[id]', params: { id } });
}

function avisarError(error: unknown) {
  if (__DEV__) {
    console.warn('No se pudo abrir la pantalla del aviso', error);
  }
}

export function useNavegacionDesdeAvisos(listo: boolean, conSesion: boolean) {
  const [pendiente, setPendiente] = useState<string | null>(null);
  const atendidas = useRef(new Set<string>());
  const ingresoPedido = useRef(false);

  useEffect(() => {
    let activo = true;
    let suscripcion: { remove: () => void } | null = null;

    async function escuchar() {
      const modulo = await cargarNotificaciones();
      if (!modulo || !activo) {
        return;
      }
      const recibir = (respuesta: NotificationResponse) => {
        if (respuesta.actionIdentifier !== modulo.DEFAULT_ACTION_IDENTIFIER) {
          return;
        }
        const id = respuesta.notification.request.identifier;
        if (atendidas.current.has(id)) {
          return;
        }
        atendidas.current.add(id);
        modulo.clearLastNotificationResponse();
        ingresoPedido.current = false;
        setPendiente(rutaDeAviso(respuesta.notification.request.content.data?.pantalla));
      };
      suscripcion = modulo.addNotificationResponseReceivedListener(recibir);
      const ultima = modulo.getLastNotificationResponse();
      if (ultima) {
        recibir(ultima);
      }
    }

    escuchar().catch(avisarError);

    return () => {
      activo = false;
      suscripcion?.remove();
    };
  }, []);

  useEffect(() => {
    if (!listo || !pendiente) {
      return;
    }
    if (!conSesion) {
      if (!ingresoPedido.current) {
        ingresoPedido.current = true;
        const temporizador = setTimeout(() => router.navigate('/ingreso'), 0);
        return () => clearTimeout(temporizador);
      }
      return;
    }
    const ruta = pendiente;
    const temporizador = setTimeout(() => {
      setPendiente(null);
      abrirRuta(ruta).catch(avisarError);
    }, 0);
    return () => clearTimeout(temporizador);
  }, [listo, conSesion, pendiente]);
}
