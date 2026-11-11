import { fechaHoyBogota } from './perfil';
import { supabase } from './supabase';

export type MotivoErrorOraciones = 'sin_conexion' | 'desconocido';

export class ErrorOraciones extends Error {
  motivo: MotivoErrorOraciones;

  constructor(motivo: MotivoErrorOraciones, mensaje: string) {
    super(mensaje);
    this.name = 'ErrorOraciones';
    this.motivo = motivo;
  }
}

export type SeccionCatalogo = 'dia' | 'semana' | 'mes' | 'anio' | 'widget';

export type OracionCatalogo = {
  id: number;
  clave: string;
  nombre: string;
  seccion: SeccionCatalogo;
  es_fija: boolean;
  dia_semana: number | null;
  orden: number;
};

export type ContenidoOracion = {
  id: number;
  oracion_id: number;
  nombre: string;
  numero: number | null;
  fecha: string | null;
  pdf_path: string | null;
  youtube_url: string | null;
  imagen_path: string | null;
};

const COLUMNAS_ORACION = 'id, clave, nombre, seccion, es_fija, dia_semana, orden';
const COLUMNAS_CONTENIDO =
  'id, oracion_id, nombre, numero, fecha, pdf_path, youtube_url, imagen_path';

function errorDe(error: { message: string }) {
  return new ErrorOraciones(
    /network|fetch|timeout/i.test(error.message) ? 'sin_conexion' : 'desconocido',
    error.message,
  );
}

export function motivoDe(error: unknown): MotivoErrorOraciones {
  return error instanceof ErrorOraciones ? error.motivo : 'desconocido';
}

export function diaSemanaIso(fecha = fechaHoyBogota()) {
  const dia = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return dia === 0 ? 7 : dia;
}

export async function obtenerOracionesDeSeccion(seccion: SeccionCatalogo) {
  const { data, error } = await supabase
    .from('oraciones')
    .select(COLUMNAS_ORACION)
    .eq('seccion', seccion)
    .order('orden');
  if (error) throw errorDe(error);
  return (data ?? []) as OracionCatalogo[];
}

export async function obtenerOracionesPorClave(claves: string[]) {
  const { data, error } = await supabase
    .from('oraciones')
    .select(COLUMNAS_ORACION)
    .in('clave', claves)
    .order('orden');
  if (error) throw errorDe(error);
  return (data ?? []) as OracionCatalogo[];
}

export async function obtenerAsignacionesDeHoy() {
  const asignaciones = new Map<number, number>();
  const { data: dia, error } = await supabase
    .from('calendario_dias')
    .select('fecha')
    .eq('vigente', true)
    .maybeSingle();
  if (error) throw errorDe(error);
  if (!dia) return asignaciones;

  const [diarias, oficios] = await Promise.all([
    supabase
      .from('calendario_contenidos')
      .select('oracion_id, contenido_id')
      .eq('fecha', dia.fecha),
    supabase.from('asignaciones_oficios').select('oracion_id, contenido_id').eq('fecha', dia.fecha),
  ]);
  if (diarias.error) throw errorDe(diarias.error);
  if (oficios.error) throw errorDe(oficios.error);

  for (const fila of [...(diarias.data ?? []), ...(oficios.data ?? [])]) {
    asignaciones.set(fila.oracion_id as number, fila.contenido_id as number);
  }
  return asignaciones;
}

export async function obtenerContenidosDeOraciones(oracionIds: number[]) {
  if (oracionIds.length === 0) return [];
  const { data, error } = await supabase
    .from('contenidos')
    .select(COLUMNAS_CONTENIDO)
    .in('oracion_id', oracionIds)
    .order('numero', { ascending: true, nullsFirst: false })
    .order('creado_en', { ascending: true });
  if (error) throw errorDe(error);
  return (data ?? []) as ContenidoOracion[];
}

export async function obtenerContenidosPorId(ids: number[]) {
  if (ids.length === 0) return [];
  const { data, error } = await supabase
    .from('contenidos')
    .select(COLUMNAS_CONTENIDO)
    .in('id', ids)
    .order('creado_en', { ascending: true });
  if (error) throw errorDe(error);
  return (data ?? []) as ContenidoOracion[];
}

export function ordenarConHabilitadoPrimero(
  contenidos: ContenidoOracion[],
  habilitadoId: number | undefined,
) {
  const habilitado = contenidos.filter((contenido) => contenido.id === habilitadoId);
  const resto = contenidos.filter((contenido) => contenido.id !== habilitadoId);
  return [...habilitado, ...resto];
}

export function numeroDeVariante(contenido: ContenidoOracion, posicion: number) {
  return String(contenido.numero ?? posicion + 1).padStart(2, '0');
}

export function formatosDe(contenidos: ContenidoOracion[]) {
  const video = contenidos.some((contenido) => contenido.youtube_url);
  const pdf = contenidos.some((contenido) => contenido.pdf_path);
  const imagen = contenidos.some((contenido) => contenido.imagen_path);
  if (video && pdf) return 'Video y guía de oración';
  if (video) return 'Video de oración';
  if (pdf) return 'Guía de oración en PDF';
  if (imagen) return 'Imagen de oración';
  return 'Aún sin contenido para hoy';
}
