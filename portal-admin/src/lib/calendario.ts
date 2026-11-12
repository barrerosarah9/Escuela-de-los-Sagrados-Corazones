import { supabase } from './supabase';
import { BUCKET_IMAGENES, type FormatoContenido } from './biblioteca';
import {
  diaSemanaIso,
  esFechaValida,
  fechaDeHoyEnBogota,
  lunesDeLaSemana,
  sumarDias,
} from './oracion-en-vivo';

export const CLAVES_ORACIONES_VARIABLES = [
  'jaculatorias',
  'evangelio-hoy',
  'santo-rosario-hoy',
  'diario-espiritual',
  'hora-reparacion',
];
export const CLAVE_HORA_MARIA = 'hora-maria';
export const CLAVE_WIDGET = 'imagen-widget';
export const SABADO = 6;
const DURACION_VISTA_PREVIA = 60 * 60;

export const MENSAJES_CALENDARIO = {
  carga: 'No pudimos cargar el calendario. Inténtalo de nuevo.',
  cargaOpciones: 'No pudimos cargar los contenidos de la biblioteca. Inténtalo de nuevo.',
  vistaPrevia: 'No pudimos cargar la vista previa de la imagen.',
  catalogo: 'Faltan oraciones del calendario en la base de datos. Revisa las migraciones.',
  publicado: 'Este día ya se publicó y no se puede modificar.',
  pasado: 'Este día ya pasó y no se puede modificar.',
  tipoInvalido:
    'Uno de los contenidos no corresponde a su oración. Recarga la página e inténtalo de nuevo.',
  contenidoNoExiste:
    'Uno de los contenidos elegidos ya no existe en la biblioteca. Recarga la página y elige otro.',
  sinPermisos: 'Tu cuenta no tiene permisos para programar el calendario. Vuelve a iniciar sesión.',
  sinConexion: 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
  desconocido: 'No pudimos guardar la programación. Inténtalo de nuevo en unos minutos.',
  destinoVacio: 'Elige la fecha de destino.',
  mismaFecha: 'Elige una fecha distinta a la de origen.',
  mismaSemana: 'Elige una semana distinta a la de origen.',
  origenVacio:
    'No hay nada que copiar: el origen no tiene oraciones, imagen del widget ni oficios asignados.',
  destinoBloqueado:
    'No se puede copiar: los días de destino ya se publicaron o ya pasaron.',
};

export type EstadoDia = 'publicado' | 'completo' | 'incompleto' | 'vacio';

export type OracionCalendario = {
  id: number;
  clave: string;
  nombre: string;
  orden: number;
  diaSemana: number | null;
};

export type OracionesCalendario = {
  variables: OracionCalendario[];
  horaMaria: OracionCalendario;
  widget: OracionCalendario;
  semana: OracionCalendario[];
  mes: OracionCalendario[];
  anio: OracionCalendario[];
};

export type OpcionContenido = {
  id: number;
  nombre: string;
  numero: number | null;
  fecha: string | null;
  imagenPath: string | null;
  formatos: FormatoContenido[];
};

export type DiaCalendario = {
  fecha: string;
  publicado: boolean;
  asignaciones: Record<number, number>;
  estado: EstadoDia;
};

export type Selecciones = Record<number, number | null>;

export type ModoCopia = 'dia' | 'semana';

export type ResultadoGuardadoDia =
  | { estado: 'ok'; dia: DiaCalendario }
  | { estado: 'bloqueado'; mensaje: string; dia: DiaCalendario }
  | { estado: 'error'; mensaje: string };

export type ResultadoCopia =
  | { estado: 'ok'; copiados: string[]; omitidos: string[] }
  | { estado: 'confirmar'; conContenido: string[]; omitidos: string[] }
  | { estado: 'invalida'; mensaje: string }
  | { estado: 'error'; mensaje: string };

