import { supabase } from './supabase';

const BUCKET = 'publicaciones';

export const FORMATOS_IMAGEN = ['image/jpeg', 'image/png'];
export const TAMANO_MAXIMO_IMAGEN = 5 * 1024 * 1024;
export const MAXIMO_IMAGENES = 10;

export const MENSAJES_PUBLICACION = {
  vacia: 'Agrega texto o al menos una imagen.',
  formato: 'solo se aceptan imágenes JPG o PNG',
  tamano: 'supera los 5 MB',
  archivoVacio: 'el archivo está vacío',
  demasiadas: `Puedes adjuntar hasta ${MAXIMO_IMAGENES} imágenes por publicación.`,
  sinPermisos: 'Tu cuenta no tiene permisos para publicar. Vuelve a iniciar sesión.',
  sinConexion: 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
  desconocido: 'No pudimos guardar la publicación. Inténtalo de nuevo en unos minutos.',
  carga: 'No pudimos cargar las publicaciones. Recarga la página para intentarlo de nuevo.',
};

export type Publicacion = {
  id: number;
  texto: string;
  imagenes: string[];
  creadoEn: string;
  comentarios: number;
  meGusta: number;
};

export type ResultadoPublicacion =
  | { estado: 'ok'; publicacion: Publicacion }
  | { estado: 'error'; mensaje: string };

type FilaPublicacion = {
  id: number;
  texto: string;
  imagenes: string[];
  creado_en: string;
  total_comentarios?: number | string | null;
  total_me_gusta?: number | string | null;
};

function aPublicacion(fila: FilaPublicacion): Publicacion {
  return {
    id: fila.id,
    texto: fila.texto,
    imagenes: fila.imagenes ?? [],
    creadoEn: fila.creado_en,
    comentarios: Number(fila.total_comentarios ?? 0),
    meGusta: Number(fila.total_me_gusta ?? 0),
  };
}

export function validarImagen(archivo: File): string | null {
  if (!FORMATOS_IMAGEN.includes(archivo.type)) {
    return `${archivo.name}: ${MENSAJES_PUBLICACION.formato}`;
  }
  if (archivo.size === 0) {
    return `${archivo.name}: ${MENSAJES_PUBLICACION.archivoVacio}`;
  }
  if (archivo.size > TAMANO_MAXIMO_IMAGEN) {
    return `${archivo.name}: ${MENSAJES_PUBLICACION.tamano}`;
  }
  return null;
}

export function urlImagen(ruta: string) {
  return supabase.storage.from(BUCKET).getPublicUrl(ruta).data.publicUrl;
}

function rutaNueva(archivo: File) {
  const ahora = new Date();
  const mes = String(ahora.getMonth() + 1).padStart(2, '0');
  const extension = archivo.type === 'image/png' ? 'png' : 'jpg';
  return `${ahora.getFullYear()}/${mes}/${crypto.randomUUID()}.${extension}`;
}

function mensajeDeErrorStorage(error: unknown, nombre: string) {
  const detalle = error as { statusCode?: string | number; status?: number; message?: string };
  const codigo = String(detalle.statusCode ?? detalle.status ?? '');
  const texto = (detalle.message ?? '').toLowerCase();
  if (codigo === '413' || texto.includes('size')) {
    return `${nombre}: ${MENSAJES_PUBLICACION.tamano}`;
  }
  if (codigo === '415' || texto.includes('mime')) {
    return `${nombre}: ${MENSAJES_PUBLICACION.formato}`;
  }
  if (codigo === '403' || codigo === '401' || texto.includes('row-level security')) {
    return MENSAJES_PUBLICACION.sinPermisos;
  }
  if (texto.includes('fetch') || texto.includes('network')) {
    return MENSAJES_PUBLICACION.sinConexion;
  }
  return MENSAJES_PUBLICACION.desconocido;
}

async function borrarImagenes(rutas: string[]) {
  if (rutas.length) {
    await supabase.storage.from(BUCKET).remove(rutas);
  }
}

export async function listarPublicaciones(): Promise<Publicacion[]> {
  const { data, error } = await supabase
    .from('publicaciones_con_conteos')
    .select('id, texto, imagenes, creado_en, total_comentarios, total_me_gusta')
    .order('creado_en', { ascending: false });
  if (error) {
    throw new Error(MENSAJES_PUBLICACION.carga);
  }
  return (data ?? []).map(aPublicacion);
}

export async function crearPublicacion(
  autorId: string,
  texto: string,
  archivos: File[],
): Promise<ResultadoPublicacion> {
  const textoLimpio = texto.trim();

  if (!textoLimpio && !archivos.length) {
    return { estado: 'error', mensaje: MENSAJES_PUBLICACION.vacia };
  }
  if (archivos.length > MAXIMO_IMAGENES) {
    return { estado: 'error', mensaje: MENSAJES_PUBLICACION.demasiadas };
  }
  for (const archivo of archivos) {
    const problema = validarImagen(archivo);
    if (problema) {
      return { estado: 'error', mensaje: problema };
    }
  }

  const subidas: string[] = [];
  try {
    for (const archivo of archivos) {
      const ruta = rutaNueva(archivo);
      const { error } = await supabase.storage.from(BUCKET).upload(ruta, archivo, {
        contentType: archivo.type,
        cacheControl: '31536000',
        upsert: false,
      });
      if (error) {
        await borrarImagenes(subidas);
        return { estado: 'error', mensaje: mensajeDeErrorStorage(error, archivo.name) };
      }
      subidas.push(ruta);
    }

    const { data, error } = await supabase
      .from('publicaciones')
      .insert({ autor_id: autorId, texto: textoLimpio, imagenes: subidas })
      .select('id, texto, imagenes, creado_en')
      .single();

    if (error || !data) {
      await borrarImagenes(subidas);
      if (error?.code === '42501') {
        return { estado: 'error', mensaje: MENSAJES_PUBLICACION.sinPermisos };
      }
      if (error?.code === '23514') {
        return { estado: 'error', mensaje: MENSAJES_PUBLICACION.vacia };
      }
      return { estado: 'error', mensaje: MENSAJES_PUBLICACION.desconocido };
    }

    return { estado: 'ok', publicacion: aPublicacion(data) };
  } catch {
    await borrarImagenes(subidas).catch(() => undefined);
    return { estado: 'error', mensaje: MENSAJES_PUBLICACION.sinConexion };
  }
}