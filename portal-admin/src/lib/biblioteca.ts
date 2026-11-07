import { supabase } from './supabase';

export const BUCKET_IMAGENES = 'contenidos-imagenes';
export const BUCKET_PDF = 'contenidos-pdf';
const DURACION_URL_ARCHIVO = 60 * 60;
const COLUMNAS_ORACION =
  'id, clave, nombre, seccion, es_fija, max_contenidos, dia_semana, orden, contenidos(count)';
const COLUMNAS_CONTENIDO =
  'id, nombre, numero, fecha, pdf_path, youtube_url, imagen_path, actualizado_en';
const PATRON_YOUTUBE =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|live\/|embed\/)|youtu\.be\/)([\w-]{6,})/i;

export const CONTENIDOS_POR_PAGINA = 10;
export const IMAGENES_POR_PAGINA = 12;
export const RESULTADOS_POR_PAGINA = 10;
export const LARGO_MAXIMO_BUSQUEDA = 80;

export const MENSAJES_BIBLIOTECA = {
  carga: 'No pudimos cargar la biblioteca. Inténtalo de nuevo.',
  cargaContenidos: 'No pudimos cargar los contenidos de esta oración. Inténtalo de nuevo.',
  busqueda: 'No pudimos buscar en la biblioteca. Inténtalo de nuevo.',
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

export type ResultadoBusqueda = ContenidoBiblioteca & {
  oracionId: number;
  seccion: SeccionBiblioteca;
};

export type PaginaResultados = {
  pagina: number;
  totalPaginas: number;
  total: number;
  resultados: ResultadoBusqueda[];
};

export type FiltrosBusqueda = {
  texto: string;
  seccion: SeccionBiblioteca | null;
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
  oracion_id?: number;
  seccion?: SeccionBiblioteca;
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

async function urlsFirmadas(bucket: string, rutas: string[]) {
  const urls = new Map<string, string>();
  if (!rutas.length) {
    return urls;
  }
  const { data, error } = await supabase.storage
    .from(bucket)
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

function contenidoDe(
  fila: FilaContenido,
  urls: { pdf: Map<string, string>; imagenes: Map<string, string> },
): ContenidoBiblioteca {
  return {
    id: fila.id,
    nombre: fila.nombre,
    numero: fila.numero,
    fecha: fila.fecha,
    formatos: formatosDe(fila),
    youtubeUrl: fila.youtube_url,
    youtubeMiniatura: fila.youtube_url ? miniaturaDeYouTube(fila.youtube_url) : null,
    pdfUrl: fila.pdf_path ? urls.pdf.get(fila.pdf_path) ?? null : null,
    imagenUrl: fila.imagen_path ? urls.imagenes.get(fila.imagen_path) ?? null : null,
    actualizadoEn: fila.actualizado_en,
  };
}

async function urlsDeFilas(filas: FilaContenido[]) {
  const rutasPdf = filas.map(fila => fila.pdf_path).filter((ruta): ruta is string => !!ruta);
  const rutasImagen = filas
    .map(fila => fila.imagen_path)
    .filter((ruta): ruta is string => !!ruta);
  const vacio = () => new Map<string, string>();
  const [pdf, imagenes] = await Promise.all([
    urlsFirmadas(BUCKET_PDF, rutasPdf).catch(vacio),
    urlsFirmadas(BUCKET_IMAGENES, rutasImagen).catch(vacio),
  ]);
  return { pdf, imagenes };
}

export function normalizarBusqueda(texto: string) {
  return texto.replace(/\s+/g, ' ').trim().slice(0, LARGO_MAXIMO_BUSQUEDA);
}

function patronDeBusqueda(texto: string) {
  return `%${texto.replace(/[\\%_]/g, caracter => `\\${caracter}`)}%`;
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
      .order('id', { ascending: true })
      .range(desde, desde + porPagina - 1);

    if (error) {
      if (error.code === 'PGRST103' && paginaPedida > 1) {
        return listarContenidos(oracionId, 1, porPagina);
      }
      throw errorDeConsulta(error.code, error.message, MENSAJES_BIBLIOTECA.cargaContenidos);
    }

    const filas = (data ?? []) as FilaContenido[];
    const urls = await urlsDeFilas(filas);
    const total = count ?? filas.length;

    return {
      pagina: paginaPedida,
      totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
      total,
      contenidos: filas.map(fila => contenidoDe(fila, urls)),
    };
  } catch (error) {
    relanzar(error);
  }
}

export async function buscarContenidos(
  filtros: FiltrosBusqueda,
  pagina = 1,
  porPagina = RESULTADOS_POR_PAGINA,
): Promise<PaginaResultados> {
  try {
    const texto = normalizarBusqueda(filtros.texto);
    const paginaPedida = Math.max(1, Math.floor(pagina));
    const desde = (paginaPedida - 1) * porPagina;
    let consulta = supabase
      .from('contenidos')
      .select(`oracion_id, seccion, ${COLUMNAS_CONTENIDO}`, { count: 'exact' });

    if (texto) {
      consulta = consulta.ilike('nombre', patronDeBusqueda(texto));
    }
    if (filtros.seccion) {
      consulta = consulta.eq('seccion', filtros.seccion);
    }

    const { data, error, count } = await consulta
      .order('seccion', { ascending: true })
      .order('oracion_id', { ascending: true })
      .order('fecha', { ascending: false, nullsFirst: false })
      .order('numero', { ascending: true, nullsFirst: false })
      .order('creado_en', { ascending: true })
      .order('id', { ascending: true })
      .range(desde, desde + porPagina - 1);

    if (error) {
      if (error.code === 'PGRST103' && paginaPedida > 1) {
        return buscarContenidos(filtros, 1, porPagina);
      }
      throw errorDeConsulta(error.code, error.message, MENSAJES_BIBLIOTECA.busqueda);
    }

    const filas = (data ?? []) as FilaContenido[];
    const urls = await urlsDeFilas(filas);
    const total = count ?? filas.length;

    return {
      pagina: paginaPedida,
      totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
      total,
      resultados: filas.map(fila => ({
        ...contenidoDe(fila, urls),
        oracionId: fila.oracion_id ?? 0,
        seccion: fila.seccion ?? 'dia',
      })),
    };
  } catch (error) {
    relanzar(error);
  }
}
