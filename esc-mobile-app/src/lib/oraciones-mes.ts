import type Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { TonoOpcion } from '../components/opcion-oracion';
import { fechaHoyBogota } from './perfil';

export type DiaDelMes = 'jueves' | 'viernes' | 'sabado';

export type OficioDelMes = {
  dia: DiaDelMes;
  diaIso: number;
  titulo: string;
  claves: string[];
  icono: ComponentProps<typeof Ionicons>['name'];
  tono: TonoOpcion;
};

export const OFICIOS_DEL_MES: OficioDelMes[] = [
  {
    dia: 'jueves',
    diaIso: 4,
    titulo: 'Primer jueves del mes',
    claves: ['primer-jueves'],
    icono: 'calendar-outline',
    tono: 'azul',
  },
  {
    dia: 'viernes',
    diaIso: 5,
    titulo: 'Primer viernes del mes',
    claves: ['primeros-viernes-diurnos', 'vigilias-reparacion'],
    icono: 'heart-outline',
    tono: 'rojo',
  },
  {
    dia: 'sabado',
    diaIso: 6,
    titulo: 'Primer sábado del mes',
    claves: ['primer-sabado'],
    icono: 'flower-outline',
    tono: 'amarillo',
  },
];

const NOMBRES_DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

const NOMBRES_MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

export function oficioDelMes(dia: unknown) {
  return OFICIOS_DEL_MES.find((oficio) => oficio.dia === dia) ?? null;
}

function primerDiaDelMes(anio: number, mes: number, diaIso: number) {
  const primero = new Date(Date.UTC(anio, mes, 1));
  const isoPrimero = primero.getUTCDay() === 0 ? 7 : primero.getUTCDay();
  const desfase = (diaIso - isoPrimero + 7) % 7;
  return new Date(Date.UTC(anio, mes, 1 + desfase)).toISOString().slice(0, 10);
}

export function disponibilidadDelMes(diaIso: number, hoy = fechaHoyBogota()) {
  const anio = Number(hoy.slice(0, 4));
  const mes = Number(hoy.slice(5, 7)) - 1;
  const esteMes = primerDiaDelMes(anio, mes, diaIso);
  const siguiente = esteMes >= hoy ? esteMes : primerDiaDelMes(anio, mes + 1, diaIso);
  return { disponible: esteMes === hoy, siguiente };
}

export function fechaLarga(fecha: string) {
  const dia = new Date(`${fecha}T12:00:00Z`);
  return `${NOMBRES_DIAS[dia.getUTCDay()]} ${dia.getUTCDate()} de ${NOMBRES_MESES[dia.getUTCMonth()]}`;
}
