import { router } from 'expo-router';
import { fechaHoyBogota } from './perfil';

export type ClaveSeccion = 'dia' | 'semana' | 'mes';

export type DiaDeHoy = {
  nombre: string;
  oficio: string;
};

const CLAVES_SECCION: readonly string[] = ['dia', 'semana', 'mes'];

const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const OFICIOS_DEL_DIA = [
  '7 Dolores y Gozos de San José',
  'Oración a las almas del purgatorio',
  'Oración a los Santos Ángeles',
  'Lirios de San José',
  'Hora Santa',
  'Viacrucis',
  'Hora de María',
];

export const ETIQUETAS_SECCION: Record<ClaveSeccion, string> = {
  dia: 'Cada día',
  semana: 'Cada semana',
  mes: 'Cada mes',
};

export const DESCRIPCION_DIA = 'Las oraciones de la jornada, disponibles durante todo el día.';

export const DESCRIPCION_MES =
  'Santifica tu mes con los oficios que Nuestro Señor nos pide hacer cada primer jueves, viernes y sábado.';

export function diaDeHoy(fecha = fechaHoyBogota()): DiaDeHoy {
  const indice = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  return { nombre: NOMBRES_DIAS[indice], oficio: OFICIOS_DEL_DIA[indice] };
}

export function esClaveSeccion(valor: unknown): valor is ClaveSeccion {
  return typeof valor === 'string' && CLAVES_SECCION.includes(valor);
}

export function tituloSeccion(clave: ClaveSeccion, dia: DiaDeHoy) {
  if (clave === 'dia') return 'Santifica el día';
  if (clave === 'semana') return `Santifica tu ${dia.nombre}`;
  return 'Santifica tu mes';
}

export function descripcionSeccion(clave: ClaveSeccion, dia: DiaDeHoy) {
  if (clave === 'dia') return DESCRIPCION_DIA;
  if (clave === 'semana') return dia.oficio;
  return DESCRIPCION_MES;
}

export function abrirSeccion(clave: ClaveSeccion) {
  router.push({ pathname: '/seccion/[clave]', params: { clave } });
}