type FilaOracion = {
  id: number;
  clave: string;
  nombre: string;
  orden: number;
  seccion: string;
  dia_semana: number | null;
};

type FilaContenido = {
  id: number;
  oracion_id: number;
  nombre: string;
  numero: number | null;
  fecha: string | null;
  pdf_path: string | null;
  youtube_url: string | null;
  imagen_path: string | null;
};

type FilaDia = {
  fecha: string;
  publicado_en: string | null;
};

type FilaAsignacion = {
  fecha: string;
  oracion_id: number;
  contenido_id: number;
};

type ErrorDeSupabase = {
  code?: string;
  hint?: string | null;
  message: string;
};

type FilaEstado = {
  fecha: string;
  estado: EstadoDia;
};

const COLUMNAS_CONTENIDO =
  'id, oracion_id, nombre, numero, fecha, pdf_path, youtube_url, imagen_path';

function esErrorDeRed(mensaje: string) {
  return /network|fetch|timeout/i.test(mensaje);
}

function esMensajeConocido(error: unknown): error is Error {
  return error instanceof Error && Object.values(MENSAJES_CALENDARIO).includes(error.message);
}

function errorDeCarga(error: ErrorDeSupabase, porDefecto: string) {
  if (error.code === '42501') return new Error(MENSAJES_CALENDARIO.sinPermisos);
  return new Error(esErrorDeRed(error.message) ? MENSAJES_CALENDARIO.sinConexion : porDefecto);
}

function relanzar(error: unknown, porDefecto: string): never {
  if (esMensajeConocido(error)) throw error;
  throw new Error(
    error instanceof Error && esErrorDeRed(error.message)
      ? MENSAJES_CALENDARIO.sinConexion
      : porDefecto,
  );
}

function mensajeDeGuardado(error: ErrorDeSupabase) {
  if (error.hint === 'dia_publicado') return MENSAJES_CALENDARIO.publicado;
  if (error.code === '42501') return MENSAJES_CALENDARIO.sinPermisos;
  if (error.code === '23514') return MENSAJES_CALENDARIO.tipoInvalido;
  if (error.code === '23503') return MENSAJES_CALENDARIO.contenidoNoExiste;
  if (esErrorDeRed(error.message)) return MENSAJES_CALENDARIO.sinConexion;
  return MENSAJES_CALENDARIO.desconocido;
}

function formatosDe(fila: FilaContenido): FormatoContenido[] {
  const formatos: FormatoContenido[] = [];
  if (fila.pdf_path) formatos.push('PDF');
  if (fila.youtube_url) formatos.push('YouTube');
  if (fila.imagen_path) formatos.push('Imagen');
  return formatos;
}

function aOracion(fila: FilaOracion): OracionCalendario {
  return {
    id: fila.id,
    clave: fila.clave,
    nombre: fila.nombre,
    orden: fila.orden,
    diaSemana: fila.dia_semana,
  };
}

function aOpcion(fila: FilaContenido): OpcionContenido {
  return {
    id: fila.id,
    nombre: fila.nombre,
    numero: fila.numero,
    fecha: fila.fecha,
    imagenPath: fila.imagen_path,
    formatos: formatosDe(fila),
  };
}

export function esSabado(fecha: string) {
  return diaSemanaIso(fecha) === SABADO;
}

export function oracionesDiarias(oraciones: OracionesCalendario) {
  return [...oraciones.variables, oraciones.widget];
}

export function oracionesRequeridas(fecha: string, oraciones: OracionesCalendario) {
  const oficio = oficioDeLaSemana(fecha, oraciones);
  return [...oraciones.variables, ...(oficio ? [oficio] : []), oraciones.widget];
}

export function esPrimeraSemana(fecha: string) {
  return Number(fecha.slice(8, 10)) <= 7;
}

export function oficioDeLaSemana(fecha: string, oraciones: OracionesCalendario) {
  return oraciones.semana.find(oracion => oracion.diaSemana === diaSemanaIso(fecha)) ?? null;
}

