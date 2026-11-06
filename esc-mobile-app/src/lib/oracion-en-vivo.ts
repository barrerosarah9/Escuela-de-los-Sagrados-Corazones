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

export function estaEnCurso(oracion: OracionEnVivo, ahora: Date = new Date()) {
  const reloj = relojDeBogota(ahora);
  if (reloj.toISOString().slice(0, 10) !== oracion.fecha) return false;
  const actual = reloj.getUTCHours() * 60 + reloj.getUTCMinutes();
  const inicio = minutosDelDia(oracion.hora);
  return actual >= inicio && actual <= inicio + DURACION_EN_CURSO_MINUTOS;
}

export async function obtenerOracionEnVivoDeHoy(): Promise<OracionEnVivo | null> {
  const fecha = fechaDeHoyEnBogota();

  const [enVivo, oficio] = await Promise.all([
    supabase
      .from('oraciones_en_vivo')
      .select('id, fecha, hora, titulo, enlace_meet')
      .eq('fecha', fecha)
      .maybeSingle(),
    supabase
      .from('oraciones')
      .select('nombre')
      .eq('seccion', 'semana')
      .eq('dia_semana', diaSemanaIso(fecha))
      .maybeSingle(),
  ]);

  if (enVivo.error) throw new Error(enVivo.error.message);
  if (!enVivo.data) return null;

  const fila = enVivo.data as FilaOracionEnVivo;
  const nombreOficio = (oficio.data as { nombre: string } | null)?.nombre;

  return {
    id: fila.id,
    fecha: fila.fecha,
    hora: fila.hora,
    titulo: nombreOficio ?? fila.titulo,
    enlaceMeet: fila.enlace_meet,
  };
}
