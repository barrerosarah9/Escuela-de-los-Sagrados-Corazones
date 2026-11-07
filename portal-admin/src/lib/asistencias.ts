import { supabase } from './supabase';

const BUCKET_AVATARES = 'avatares';
const DURACION_URL_FOTO = 60 * 60;
const MAXIMO_ASISTENTES = 1000;

export const ASISTENTE_SIN_NOMBRE = 'Usuario sin nombre';

export const MENSAJES_ASISTENCIAS = {
  carga: 'No pudimos cargar los asistentes. Inténtalo de nuevo.',
  sinPermisos: 'Tu cuenta no tiene permisos para ver los asistentes. Vuelve a iniciar sesión.',
  sinConexion: 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
};

export type Asistente = {
  id: string;
  nombre: string;
  correo: string | null;
  fotoUrl: string | null;
  confirmadoEn: string;
};

export type AsistentesConfirmados = {
  total: number;
  asistentes: Asistente[];
};

type PerfilAsistente = {
  nombre: string | null;
  correo: string | null;
  foto_path: string | null;
};

type FilaAsistencia = {
  usuario_id: string;
  creado_en: string;
  perfil: PerfilAsistente | PerfilAsistente[] | null;
};

function esErrorDeRed(mensaje: string) {
  return /network|fetch|timeout/i.test(mensaje);
}

function perfilDe(fila: FilaAsistencia): PerfilAsistente | null {
  return Array.isArray(fila.perfil) ? fila.perfil[0] ?? null : fila.perfil;
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

export async function listarAsistentes(oracionEnVivoId: number): Promise<AsistentesConfirmados> {
  try {
    const { data, error, count } = await supabase
      .from('asistencias')
      .select('usuario_id, creado_en, perfil:perfiles(nombre, correo, foto_path)', {
        count: 'exact',
      })
      .eq('oracion_en_vivo_id', oracionEnVivoId)
      .order('creado_en', { ascending: true })
      .limit(MAXIMO_ASISTENTES);

    if (error) {
      if (error.code === '42501') {
        throw new Error(MENSAJES_ASISTENCIAS.sinPermisos);
      }
      throw new Error(
        esErrorDeRed(error.message) ? MENSAJES_ASISTENCIAS.sinConexion : MENSAJES_ASISTENCIAS.carga,
      );
    }

    const filas = (data ?? []) as FilaAsistencia[];
    const rutas = filas
      .map(fila => perfilDe(fila)?.foto_path)
      .filter((ruta): ruta is string => !!ruta);
    const urls = await urlsDeFotos(rutas).catch(() => new Map<string, string>());

    const asistentes = filas
      .map(fila => {
        const perfil = perfilDe(fila);
        return {
          id: fila.usuario_id,
          nombre: perfil?.nombre?.trim() || ASISTENTE_SIN_NOMBRE,
          correo: perfil?.correo ?? null,
          fotoUrl: perfil?.foto_path ? urls.get(perfil.foto_path) ?? null : null,
          confirmadoEn: fila.creado_en,
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

    return { total: count ?? asistentes.length, asistentes };
  } catch (error) {
    if (error instanceof Error && Object.values(MENSAJES_ASISTENCIAS).includes(error.message)) {
      throw error;
    }
    throw new Error(MENSAJES_ASISTENCIAS.sinConexion);
  }
}
