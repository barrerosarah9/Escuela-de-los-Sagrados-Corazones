import { supabase } from './supabase';

const BUCKET_AVATARES = 'avatares';
const DURACION_URL_FOTO = 60 * 60;
const MAXIMO_COMENTARIOS = 500;

export const AUTOR_SIN_NOMBRE = 'Usuario sin nombre';

export const MENSAJES_COMENTARIO = {
  carga: 'No pudimos cargar los comentarios. Inténtalo de nuevo.',
  sinPermisos: 'Tu cuenta no tiene permisos para eliminar comentarios. Vuelve a iniciar sesión.',
  sinConexion: 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
  noExiste: 'Este comentario ya no existe. Lo quitamos de la lista.',
  noEliminado: 'No pudimos eliminar el comentario. Inténtalo de nuevo en unos minutos.',
};

export type AutorComentario = {
  id: string;
  nombre: string;
  correo: string | null;
  fotoUrl: string | null;
};

export type Comentario = {
  id: number;
  publicacionId: number;
  texto: string;
  creadoEn: string;
  autor: AutorComentario;
};

export type ResultadoEliminacionComentario =
  | { estado: 'ok' }
  | { estado: 'no_existe'; mensaje: string }
  | { estado: 'error'; mensaje: string };

type FilaComentario = {
  id: number;
  publicacion_id: number;
  usuario_id: string;
  texto: string;
  creado_en: string;
};

type FilaPerfil = {
  id: string;
  nombre: string | null;
  correo: string | null;
  foto_path: string | null;
};

function esErrorDeRed(mensaje: string) {
  return /network|fetch|timeout/i.test(mensaje);
}

function mensajeDeCarga(mensaje: string) {
  return esErrorDeRed(mensaje) ? MENSAJES_COMENTARIO.sinConexion : MENSAJES_COMENTARIO.carga;
}

async function urlsDeFotos(rutas: string[]) {
  const urls = new Map<string, string>();
  if (!rutas.length) {
    return urls;
  }
  const { data, error } = await supabase.storage
    .from(BUCKET_AVATARES)
    .createSignedUrls(rutas, DURACION_URL_FOTO);
  if (error || !data) {
    return urls;
  }
  for (const fila of data) {
    if (fila.path && fila.signedUrl && !fila.error) {
      urls.set(fila.path, fila.signedUrl);
    }
  }
  return urls;
}

async function obtenerAutores(usuarioIds: string[]) {
  const autores = new Map<string, AutorComentario>();
  if (!usuarioIds.length) {
    return autores;
  }

  const { data, error } = await supabase
    .from('perfiles')
    .select('id, nombre, correo, foto_path')
    .in('id', usuarioIds);
  if (error) {
    throw new Error(mensajeDeCarga(error.message));
  }

  const perfiles = (data ?? []) as FilaPerfil[];
  const rutas = perfiles.map(perfil => perfil.foto_path).filter((ruta): ruta is string => !!ruta);
  const urls = await urlsDeFotos(rutas).catch(() => new Map<string, string>());

  for (const perfil of perfiles) {
    autores.set(perfil.id, {
      id: perfil.id,
      nombre: perfil.nombre?.trim() || AUTOR_SIN_NOMBRE,
      correo: perfil.correo,
      fotoUrl: perfil.foto_path ? urls.get(perfil.foto_path) ?? null : null,
    });
  }
  return autores;
}

export async function listarComentarios(publicacionId: number): Promise<Comentario[]> {
  try {
    const { data, error } = await supabase
      .from('comentarios')
      .select('id, publicacion_id, usuario_id, texto, creado_en')
      .eq('publicacion_id', publicacionId)
      .order('creado_en', { ascending: false })
      .order('id', { ascending: false })
      .limit(MAXIMO_COMENTARIOS);
    if (error) {
      throw new Error(mensajeDeCarga(error.message));
    }

    const filas = (data ?? []) as FilaComentario[];
    const autores = await obtenerAutores([...new Set(filas.map(fila => fila.usuario_id))]);

    return filas.map(fila => ({
      id: fila.id,
      publicacionId: fila.publicacion_id,
      texto: fila.texto,
      creadoEn: fila.creado_en,
      autor: autores.get(fila.usuario_id) ?? {
        id: fila.usuario_id,
        nombre: AUTOR_SIN_NOMBRE,
        correo: null,
        fotoUrl: null,
      },
    }));
  } catch (error) {
    if (error instanceof Error && Object.values(MENSAJES_COMENTARIO).includes(error.message)) {
      throw error;
    }
    throw new Error(MENSAJES_COMENTARIO.sinConexion);
  }
}

export async function eliminarComentario(
  comentarioId: number,
): Promise<ResultadoEliminacionComentario> {
  try {
    const { data, error } = await supabase
      .from('comentarios')
      .delete()
      .eq('id', comentarioId)
      .select('id');

    if (error) {
      if (error.code === '42501') {
        return { estado: 'error', mensaje: MENSAJES_COMENTARIO.sinPermisos };
      }
      return {
        estado: 'error',
        mensaje: esErrorDeRed(error.message)
          ? MENSAJES_COMENTARIO.sinConexion
          : MENSAJES_COMENTARIO.noEliminado,
      };
    }
    if (!data?.length) {
      return { estado: 'no_existe', mensaje: MENSAJES_COMENTARIO.noExiste };
    }
    return { estado: 'ok' };
  } catch {
    return { estado: 'error', mensaje: MENSAJES_COMENTARIO.sinConexion };
  }
}
