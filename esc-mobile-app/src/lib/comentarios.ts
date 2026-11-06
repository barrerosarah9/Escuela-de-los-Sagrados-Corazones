import { supabase } from './supabase';

export const MAXIMO_CARACTERES_COMENTARIO = 2000;

const COLUMNAS = 'id, publicacion_id, usuario_id, texto, creado_en';

export type Comentario = {
  id: number;
  publicacionId: number;
  usuarioId: string;
  texto: string;
  creadoEn: string;
};

export type MotivoErrorComentario =
  'sin_conexion' | 'cuenta_bloqueada' | 'publicacion_eliminada' | 'texto_invalido' | 'desconocido';

export type ResultadoComentario =
  { ok: true; comentario: Comentario } | { ok: false; motivo: MotivoErrorComentario };

type FilaComentario = {
  id: number;
  publicacion_id: number;
  usuario_id: string;
  texto: string;
  creado_en: string;
};

function aComentario(fila: FilaComentario): Comentario {
  return {
    id: fila.id,
    publicacionId: fila.publicacion_id,
    usuarioId: fila.usuario_id,
    texto: fila.texto,
    creadoEn: fila.creado_en,
  };
}

function esErrorDeRed(mensaje: string) {
  return /network|fetch|timeout/i.test(mensaje);
}

export function contarCaracteres(texto: string) {
  return Array.from(texto.trim()).length;
}

export function puedeEnviarComentario(texto: string) {
  const total = contarCaracteres(texto);
  return total > 0 && total <= MAXIMO_CARACTERES_COMENTARIO;
}

function motivoDeError(codigo: string | undefined, mensaje: string): MotivoErrorComentario {
  if (esErrorDeRed(mensaje)) return 'sin_conexion';
  if (codigo === '42501') return 'cuenta_bloqueada';
  if (codigo === '23503') return 'publicacion_eliminada';
  if (codigo === '23514') return 'texto_invalido';
  return 'desconocido';
}

export async function crearComentario(
  publicacionId: number,
  usuarioId: string,
  texto: string,
): Promise<ResultadoComentario> {
  if (!puedeEnviarComentario(texto)) return { ok: false, motivo: 'texto_invalido' };

  try {
    const { data, error } = await supabase
      .from('comentarios')
      .insert({ publicacion_id: publicacionId, usuario_id: usuarioId, texto: texto.trim() })
      .select(COLUMNAS)
      .single();

    if (error) return { ok: false, motivo: motivoDeError(error.code, error.message) };
    return { ok: true, comentario: aComentario(data as FilaComentario) };
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    return { ok: false, motivo: esErrorDeRed(mensaje) ? 'sin_conexion' : 'desconocido' };
  }
}
