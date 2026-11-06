import { ErrorFeed } from './feed';
import { supabase } from './supabase';

export const MAXIMO_CARACTERES_COMENTARIO = 2000;
export const MAXIMO_COMENTARIOS_CARGADOS = 500;
export const NOMBRE_AUTOR_OCULTO = 'Miembro de la comunidad';

const COLUMNAS = 'id, publicacion_id, usuario_id, texto, creado_en';

export type Comentario = {
  id: number;
  publicacionId: number;
  usuarioId: string;
  texto: string;
  creadoEn: string;
};

export type AutorComentario = {
  nombre: string | null;
  fotoPath: string | null;
};

export type ComentarioConAutor = Comentario & {
  autor: AutorComentario;
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

type FilaPerfilPublico = {
  id: string;
  nombre: string | null;
  foto_path: string | null;
};

const AUTOR_OCULTO: AutorComentario = { nombre: null, fotoPath: null };

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

function errorDeLectura(mensaje: string) {
  return new ErrorFeed(esErrorDeRed(mensaje) ? 'sin_conexion' : 'desconocido', mensaje);
}

export function contarCaracteres(texto: string) {
  return Array.from(texto.trim()).length;
}

export function puedeEnviarComentario(texto: string) {
  const total = contarCaracteres(texto);
  return total > 0 && total <= MAXIMO_CARACTERES_COMENTARIO;
}

export function nombreVisible(autor: AutorComentario) {
  const nombre = autor.nombre?.trim();
  return nombre ? nombre : NOMBRE_AUTOR_OCULTO;
}

function motivoDeError(codigo: string | undefined, mensaje: string): MotivoErrorComentario {
  if (esErrorDeRed(mensaje)) return 'sin_conexion';
  if (codigo === '42501') return 'cuenta_bloqueada';
  if (codigo === '23503') return 'publicacion_eliminada';
  if (codigo === '23514') return 'texto_invalido';
  return 'desconocido';
}

async function obtenerAutores(usuarioIds: string[]) {
  const autores = new Map<string, AutorComentario>();
  if (usuarioIds.length === 0) return autores;

  const { data, error } = await supabase
    .from('perfiles_publicos')
    .select('id, nombre, foto_path')
    .in('id', usuarioIds);

  if (error) throw errorDeLectura(error.message);

  for (const fila of (data ?? []) as FilaPerfilPublico[]) {
    autores.set(fila.id, { nombre: fila.nombre, fotoPath: fila.foto_path });
  }
  return autores;
}

export async function obtenerComentarios(publicacionId: number): Promise<ComentarioConAutor[]> {
  try {
    const { data, error } = await supabase
      .from('comentarios')
      .select(COLUMNAS)
      .eq('publicacion_id', publicacionId)
      .order('creado_en', { ascending: true })
      .order('id', { ascending: true })
      .limit(MAXIMO_COMENTARIOS_CARGADOS);

    if (error) throw errorDeLectura(error.message);

    const comentarios = ((data ?? []) as FilaComentario[]).map(aComentario);
    const usuarioIds = [...new Set(comentarios.map((comentario) => comentario.usuarioId))];
    const autores = await obtenerAutores(usuarioIds);

    return comentarios.map((comentario) => ({
      ...comentario,
      autor: autores.get(comentario.usuarioId) ?? AUTOR_OCULTO,
    }));
  } catch (error) {
    if (error instanceof ErrorFeed) throw error;
    throw errorDeLectura(error instanceof Error ? error.message : String(error));
  }
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
