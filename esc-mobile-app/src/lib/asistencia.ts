import { supabase } from './supabase';

export type MotivoErrorAsistencia =
  'sin_conexion' | 'cuenta_bloqueada' | 'oracion_eliminada' | 'desconocido';

export type ResultadoAsistencia = { ok: true } | { ok: false; motivo: MotivoErrorAsistencia };

const YA_CONFIRMADA = '23505';

function esErrorDeRed(mensaje: string) {
  return /network|fetch|timeout/i.test(mensaje);
}

function motivoDeError(codigo: string | undefined, mensaje: string): MotivoErrorAsistencia {
  if (esErrorDeRed(mensaje)) return 'sin_conexion';
  if (codigo === '42501') return 'cuenta_bloqueada';
  if (codigo === '23503') return 'oracion_eliminada';
  return 'desconocido';
}

function motivoDeExcepcion(error: unknown): MotivoErrorAsistencia {
  const mensaje = error instanceof Error ? error.message : String(error);
  return esErrorDeRed(mensaje) ? 'sin_conexion' : 'desconocido';
}

export async function obtenerAsistenciaConfirmada(oracionId: number, usuarioId: string) {
  const { data, error } = await supabase
    .from('asistencias')
    .select('oracion_en_vivo_id')
    .eq('oracion_en_vivo_id', oracionId)
    .eq('usuario_id', usuarioId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data !== null;
}

export async function confirmarAsistencia(
  oracionId: number,
  usuarioId: string,
): Promise<ResultadoAsistencia> {
  try {
    const { error } = await supabase
      .from('asistencias')
      .insert({ oracion_en_vivo_id: oracionId, usuario_id: usuarioId });

    if (error && error.code !== YA_CONFIRMADA) {
      return { ok: false, motivo: motivoDeError(error.code, error.message) };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, motivo: motivoDeExcepcion(error) };
  }
}

export async function cancelarAsistencia(
  oracionId: number,
  usuarioId: string,
): Promise<ResultadoAsistencia> {
  try {
    const { error } = await supabase
      .from('asistencias')
      .delete()
      .eq('oracion_en_vivo_id', oracionId)
      .eq('usuario_id', usuarioId);

    if (error) return { ok: false, motivo: motivoDeError(error.code, error.message) };
    return { ok: true };
  } catch (error) {
    return { ok: false, motivo: motivoDeExcepcion(error) };
  }
}
