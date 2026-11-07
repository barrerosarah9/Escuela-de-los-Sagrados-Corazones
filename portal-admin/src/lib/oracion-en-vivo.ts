import { supabase } from './supabase';

const TABLA = 'oraciones_en_vivo';
const COLUMNAS = 'id, fecha, hora, titulo, enlace_meet';
const DESFASE_BOGOTA_MINUTOS = -5 * 60;
const MILISEGUNDOS_POR_MINUTO = 60_000;
const MILISEGUNDOS_POR_DIA = 86_400_000;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PATRON_HORA = /^([01]\d|2[0-3]):[0-5]\d/;
const PATRON_CODIGO_MEET = /^[a-z]{3}-[a-z]{4}-[a-z]{3}$/;

export const LARGO_MAXIMO_TITULO = 120;
export const HORA_PREDETERMINADA = '19:45';

export const MENSAJES_ORACION_EN_VIVO = {
  tituloVacio: 'Escribe un título para la oración.',
  tituloLargo: `El título puede tener hasta ${LARGO_MAXIMO_TITULO} caracteres.`,
  fechaVacia: 'Elige la fecha de la oración.',
  fechaPasada: 'La fecha ya pasó; elige hoy o una fecha futura.',
  horaVacia: 'Elige la hora de la oración.',
  enlaceVacio: 'Pega el enlace de Google Meet.',
  enlaceInvalido:
    'Ingresa un enlace válido de Google Meet, por ejemplo https://meet.google.com/abc-defg-hij.',
  yaExiste: 'Ya hay una oración en vivo programada para ese día. Puedes editarla.',
  noExiste: 'Esta oración ya no existe. Recarga la página para ver la semana actualizada.',
  sinPermisos: 'Tu cuenta no tiene permisos para programar oraciones. Vuelve a iniciar sesión.',
  sinConexion: 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
  carga: 'No pudimos cargar las oraciones en vivo. Recarga la página para intentarlo de nuevo.',
  desconocido: 'No pudimos guardar la oración. Inténtalo de nuevo en unos minutos.',
};

export type OracionEnVivo = {
  id: number;
  fecha: string;
  hora: string;
  titulo: string;
  enlaceMeet: string;
};

export type DatosOracionEnVivo = {
  fecha: string;
  hora: string;
  titulo: string;
  enlaceMeet: string;
};

export type ErroresOracionEnVivo = Partial<Record<keyof DatosOracionEnVivo, string>>;

export type ResultadoGuardado =
  | { estado: 'ok'; oracion: OracionEnVivo; creada: boolean }
  | { estado: 'invalida'; errores: ErroresOracionEnVivo }
  | { estado: 'ya_existe'; oracion: OracionEnVivo; mensaje: string }
  | { estado: 'no_existe'; mensaje: string }
  | { estado: 'error'; mensaje: string };

type FilaOracionEnVivo = {
  id: number;
  fecha: string;
  hora: string;
  titulo: string;
  enlace_meet: string;
};

type FilaOficio = {
  nombre: string;
  dia_semana: number;
};

type ErrorDeSupabase = {
  code?: string;
  message: string;
};

function aOracion(fila: FilaOracionEnVivo): OracionEnVivo {
  return {
    id: fila.id,
    fecha: fila.fecha,
    hora: fila.hora.slice(0, 5),
    titulo: fila.titulo,
    enlaceMeet: fila.enlace_meet,
  };
}

function esErrorDeRed(mensaje: string) {
  return /network|fetch|timeout/i.test(mensaje);
}

function mensajeDeCarga(mensaje: string) {
  return esErrorDeRed(mensaje) ? MENSAJES_ORACION_EN_VIVO.sinConexion : MENSAJES_ORACION_EN_VIVO.carga;
}

function mensajeDeGuardado(error: ErrorDeSupabase) {
  if (error.code === '42501') return MENSAJES_ORACION_EN_VIVO.sinPermisos;
  if (esErrorDeRed(error.message)) return MENSAJES_ORACION_EN_VIVO.sinConexion;
  return MENSAJES_ORACION_EN_VIVO.desconocido;
}

function aFechaUtc(fecha: string) {
  return new Date(`${fecha}T00:00:00Z`);
}

export function fechaDeHoyEnBogota(ahora: Date = new Date()) {
  return new Date(ahora.getTime() + DESFASE_BOGOTA_MINUTOS * MILISEGUNDOS_POR_MINUTO)
    .toISOString()
    .slice(0, 10);
}

export function esFechaValida(fecha: string) {
  if (!PATRON_FECHA.test(fecha)) return false;
  const dia = aFechaUtc(fecha);
  return !Number.isNaN(dia.getTime()) && dia.toISOString().slice(0, 10) === fecha;
}

export function diaSemanaIso(fecha: string) {
  const dia = aFechaUtc(fecha).getUTCDay();
  return dia === 0 ? 7 : dia;
}

export function sumarDias(fecha: string, dias: number) {
  return new Date(aFechaUtc(fecha).getTime() + dias * MILISEGUNDOS_POR_DIA).toISOString().slice(0, 10);
}