export function oracionesDelMes(fecha: string, oraciones: OracionesCalendario) {
  return oraciones.mes.filter(oracion => oracion.diaSemana === diaSemanaIso(fecha));
}

export function oficiosDelDia(fecha: string, oraciones: OracionesCalendario) {
  const oficio = oficioDeLaSemana(fecha, oraciones);
  return [
    ...(oficio ? [oficio] : []),
    ...(esPrimeraSemana(fecha) ? oracionesDelMes(fecha, oraciones) : []),
    ...oraciones.anio,
  ];
}

export function oracionesEditables(fecha: string, oraciones: OracionesCalendario) {
  return [...oracionesDiarias(oraciones), ...oficiosDelDia(fecha, oraciones)];
}

export function faltantes(
  fecha: string,
  asignaciones: Record<number, number | null>,
  oraciones: OracionesCalendario,
) {
  return oracionesRequeridas(fecha, oraciones).filter(oracion => !asignaciones[oracion.id]);
}

export function estadoDelDia(
  fecha: string,
  publicado: boolean,
  asignaciones: Record<number, number | null>,
  oraciones: OracionesCalendario,
): EstadoDia {
  if (publicado) return 'publicado';
  const requeridas = oracionesRequeridas(fecha, oraciones);
  const asignadas = requeridas.filter(oracion => !!asignaciones[oracion.id]).length;
  if (asignadas === 0) return 'vacio';
  return asignadas === requeridas.length ? 'completo' : 'incompleto';
}

export function bloqueoDelDia(dia: DiaCalendario, hoy = fechaDeHoyEnBogota()) {
  if (dia.publicado) return MENSAJES_CALENDARIO.publicado;
  if (dia.fecha < hoy) return MENSAJES_CALENDARIO.pasado;
  return null;
}

export async function listarOracionesCalendario(): Promise<OracionesCalendario> {
  try {
    const { data, error } = await supabase
      .from('oraciones')
      .select('id, clave, nombre, orden, seccion, dia_semana')
      .order('orden', { ascending: true });

    if (error) throw errorDeCarga(error, MENSAJES_CALENDARIO.carga);

    const filas = (data ?? []) as FilaOracion[];
    const deSeccion = (seccion: string) =>
      filas.filter(fila => fila.seccion === seccion).map(aOracion);
    const variables = CLAVES_ORACIONES_VARIABLES.map(clave =>
      filas.find(fila => fila.clave === clave),
    );
    const horaMaria = filas.find(fila => fila.clave === CLAVE_HORA_MARIA);
    const widget = filas.find(fila => fila.clave === CLAVE_WIDGET);
    const semana = deSeccion('semana');
    const mes = deSeccion('mes');
    const anio = deSeccion('anio');

    if (
      variables.some(oracion => !oracion) ||
      !horaMaria ||
      !widget ||
      semana.length !== 7 ||
      mes.length !== 4 ||
      anio.length !== 3
    ) {
      throw new Error(MENSAJES_CALENDARIO.catalogo);
    }

    return {
      variables: (variables as FilaOracion[]).map(aOracion),
      horaMaria: aOracion(horaMaria),
      widget: aOracion(widget),
      semana,
      mes,
      anio,
    };
  } catch (error) {
    relanzar(error, MENSAJES_CALENDARIO.carga);
  }
}

export async function listarOpcionesVariables(
  oraciones: OracionesCalendario,
): Promise<Record<number, OpcionContenido[]>> {
  try {
    const { data, error } = await supabase
      .from('contenidos')
      .select(COLUMNAS_CONTENIDO)
      .in(
        'oracion_id',
        oraciones.variables.map(oracion => oracion.id),
      )
      .order('numero', { ascending: true, nullsFirst: false })
      .order('nombre', { ascending: true });

    if (error) throw errorDeCarga(error, MENSAJES_CALENDARIO.cargaOpciones);

    const opciones: Record<number, OpcionContenido[]> = {};
    for (const oracion of oraciones.variables) opciones[oracion.id] = [];
    for (const fila of (data ?? []) as FilaContenido[]) {
      opciones[fila.oracion_id]?.push(aOpcion(fila));
    }
    return opciones;
  } catch (error) {
    relanzar(error, MENSAJES_CALENDARIO.cargaOpciones);
  }
}

