import { useCallback, useSyncExternalStore } from 'react';
import { Alert } from 'react-native';
import { supabase } from './supabase';

export type EstadoMeGusta = {
  marcado: boolean;
  total: number;
};

export type MotivoErrorMeGusta = 'sin_conexion' | 'sin_sesion' | 'sin_permiso' | 'desconocido';

export class ErrorMeGusta extends Error {
  motivo: MotivoErrorMeGusta;

  constructor(motivo: MotivoErrorMeGusta, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorMeGusta';
    this.motivo = motivo;
  }
}

const MENSAJES: Record<MotivoErrorMeGusta, string> = {
  sin_conexion: 'Revisa tu conexión e intenta de nuevo.',
  sin_sesion: 'Vuelve a iniciar sesión e intenta de nuevo.',
  sin_permiso: 'Tu cuenta no puede reaccionar a publicaciones en este momento.',
  desconocido: 'Intenta de nuevo en unos segundos.',
};

const estados = new Map<number, EstadoMeGusta>();
const enCurso = new Set<number>();
const oyentes = new Set<() => void>();

function emitir() {
  for (const oyente of oyentes) oyente();
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente);
  return () => {
    oyentes.delete(oyente);
  };
}

function errorDe(error: { code?: string; message: string }) {
  if (error.code === '42501') return new ErrorMeGusta('sin_permiso', error.message);
  if (/network|fetch|timeout/i.test(error.message)) {
    return new ErrorMeGusta('sin_conexion', error.message);
  }
  return new ErrorMeGusta('desconocido', error.message);
}

async function usuarioActual() {
  const { data } = await supabase.auth.getSession();
  const id = data.session?.user.id;
  if (!id) throw new ErrorMeGusta('sin_sesion', 'Sin sesión');
  return id;
}

async function darMeGusta(publicacionId: number) {
  const usuarioId = await usuarioActual();
  const { error } = await supabase
    .from('me_gusta')
    .upsert(
      { publicacion_id: publicacionId, usuario_id: usuarioId },
      { onConflict: 'publicacion_id,usuario_id', ignoreDuplicates: true },
    );
  if (error) throw errorDe(error);
}

async function quitarMeGusta(publicacionId: number) {
  const usuarioId = await usuarioActual();
  const { error } = await supabase
    .from('me_gusta')
    .delete()
    .eq('publicacion_id', publicacionId)
    .eq('usuario_id', usuarioId);
  if (error) throw errorDe(error);
}

export function registrarMeGustaDelServidor(
  filas: { id: number; marcado: boolean; total: number }[],
) {
  let cambio = false;
  for (const fila of filas) {
    if (enCurso.has(fila.id)) continue;
    const actual = estados.get(fila.id);
    if (actual && actual.marcado === fila.marcado && actual.total === fila.total) continue;
    estados.set(fila.id, { marcado: fila.marcado, total: fila.total });
    cambio = true;
  }
  if (cambio) emitir();
}

export async function alternarMeGusta(publicacionId: number, inicial: EstadoMeGusta) {
  if (enCurso.has(publicacionId)) return;
  const anterior = estados.get(publicacionId) ?? inicial;
  const siguiente: EstadoMeGusta = {
    marcado: !anterior.marcado,
    total: Math.max(0, anterior.total + (anterior.marcado ? -1 : 1)),
  };

  enCurso.add(publicacionId);
  estados.set(publicacionId, siguiente);
  emitir();

  try {
    if (siguiente.marcado) await darMeGusta(publicacionId);
    else await quitarMeGusta(publicacionId);
  } catch (error) {
    estados.set(publicacionId, anterior);
    emitir();
    const motivo = error instanceof ErrorMeGusta ? error.motivo : 'desconocido';
    Alert.alert(
      siguiente.marcado ? 'No se pudo dar «Me gusta»' : 'No se pudo quitar el «Me gusta»',
      MENSAJES[motivo],
    );
  } finally {
    enCurso.delete(publicacionId);
  }
}

export function useMeGusta(publicacionId: number, inicial: EstadoMeGusta) {
  const estado = useSyncExternalStore(suscribir, () => estados.get(publicacionId));
  const actual = estado ?? inicial;
  const alternar = useCallback(() => {
    void alternarMeGusta(publicacionId, actual);
  }, [publicacionId, actual]);
  return { ...actual, alternar };
}