export function lunesDeLaSemana(fecha: string) {
  return sumarDias(fecha, 1 - diaSemanaIso(fecha));
}

export function diasDeLaSemana(lunes: string) {
  return Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
}

export function tituloSugerido(fecha: string, oficios: Record<number, string>) {
  return esFechaValida(fecha) ? (oficios[diaSemanaIso(fecha)] ?? '') : '';
}

export function normalizarEnlaceMeet(enlace: string): string | null {
  const texto = enlace.trim();
  if (!texto) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(texto) ? texto : `https://${texto}`);
  } catch {
    return null;
  }
  if (url.hostname.toLowerCase() !== 'meet.google.com') return null;
  const codigo = url.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
  return PATRON_CODIGO_MEET.test(codigo) ? `https://meet.google.com/${codigo}` : null;
}

export function validarOracionEnVivo(
  datos: DatosOracionEnVivo,
  hoy: string = fechaDeHoyEnBogota(),
): ErroresOracionEnVivo {
  const errores: ErroresOracionEnVivo = {};
  const titulo = datos.titulo.trim();
  if (!titulo) errores.titulo = MENSAJES_ORACION_EN_VIVO.tituloVacio;
  else if (titulo.length > LARGO_MAXIMO_TITULO) errores.titulo = MENSAJES_ORACION_EN_VIVO.tituloLargo;
  if (!esFechaValida(datos.fecha)) errores.fecha = MENSAJES_ORACION_EN_VIVO.fechaVacia;
  else if (datos.fecha < hoy) errores.fecha = MENSAJES_ORACION_EN_VIVO.fechaPasada;
  if (!PATRON_HORA.test(datos.hora)) errores.hora = MENSAJES_ORACION_EN_VIVO.horaVacia;
  if (!datos.enlaceMeet.trim()) errores.enlaceMeet = MENSAJES_ORACION_EN_VIVO.enlaceVacio;
  else if (!normalizarEnlaceMeet(datos.enlaceMeet)) errores.enlaceMeet = MENSAJES_ORACION_EN_VIVO.enlaceInvalido;
  return errores;
}

export function tieneErrores(errores: ErroresOracionEnVivo) {
  return Object.keys(errores).length > 0;
}

export async function listarOficiosDeLaSemana(): Promise<Record<number, string>> {
  const { data, error } = await supabase
    .from('oraciones')
    .select('nombre, dia_semana')
    .eq('seccion', 'semana')
    .order('dia_semana');
  if (error) throw new Error(mensajeDeCarga(error.message));
  return Object.fromEntries(((data ?? []) as FilaOficio[]).map(fila => [fila.dia_semana, fila.nombre]));
}

export async function listarOracionesEnVivo(desde: string, hasta: string): Promise<OracionEnVivo[]> {
  const { data, error } = await supabase
    .from(TABLA)
    .select(COLUMNAS)
    .gte('fecha', desde)
    .lte('fecha', hasta)
    .order('fecha');
  if (error) throw new Error(mensajeDeCarga(error.message));
  return ((data ?? []) as FilaOracionEnVivo[]).map(aOracion);
}

export async function buscarOracionPorFecha(fecha: string): Promise<OracionEnVivo | null> {
  const { data, error } = await supabase.from(TABLA).select(COLUMNAS).eq('fecha', fecha).maybeSingle();
  if (error) throw new Error(mensajeDeCarga(error.message));
  return data ? aOracion(data as FilaOracionEnVivo) : null;
}

export async function guardarOracionEnVivo(
  datos: DatosOracionEnVivo,
  adminId: string,
  id: number | null,
): Promise<ResultadoGuardado> {
  const errores = validarOracionEnVivo(datos);
  if (tieneErrores(errores)) return { estado: 'invalida', errores };

  const fila = {
    fecha: datos.fecha,
    hora: datos.hora.slice(0, 5),
    titulo: datos.titulo.trim(),
    enlace_meet: normalizarEnlaceMeet(datos.enlaceMeet) as string,
  };

  const { data, error } =
    id === null
      ? await supabase.from(TABLA).insert({ ...fila, creado_por: adminId }).select(COLUMNAS).single()
      : await supabase.from(TABLA).update(fila).eq('id', id).select(COLUMNAS).maybeSingle();

  if (error) {
    if (error.code === '23505') {
      const existente = await buscarOracionPorFecha(datos.fecha).catch(() => null);
      return existente
        ? { estado: 'ya_existe', oracion: existente, mensaje: MENSAJES_ORACION_EN_VIVO.yaExiste }
        : { estado: 'error', mensaje: MENSAJES_ORACION_EN_VIVO.desconocido };
    }
    if (error.code === '23514') {
      return { estado: 'invalida', errores: { enlaceMeet: MENSAJES_ORACION_EN_VIVO.enlaceInvalido } };
    }
    return { estado: 'error', mensaje: mensajeDeGuardado(error) };
  }

  if (!data) return { estado: 'no_existe', mensaje: MENSAJES_ORACION_EN_VIVO.noExiste };
  return { estado: 'ok', oracion: aOracion(data as FilaOracionEnVivo), creada: id === null };
}