export async function listarImagenesWidget(
  oraciones: OracionesCalendario,
): Promise<OpcionContenido[]> {
  try {
    const { data, error } = await supabase
      .from('contenidos')
      .select(COLUMNAS_CONTENIDO)
      .eq('oracion_id', oraciones.widget.id)
      .not('imagen_path', 'is', null)
      .order('creado_en', { ascending: false });

    if (error) throw errorDeCarga(error, MENSAJES_CALENDARIO.cargaOpciones);
    return ((data ?? []) as FilaContenido[]).map(aOpcion);
  } catch (error) {
    relanzar(error, MENSAJES_CALENDARIO.cargaOpciones);
  }
}

export async function listarOpcionesOficios(
  oraciones: OracionesCalendario,
): Promise<Record<number, OpcionContenido[]>> {
  const ids = [...oraciones.semana, ...oraciones.mes, ...oraciones.anio]
    .filter(oracion => oracion.id !== oraciones.horaMaria.id)
    .map(oracion => oracion.id);
  try {
    const { data, error } = await supabase
      .from('contenidos')
      .select(COLUMNAS_CONTENIDO)
      .in('oracion_id', ids)
      .order('numero', { ascending: true, nullsFirst: false })
      .order('nombre', { ascending: true });

    if (error) throw errorDeCarga(error, MENSAJES_CALENDARIO.cargaOpciones);

    const opciones: Record<number, OpcionContenido[]> = {};
    for (const id of ids) opciones[id] = [];
    for (const fila of (data ?? []) as FilaContenido[]) {
      opciones[fila.oracion_id]?.push(aOpcion(fila));
    }
    return opciones;
  } catch (error) {
    relanzar(error, MENSAJES_CALENDARIO.cargaOpciones);
  }
}

export async function urlVistaPrevia(imagenPath: string) {
  const { data, error } = await supabase.storage
    .from(BUCKET_IMAGENES)
    .createSignedUrl(imagenPath, DURACION_VISTA_PREVIA);
  if (error || !data?.signedUrl) throw new Error(MENSAJES_CALENDARIO.vistaPrevia);
  return data.signedUrl;
}

export async function buscarHoraMaria(
  fecha: string,
  oraciones: OracionesCalendario,
): Promise<OpcionContenido | null> {
  if (!esSabado(fecha)) return null;
  try {
    const { data, error } = await supabase
      .from('contenidos')
      .select(COLUMNAS_CONTENIDO)
      .eq('oracion_id', oraciones.horaMaria.id)
      .eq('fecha', fecha)
      .maybeSingle();

    if (error) throw errorDeCarga(error, MENSAJES_CALENDARIO.cargaOpciones);
    return data ? aOpcion(data as FilaContenido) : null;
  } catch (error) {
    relanzar(error, MENSAJES_CALENDARIO.cargaOpciones);
  }
}

