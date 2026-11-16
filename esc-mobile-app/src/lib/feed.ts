import { registrarMeGustaDelServidor } from './me-gusta';
import { supabase } from './supabase';

export const BUCKET_PUBLICACIONES = 'publicaciones';
export const TAMANO_PAGINA = 10;

const COLUMNAS =
  'id, texto, imagenes, creado_en, total_comentarios, total_me_gusta, me_gusta_propio';

export type Publicacion = {
  id: number;
  texto: string;
  imagenes: string[];
  creadoEn: string;
  totalComentarios: number;
  totalMeGusta: number;
  meGustaPropio: boolean;
};

export type CursorFeed = {
  creadoEn: string;
  id: number;
};

export type PaginaFeed = {
  publicaciones: Publicacion[];
  siguiente: CursorFeed | null;
};

export type MotivoErrorFeed = 'sin_conexion' | 'desconocido';

export class ErrorFeed extends Error {
  motivo: MotivoErrorFeed;

  constructor(motivo: MotivoErrorFeed, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorFeed';
    this.motivo = motivo;
  }
}

type FilaPublicacion = {
  id: number;
  texto: string | null;
  imagenes: string[] | null;
  creado_en: string;
  total_comentarios: number | string | null;
  total_me_gusta: number | string | null;
  me_gusta_propio: boolean | null;
};

function aPublicacion(fila: FilaPublicacion): Publicacion {
  return {
    id: fila.id,
    texto: fila.texto ?? '',
    imagenes: fila.imagenes ?? [],
    creadoEn: fila.creado_en,
    totalComentarios: Number(fila.total_comentarios ?? 0),
    totalMeGusta: Number(fila.total_me_gusta ?? 0),
    meGustaPropio: fila.me_gusta_propio ?? false,
  };
}

function registrarMeGusta(publicaciones: Publicacion[]) {
  registrarMeGustaDelServidor(
    publicaciones.map((publicacion) => ({
      id: publicacion.id,
      marcado: publicacion.meGustaPropio,
      total: publicacion.totalMeGusta,
    })),
  );
}

function esErrorDeRed(mensaje: string) {
  return /network|fetch|timeout/i.test(mensaje);
}

export function urlImagenPublicacion(ruta: string) {
  return supabase.storage.from(BUCKET_PUBLICACIONES).getPublicUrl(ruta).data.publicUrl;
}

export async function obtenerPaginaFeed(cursor: CursorFeed | null = null): Promise<PaginaFeed> {
  let consulta = supabase
    .from('publicaciones_con_conteos')
    .select(COLUMNAS)
    .order('creado_en', { ascending: false })
    .order('id', { ascending: false })
    .limit(TAMANO_PAGINA + 1);

  if (cursor) {
    consulta = consulta.or(
      `creado_en.lt."${cursor.creadoEn}",and(creado_en.eq."${cursor.creadoEn}",id.lt.${cursor.id})`,
    );
  }

  const { data, error } = await consulta;

  if (error) {
    throw new ErrorFeed(
      esErrorDeRed(error.message) ? 'sin_conexion' : 'desconocido',
      error.message,
    );
  }

  const filas = (data ?? []) as FilaPublicacion[];
  const hayMas = filas.length > TAMANO_PAGINA;
  const publicaciones = filas.slice(0, TAMANO_PAGINA).map(aPublicacion);
  registrarMeGusta(publicaciones);
  const ultima = publicaciones.at(-1);

  return {
    publicaciones,
    siguiente: hayMas && ultima ? { creadoEn: ultima.creadoEn, id: ultima.id } : null,
  };
}

export async function obtenerPublicacion(id: number): Promise<Publicacion | null> {
  const { data, error } = await supabase
    .from('publicaciones_con_conteos')
    .select(COLUMNAS)
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw new ErrorFeed(
      esErrorDeRed(error.message) ? 'sin_conexion' : 'desconocido',
      error.message,
    );
  }

  if (!data) return null;
  const publicacion = aPublicacion(data as FilaPublicacion);
  registrarMeGusta([publicacion]);
  return publicacion;
}
