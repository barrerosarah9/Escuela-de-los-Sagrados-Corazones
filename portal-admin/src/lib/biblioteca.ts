import { supabase } from './supabase';

const BUCKET_CONTENIDOS = 'contenidos';
const DURACION_URL_ARCHIVO = 60 * 60;
const COLUMNAS_ORACION =
  'id, clave, nombre, seccion, es_fija, max_contenidos, dia_semana, orden, contenidos(count)';
const COLUMNAS_CONTENIDO =
  'id, nombre, numero, fecha, pdf_path, youtube_url, imagen_path, actualizado_en';
const PATRON_YOUTUBE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([\w-]{6,})/i;

export const CONTENIDOS_POR_PAGINA = 10;
export const IMAGENES_POR_PAGINA = 12;

export const MENSAJES_BIBLIOTECA = {
  carga: 'No pudimos cargar la biblioteca. Inténtalo de nuevo.',
  cargaContenidos: 'No pudimos cargar los contenidos de esta oración. Inténtalo de nuevo.',
  sinPermisos: 'Tu cuenta no tiene permisos para ver la biblioteca. Vuelve a iniciar sesión.',
  sinConexion: 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
};

export type SeccionBiblioteca = 'dia' | 'semana' | 'mes' | 'anio' | 'widget';
export type FormatoContenido = 'PDF' | 'YouTube' | 'Imagen';

export type OracionBiblioteca = {
  id: number;
  clave: string;
  nombre: string;
  seccion: SeccionBiblioteca;
  esFija: boolean;
  maxContenidos: number | null;
  diaSemana: number | null;
  orden: number;
  totalContenidos: number;
};

export type ContenidoBiblioteca = {
  id: number;
  nombre: string;
  numero: number | null;
  fecha: string | null;
  formatos: FormatoContenido[];
  youtubeUrl: string | null;
  youtubeMiniatura: string | null;
  pdfUrl: string | null;
  imagenUrl: string | null;
  actualizadoEn: string;
};

export type PaginaContenidos = {
  pagina: number;
  totalPaginas: number;
  total: number;
  contenidos: ContenidoBiblioteca[];
};

type FilaOracion = {
  id: number;
  clave: string;
  nombre: string;
  seccion: SeccionBiblioteca;
  es_fija: boolean;
  max_contenidos: number | null;
  dia_semana: number | null;
  orden: number;
  contenidos: { count: number }[] | null;
};

type FilaContenido = {
  id: number;
  nombre: string;
  numero: number | null;
  fecha: string | null;
  pdf_path: string | null;
  youtube_url: string | null;
  imagen_path: string | null;
  actualizado_en: string;
};

function esErrorDeRed(mensaje: string) {
  return /network|fetch|timeout/i.test(mensaje);
}

function errorDeConsulta(codigo: string | undefined, mensaje: string, porDefecto: string) {
  if (codigo === '42501') {
    return new Error(MENSAJES_BIBLIOTECA.sinPermisos);
  }
  return new Error(esErrorDeRed(mensaje) ? MENSAJES_BIBLIOTECA.sinConexion : porDefecto);
}

function relanzar(error: unknown): never {
  if (error instanceof Error && Object.values(MENSAJES_BIBLIOTECA).includes(error.message)) {
    throw error;
  }
  throw new Error(MENSAJES_BIBLIOTECA.sinConexion);
}

export function idDeYouTube(url: string) {
  return url.match(PATRON_YOUTUBE)?.[1] ?? null;
}

export function miniaturaDeYouTube(url: string) {
  const id = idDeYouTube(url);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : null;
}

async function urlsFirmadas(rutas: string[]) {
  const urls = new Map<string, string>();
  if (!rutas.length) {
    return urls;
  }
  const { data, error } = await supabase.storage
    .from(BUCKET_CONTENIDOS)
    .createSignedUrls(rutas, DURACION_URL_ARCHIVO);
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

function formatosDe(fila: FilaContenido): FormatoContenido[] {
  const formatos: FormatoContenido[] = [];
  if (fila.pdf_path) formatos.push('PDF');
  if (fila.youtube_url) formatos.push('YouTube');
  if (fila.imagen_path) formatos.push('Imagen');
  return formatos;
}

export async function listarOracionesBiblioteca(): Promise<OracionBiblioteca[]> {
  try {
    const { data, error } = await supabase
      .from('oraciones')
      .select(COLUMNAS_ORACION)
      .order('seccion', { ascending: true })
      .order('orden', { ascending: true });

    if (error) {
      throw errorDeConsulta(error.code, error.message, MENSAJES_BIBLIOTECA.carga);
    }

    return ((data ?? []) as FilaOracion[]).map(fila => ({
      id: fila.id,
      clave: fila.clave,
      nombre: fila.nombre,
      seccion: fila.seccion,
      esFija: fila.es_fija,
      maxContenidos: fila.max_contenidos,
      diaSemana: fila.dia_semana,
      orden: fila.orden,
      totalContenidos: fila.contenidos?.[0]?.count ?? 0,
    }));
  } catch (error) {
    relanzar(error);
  }
}

export async function listarContenidos(
  oracionId: number,
  pagina = 1,
  porPagina = CONTENIDOS_POR_PAGINA,
): Promise<PaginaContenidos> {
  try {
    const paginaPedida = Math.max(1, Math.floor(pagina));
    const desde = (paginaPedida - 1) * porPagina;
    const { data, error, count } = await supabase
      .from('contenidos')
      .select(COLUMNAS_CONTENIDO, { count: 'exact' })
      .eq('oracion_id', oracionId)
      .order('fecha', { ascending: false, nullsFirst: false })
      .order('numero', { ascending: true, nullsFirst: false })
      .order('creado_en', { ascending: true })
      .range(desde, desde + porPagina - 1);

    if (error) {
      if (error.code === 'PGRST103' && paginaPedida > 1) {
        return listarContenidos(oracionId, 1, porPagina);
      }
      throw errorDeConsulta(error.code, error.message, MENSAJES_BIBLIOTECA.cargaContenidos);
    }

    const filas = (data ?? []) as FilaContenido[];
    const rutas = filas.flatMap(fila =>
      [fila.pdf_path, fila.imagen_path].filter((ruta): ruta is string => !!ruta),
    );
    const urls = await urlsFirmadas(rutas).catch(() => new Map<string, string>());
    const total = count ?? filas.length;

    return {
      pagina: paginaPedida,
      totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
      total,
      contenidos: filas.map(fila => ({
        id: fila.id,
        nombre: fila.nombre,
        numero: fila.numero,
        fecha: fila.fecha,
        formatos: formatosDe(fila),
        youtubeUrl: fila.youtube_url,
        youtubeMiniatura: fila.youtube_url ? miniaturaDeYouTube(fila.youtube_url) : null,
        pdfUrl: fila.pdf_path ? urls.get(fila.pdf_path) ?? null : null,
        imagenUrl: fila.imagen_path ? urls.get(fila.imagen_path) ?? null : null,
        actualizadoEn: fila.actualizado_en,
      })),
    };
  } catch (error) {
    relanzar(error);
  }
}