export async function cargarDias(
  desde: string,
  hasta: string,
  oraciones: OracionesCalendario,
): Promise<DiaCalendario[]> {
  try {
    const [dias, contenidos, oficios, estados] = await Promise.all([
      supabase
        .from('calendario_dias')
        .select('fecha, publicado_en')
        .gte('fecha', desde)
        .lte('fecha', hasta),
      supabase
        .from('calendario_contenidos')
        .select('fecha, oracion_id, contenido_id')
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .in(
          'oracion_id',
          oracionesDiarias(oraciones).map(oracion => oracion.id),
        ),
      supabase
        .from('asignaciones_oficios')
        .select('fecha, oracion_id, contenido_id')
        .gte('fecha', desde)
        .lte('fecha', hasta)
        .in(
          'oracion_id',
          [...oraciones.semana, ...oraciones.mes, ...oraciones.anio].map(oracion => oracion.id),
        ),
      supabase.rpc('estados_calendario', { p_desde: desde, p_hasta: hasta }),
    ]);

    const error = dias.error ?? contenidos.error ?? oficios.error ?? estados.error;
    if (error) throw errorDeCarga(error, MENSAJES_CALENDARIO.carga);

    const publicados = new Map(
      ((dias.data ?? []) as FilaDia[]).map(fila => [fila.fecha, fila.publicado_en !== null]),
    );
    const asignaciones = new Map<string, Record<number, number>>();
    const filas = [...(contenidos.data ?? []), ...(oficios.data ?? [])] as FilaAsignacion[];
    for (const fila of filas) {
      const delDia = asignaciones.get(fila.fecha) ?? {};
      delDia[fila.oracion_id] = fila.contenido_id;
      asignaciones.set(fila.fecha, delDia);
    }

    const estadosPorFecha = new Map(
      ((estados.data ?? []) as FilaEstado[]).map(fila => [fila.fecha, fila.estado]),
    );

    const fechas: string[] = [];
    for (let fecha = desde; fecha <= hasta; fecha = sumarDias(fecha, 1)) fechas.push(fecha);

    return fechas.map(fecha => {
      const publicado = publicados.get(fecha) ?? false;
      const delDia = asignaciones.get(fecha) ?? {};
      return {
        fecha,
        publicado,
        asignaciones: delDia,
        estado: estadosPorFecha.get(fecha) ?? estadoDelDia(fecha, publicado, delDia, oraciones),
      };
    });
  } catch (error) {
    relanzar(error, MENSAJES_CALENDARIO.carga);
  }
}

export async function guardarDia(
  fecha: string,
  selecciones: Selecciones,
  oraciones: OracionesCalendario,
  adminId: string,
): Promise<ResultadoGuardadoDia> {
  try {
    const [actual] = await cargarDias(fecha, fecha, oraciones);
    const bloqueo = bloqueoDelDia(actual);
    if (bloqueo) return { estado: 'bloqueado', mensaje: bloqueo, dia: actual };

    const diarias = oracionesDiarias(oraciones).map(oracion => oracion.id);
    const asignar = diarias
      .filter(id => !!selecciones[id])
      .map(id => ({ fecha, oracion_id: id, contenido_id: selecciones[id] as number }));
    const quitar = diarias.filter(id => !selecciones[id]);
    const oficios = oficiosDelDia(fecha, oraciones).map(oracion => oracion.id);
    const asignarOficios = oficios
      .filter(id => !!selecciones[id])
      .map(id => ({ fecha, oracion_id: id, contenido_id: selecciones[id] as number }));
    const quitarOficios = oficios.filter(id => !selecciones[id]);

    if (asignar.length || asignarOficios.length) {
      const { error } = await supabase
        .from('calendario_dias')
        .upsert({ fecha, creado_por: adminId }, { onConflict: 'fecha', ignoreDuplicates: true });
      if (error) return { estado: 'error', mensaje: mensajeDeGuardado(error) };
    }

    if (asignar.length) {
      const { error } = await supabase
        .from('calendario_contenidos')
        .upsert(asignar, { onConflict: 'fecha,oracion_id' });
      if (error) return { estado: 'error', mensaje: mensajeDeGuardado(error) };
    }

    if (quitar.length) {
      const { error } = await supabase
        .from('calendario_contenidos')
        .delete()
        .eq('fecha', fecha)
        .in('oracion_id', quitar);
      if (error) return { estado: 'error', mensaje: mensajeDeGuardado(error) };
    }

    if (asignarOficios.length) {
      const { error } = await supabase
        .from('asignaciones_oficios')
        .upsert(asignarOficios, { onConflict: 'fecha,oracion_id' });
      if (error) return { estado: 'error', mensaje: mensajeDeGuardado(error) };
    }

    if (quitarOficios.length) {
      const { error } = await supabase
        .from('asignaciones_oficios')
        .delete()
        .eq('fecha', fecha)
        .in('oracion_id', quitarOficios);
      if (error) return { estado: 'error', mensaje: mensajeDeGuardado(error) };
    }

    const [dia] = await cargarDias(fecha, fecha, oraciones);
    return { estado: 'ok', dia };
  } catch (error) {
    return {
      estado: 'error',
      mensaje: esMensajeConocido(error) ? error.message : MENSAJES_CALENDARIO.desconocido,
    };
  }
}

