import { supabase } from './supabase';

export const DURACION_EN_CURSO_MINUTOS = 105;

const DESFASE_BOGOTA_MINUTOS = -5 * 60;
const MILISEGUNDOS_POR_MINUTO = 60_000;

export type OracionEnVivo = {
  id: number;
  fecha: string;
  hora: string;
  titulo: string;
  enlaceMeet: string;
  oficioDeManana: string | null;
};

export type EstadoOracionEnVivo = 'proxima' | 'en_curso' | 'terminada';

type FilaOficio = {
  clave: string;
  nombre: string;
  dia_semana: number;
};

const ARTICULO_POR_OFICIO: Record<string, string> = {
  'almas-purgatorio': 'la',
  'santos-angeles': 'la',
  'lirios-san-jose': 'los',
  'hora-santa': 'la',
  viacrucis: 'el',
  'hora-maria': 'la',
  'dolores-gozos-san-jose': 'los',
};

type FilaOracionEnVivo = {
  id: number;
  fecha: string;
  hora: string;
  titulo: string;
  enlace_meet: string;
};

function relojDeBogota(ahora: Date) {
  return new Date(ahora.getTime() + DESFASE_BOGOTA_MINUTOS * MILISEGUNDOS_POR_MINUTO);
}

export function fechaDeHoyEnBogota(ahora: Date = new Date()) {
  return relojDeBogota(ahora).toISOString().slice(0, 10);
}

function diaSemanaIso(fecha: string) {
  const dia = new Date(`${fecha}T00:00:00Z`).getUTCDay();
  return dia === 0 ? 7 : dia;
}

function diaSiguienteIso(dia: number) {
  return (dia % 7) + 1;
}

function conArticulo(oficio: FilaOficio) {
  const articulo = ARTICULO_POR_OFICIO[oficio.clave];
  return articulo ? `${articulo} ${oficio.nombre}` : oficio.nombre;
}

function minutosDelDia(hora: string) {
  const [horas, minutos] = hora.split(':').map(Number);
  return horas * 60 + minutos;
}

export function formatearHora(hora: string) {
  const total = minutosDelDia(hora);
  const horas = Math.floor(total / 60);
  const minutos = total % 60;
  const horas12 = horas % 12 === 0 ? 12 : horas % 12;
  const sufijo = horas < 12 ? 'a. m.' : 'p. m.';
  return `${horas12}:${String(minutos).padStart(2, '0')} ${sufijo}`;
}

export function estadoDeOracion(
  oracion: OracionEnVivo,
  ahora: Date = new Date(),
): EstadoOracionEnVivo {
  const reloj = relojDeBogota(ahora);
  const hoy = reloj.toISOString().slice(0, 10);
  if (hoy < oracion.fecha) return 'proxima';
  if (hoy > oracion.fecha) return 'terminada';
  const actual = reloj.getUTCHours() * 60 + reloj.getUTCMinutes();
  const inicio = minutosDelDia(oracion.hora);
  if (actual < inicio) return 'proxima';
  if (actual <= inicio + DURACION_EN_CURSO_MINUTOS) return 'en_curso';
  return 'terminada';
}

export async function obtenerOracionEnVivoDeHoy(): Promise<OracionEnVivo | null> {
  const fecha = fechaDeHoyEnBogota();
  const diaHoy = diaSemanaIso(fecha);
  const diaManana = diaSiguienteIso(diaHoy);

  const [enVivo, oficios] = await Promise.all([
    supabase
      .from('oraciones_en_vivo')
      .select('id, fecha, hora, titulo, enlace_meet')
      .eq('fecha', fecha)
      .maybeSingle(),
    supabase
      .from('oraciones')
      .select('clave, nombre, dia_semana')
      .eq('seccion', 'semana')
      .in('dia_semana', [diaHoy, diaManana]),
  ]);

  if (enVivo.error) throw new Error(enVivo.error.message);
  if (!enVivo.data) return null;

  const fila = enVivo.data as FilaOracionEnVivo;
  const filasOficio = (oficios.data ?? []) as FilaOficio[];
  const oficioHoy = filasOficio.find((oficio) => oficio.dia_semana === diaHoy);
  const oficioManana = filasOficio.find((oficio) => oficio.dia_semana === diaManana);

  return {
    id: fila.id,
    fecha: fila.fecha,
    hora: fila.hora,
    titulo: oficioHoy?.nombre ?? fila.titulo,
    enlaceMeet: fila.enlace_meet,
    oficioDeManana: oficioManana ? conArticulo(oficioManana) : null,
  };
}