function tieneProgramacion(dia: DiaCalendario) {
  return Object.keys(dia.asignaciones).length > 0;
}

export async function copiarProgramacion(
  modo: ModoCopia,
  origen: string,
  destino: string,
  oraciones: OracionesCalendario,
  _adminId: string,
  reemplazar: boolean,
): Promise<ResultadoCopia> {
  if (!esFechaValida(destino)) return { estado: 'invalida', mensaje: MENSAJES_CALENDARIO.destinoVacio };

  const inicioOrigen = modo === 'dia' ? origen : lunesDeLaSemana(origen);
  const inicioDestino = modo === 'dia' ? destino : lunesDeLaSemana(destino);
  if (inicioOrigen === inicioDestino) {
    return {
      estado: 'invalida',
      mensaje: modo === 'dia' ? MENSAJES_CALENDARIO.mismaFecha : MENSAJES_CALENDARIO.mismaSemana,
    };
  }
  const dias = modo === 'dia' ? 1 : 7;

  try {
    const [diasOrigen, diasDestino] = await Promise.all([
      cargarDias(inicioOrigen, sumarDias(inicioOrigen, dias - 1), oraciones),
      cargarDias(inicioDestino, sumarDias(inicioDestino, dias - 1), oraciones),
    ]);

    const pares = diasOrigen
      .map((dia, i) => ({ origen: dia, destino: diasDestino[i] }))
      .filter(par => tieneProgramacion(par.origen));
    if (!pares.length) return { estado: 'invalida', mensaje: MENSAJES_CALENDARIO.origenVacio };

    const omitidos = pares.filter(par => bloqueoDelDia(par.destino)).map(par => par.destino.fecha);
    const disponibles = pares.filter(par => !bloqueoDelDia(par.destino));
    if (!disponibles.length) {
      return { estado: 'invalida', mensaje: MENSAJES_CALENDARIO.destinoBloqueado };
    }

    const conContenido = disponibles
      .filter(par => tieneProgramacion(par.destino))
      .map(par => par.destino.fecha);
    if (conContenido.length && !reemplazar) return { estado: 'confirmar', conContenido, omitidos };

    const { data, error } = await supabase.rpc('copiar_programacion', {
      p_origen: inicioOrigen,
      p_destino: inicioDestino,
      p_dias: dias,
    });
    if (error) return { estado: 'error', mensaje: mensajeDeGuardado(error) };

    const copiados = (data ?? []) as string[];
    if (!copiados.length) {
      return { estado: 'invalida', mensaje: MENSAJES_CALENDARIO.destinoBloqueado };
    }
    const noCopiados = disponibles
      .map(par => par.destino.fecha)
      .filter(fecha => !copiados.includes(fecha));
    return { estado: 'ok', copiados, omitidos: [...omitidos, ...noCopiados] };
  } catch (error) {
    return {
      estado: 'error',
      mensaje: esMensajeConocido(error) ? error.message : MENSAJES_CALENDARIO.desconocido,
    };
  }
}
