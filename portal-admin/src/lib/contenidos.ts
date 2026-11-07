import { supabase } from './supabase';
import {
  BUCKET_IMAGENES,
  BUCKET_PDF,
  idDeYouTube,
  type ContenidoBiblioteca,
  type OracionBiblioteca,
} from './biblioteca';
import { fechaDeHoyEnBogota } from './oracion-en-vivo';

const MEGABYTE = 1024 * 1024;
const EXTENSIONES_IMAGEN: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png' };
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PATRON_ENTERO = /^\d+$/;
const NUMERO_MAXIMO = 32767;
const SABADO = 6;

export const MAXIMO_IMAGEN_BYTES = 5 * MEGABYTE;
export const MAXIMO_PDF_BYTES = 10 * MEGABYTE;
export const LARGO_MAXIMO_NOMBRE = 120;
export const FORMATOS_IMAGEN = Object.keys(EXTENSIONES_IMAGEN);
export const FORMATO_PDF = 'application/pdf';

const PREFIJOS_MES: Record<string, string> = {
  'primer-jueves': 'Primer jueves',
  'primeros-viernes-diurnos': 'Viernes diurno',
  'vigilias-reparacion': 'Vigilia',
  'primer-sabado': 'Primer sábado',
};
const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MESES = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

export const MENSAJES_CONTENIDO = {
  tipoVacio: 'Elige el tipo de oración del contenido.',
  tipoLleno: 'Esta oración ya tiene el máximo de contenidos. Edita o elimina uno de los actuales.',
  nombreVacio: 'Escribe el nombre del contenido.',
  nombreLargo: `El nombre puede tener hasta ${LARGO_MAXIMO_NOMBRE} caracteres.`,
  numeroVacio: 'Escribe el número de la variante.',
  numeroInvalido: 'El número debe ser un entero mayor que 0.',
  diaVacio: 'Escribe el día de la consagración.',
  diaInvalido: 'El día de la consagración va del 1 al 30.',
  fechaVacia: 'Elige la fecha del sábado.',
  fechaNoSabado: 'La fecha debe ser un sábado.',
  sinArchivos: 'Agrega al menos un PDF, un video de YouTube o una imagen.',
  widgetSinImagen: 'Sube la imagen del widget.',
  imagenFormato: 'La imagen debe ser JPG o PNG.',
  imagenTamano: 'La imagen pesa más de 5 MB.',
  pdfFormato: 'El archivo debe ser un PDF.',
  pdfTamano: 'El PDF pesa más de 10 MB.',
  archivoVacio: 'El archivo está vacío.',
  youtubeInvalido:
    'Ingresa un enlace válido de YouTube, por ejemplo https://www.youtube.com/watch?v=abc123.',
  numeroRepetido: 'Ya existe un contenido con ese número en esta oración.',
  fechaRepetida: 'Ya hay una Hora de María para ese sábado.',
  widgetSoloImagen:
    'Las imágenes del widget solo admiten imagen. Este contenido tiene PDF o video de YouTube.',
  asignadoCalendario:
    'Este contenido está asignado en el calendario. Quítalo de esos días antes de cambiar su tipo.',
  noExiste: 'Este contenido ya no existe. Recarga la biblioteca.',
  moverArchivos: 'No pudimos mover los archivos al nuevo tipo. Inténtalo de nuevo.',
  eliminar: 'No pudimos eliminar el contenido. Inténtalo de nuevo.',
  revisarCalendario: 'No pudimos revisar el calendario. Inténtalo de nuevo.',
  sinPermisos: 'Tu cuenta no tiene permisos para cambiar contenidos. Vuelve a iniciar sesión.',
  sinConexion: 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
  subida: 'No pudimos subir el archivo. Inténtalo de nuevo.',
  desconocido: 'No pudimos guardar el contenido. Inténtalo de nuevo en unos minutos.',
};

export type CampoVariante = 'numero' | 'diaConsagracion' | 'fecha' | null;

export type DatosContenido = {
  oracionId: number | null;
  nombre: string;
  numero: string;
  fecha: string;
  pdf: File | null;
  imagen: File | null;
  youtube: string;
};

export type ErroresContenido = Partial<
  Record<'oracion' | 'nombre' | 'numero' | 'fecha' | 'pdf' | 'imagen' | 'youtube' | 'archivos', string>
>;

export class ErrorContenido extends Error {
  campo: keyof ErroresContenido | null;

  constructor(mensaje: string, campo: keyof ErroresContenido | null = null) {
    super(mensaje);
    this.campo = campo;
  }
}

export function campoVariante(oracion: OracionBiblioteca | undefined): CampoVariante {
  if (!oracion) return null;
  if (oracion.clave === 'hora-maria') return 'fecha';
  if (oracion.seccion === 'semana' || oracion.seccion === 'mes') return 'numero';
  if (oracion.seccion === 'anio') return 'diaConsagracion';
  return null;
}

export function esWidget(oracion: OracionBiblioteca | undefined) {
  return oracion?.seccion === 'widget';
}

export function oracionLlena(oracion: OracionBiblioteca) {
  return oracion.maxContenidos !== null && oracion.totalContenidos >= oracion.maxContenidos;
}

export function esSabado(fecha: string) {
  return PATRON_FECHA.test(fecha) && new Date(`${fecha}T12:00:00Z`).getUTCDay() === SABADO;
}

export function normalizarYouTube(url: string) {
  const id = idDeYouTube(url.trim());
  return id ? `https://www.youtube.com/watch?v=${id}` : null;
}

function fechaLegible(fecha: string) {
  const [, mes, dia] = fecha.split('-').map(Number);
  return `${dia} de ${MESES[mes - 1]}`;
}

export function nombreSugerido(oracion: OracionBiblioteca | undefined, numero: string, fecha: string) {
  if (!oracion) return '';
  const campo = campoVariante(oracion);
  const n = PATRON_ENTERO.test(numero.trim()) ? Number(numero) : null;
  if (campo === 'fecha') return esSabado(fecha) ? `Hora de María · ${fechaLegible(fecha)}` : '';
  if (campo === 'diaConsagracion') return n ? `Día ${n}` : '';
  if (campo === 'numero') {
    const prefijo =
      oracion.seccion === 'semana' && oracion.diaSemana
        ? DIAS_SEMANA[oracion.diaSemana - 1]
        : PREFIJOS_MES[oracion.clave] ?? oracion.nombre;
    return n ? `${prefijo} ${n}` : '';
  }
  return oracion.seccion === 'widget' ? '' : oracion.nombre;
}

function validarImagen(archivo: File) {
  if (!FORMATOS_IMAGEN.includes(archivo.type)) return MENSAJES_CONTENIDO.imagenFormato;
  if (archivo.size === 0) return MENSAJES_CONTENIDO.archivoVacio;
  if (archivo.size > MAXIMO_IMAGEN_BYTES) return MENSAJES_CONTENIDO.imagenTamano;
  return null;
}

function validarPdf(archivo: File) {
  if (archivo.type !== FORMATO_PDF) return MENSAJES_CONTENIDO.pdfFormato;
  if (archivo.size === 0) return MENSAJES_CONTENIDO.archivoVacio;
  if (archivo.size > MAXIMO_PDF_BYTES) return MENSAJES_CONTENIDO.pdfTamano;
  return null;
}

export function validarArchivo(tipo: 'pdf' | 'imagen', archivo: File) {
  return tipo === 'pdf' ? validarPdf(archivo) : validarImagen(archivo);
}

export function validarContenido(
  datos: DatosContenido,
  oracion: OracionBiblioteca | undefined,
): ErroresContenido {
  const errores: ErroresContenido = {};
  const nombre = datos.nombre.trim();
  const campo = campoVariante(oracion);
  const widget = esWidget(oracion);

  if (!oracion) errores.oracion = MENSAJES_CONTENIDO.tipoVacio;
  else if (oracionLlena(oracion)) errores.oracion = MENSAJES_CONTENIDO.tipoLleno;

  if (!nombre) errores.nombre = MENSAJES_CONTENIDO.nombreVacio;
  else if (nombre.length > LARGO_MAXIMO_NOMBRE) errores.nombre = MENSAJES_CONTENIDO.nombreLargo;

  const numero = datos.numero.trim();
  if (campo === 'numero') {
    if (!numero) errores.numero = MENSAJES_CONTENIDO.numeroVacio;
    else if (!PATRON_ENTERO.test(numero) || Number(numero) < 1 || Number(numero) > NUMERO_MAXIMO)
      errores.numero = MENSAJES_CONTENIDO.numeroInvalido;
  }
  if (campo === 'diaConsagracion') {
    if (!numero) errores.numero = MENSAJES_CONTENIDO.diaVacio;
    else if (!PATRON_ENTERO.test(numero) || Number(numero) < 1 || Number(numero) > 30)
      errores.numero = MENSAJES_CONTENIDO.diaInvalido;
  }
  if (campo === 'fecha') {
    if (!datos.fecha) errores.fecha = MENSAJES_CONTENIDO.fechaVacia;
    else if (!esSabado(datos.fecha)) errores.fecha = MENSAJES_CONTENIDO.fechaNoSabado;
  }

  if (datos.imagen) {
    const problema = validarImagen(datos.imagen);
    if (problema) errores.imagen = problema;
  }
  if (!widget && datos.pdf) {
    const problema = validarPdf(datos.pdf);
    if (problema) errores.pdf = problema;
  }
  if (!widget && datos.youtube.trim() && !normalizarYouTube(datos.youtube)) {
    errores.youtube = MENSAJES_CONTENIDO.youtubeInvalido;
  }

  if (widget && !datos.imagen) errores.imagen = MENSAJES_CONTENIDO.widgetSinImagen;
  else if (!widget && !datos.pdf && !datos.youtube.trim() && !datos.imagen) {
    errores.archivos = MENSAJES_CONTENIDO.sinArchivos;
  }

  return errores;
}

export function tieneErrores(errores: ErroresContenido) {
  return Object.values(errores).some(Boolean);
}

export async function siguienteNumero(oracionId: number) {
  const { data, error } = await supabase
    .from('contenidos')
    .select('numero')
    .eq('oracion_id', oracionId)
    .not('numero', 'is', null)
    .order('numero', { ascending: false })
    .limit(1);
  if (error || !data?.length) return 1;
  return (data[0].numero as number) + 1;
}

function esErrorDeRed(mensaje: string) {
  return /network|fetch|timeout/i.test(mensaje);
}

function errorDeSubida(error: { message: string; statusCode?: string }, campo: 'pdf' | 'imagen') {
  const codigo = String(error.statusCode ?? '');
  if (codigo === '413') {
    return new ErrorContenido(
      campo === 'pdf' ? MENSAJES_CONTENIDO.pdfTamano : MENSAJES_CONTENIDO.imagenTamano,
      campo,
    );
  }
  if (codigo === '415') {
    return new ErrorContenido(
      campo === 'pdf' ? MENSAJES_CONTENIDO.pdfFormato : MENSAJES_CONTENIDO.imagenFormato,
      campo,
    );
  }
  if (codigo === '403') return new ErrorContenido(MENSAJES_CONTENIDO.sinPermisos);
  if (esErrorDeRed(error.message)) return new ErrorContenido(MENSAJES_CONTENIDO.sinConexion);
  return new ErrorContenido(MENSAJES_CONTENIDO.subida, campo);
}

function errorDeGuardado(error: { code?: string; message: string }) {
  if (error.code === '23505' && error.message.includes('contenidos_fecha_key')) {
    return new ErrorContenido(MENSAJES_CONTENIDO.fechaRepetida, 'fecha');
  }
  if (error.code === '23505') return new ErrorContenido(MENSAJES_CONTENIDO.numeroRepetido, 'numero');
  if (error.code === '23514' && error.message.includes('admite como máximo')) {
    return new ErrorContenido(MENSAJES_CONTENIDO.tipoLleno, 'oracion');
  }
  if (error.code === '42501') return new ErrorContenido(MENSAJES_CONTENIDO.sinPermisos);
  if (esErrorDeRed(error.message)) return new ErrorContenido(MENSAJES_CONTENIDO.sinConexion);
  return new ErrorContenido(MENSAJES_CONTENIDO.desconocido);
}

function rutaDeArchivo(oracion: OracionBiblioteca, extension: string) {
  return `${oracion.seccion}/${oracion.clave}/${crypto.randomUUID()}.${extension}`;
}

async function subirArchivo(
  bucket: string,
  ruta: string,
  archivo: File,
  campo: 'pdf' | 'imagen',
) {
  const { error } = await supabase.storage
    .from(bucket)
    .upload(ruta, archivo, { contentType: archivo.type, upsert: false });
  if (error) throw errorDeSubida(error as { message: string; statusCode?: string }, campo);
  return ruta;
}

async function borrarSubidos(subidos: { bucket: string; ruta: string }[]) {
  await Promise.all(
    subidos.map(({ bucket, ruta }) => supabase.storage.from(bucket).remove([ruta]).catch(() => null)),
  );
}

export async function guardarContenido(
  datos: DatosContenido,
  oracion: OracionBiblioteca,
  administradorId: string,
) {
  const widget = esWidget(oracion);
  const campo = campoVariante(oracion);
  const subidos: { bucket: string; ruta: string }[] = [];

  try {
    let pdfPath: string | null = null;
    let imagenPath: string | null = null;

    if (!widget && datos.pdf) {
      pdfPath = await subirArchivo(BUCKET_PDF, rutaDeArchivo(oracion, 'pdf'), datos.pdf, 'pdf');
      subidos.push({ bucket: BUCKET_PDF, ruta: pdfPath });
    }
    if (datos.imagen) {
      const extension = EXTENSIONES_IMAGEN[datos.imagen.type];
      imagenPath = await subirArchivo(
        BUCKET_IMAGENES,
        rutaDeArchivo(oracion, extension),
        datos.imagen,
        'imagen',
      );
      subidos.push({ bucket: BUCKET_IMAGENES, ruta: imagenPath });
    }

    const { error } = await supabase.from('contenidos').insert({
      oracion_id: oracion.id,
      nombre: datos.nombre.trim(),
      numero: campo === 'numero' || campo === 'diaConsagracion' ? Number(datos.numero) : null,
      fecha: campo === 'fecha' ? datos.fecha : null,
      pdf_path: pdfPath,
      youtube_url: !widget && datos.youtube.trim() ? normalizarYouTube(datos.youtube) : null,
      imagen_path: imagenPath,
      creado_por: administradorId,
    });

    if (error) throw errorDeGuardado(error);
  } catch (error) {
    await borrarSubidos(subidos);
    if (error instanceof ErrorContenido) throw error;
    throw new ErrorContenido(MENSAJES_CONTENIDO.sinConexion);
  }
}

export type DatosEdicion = {
  oracionId: number | null;
  nombre: string;
  numero: string;
  fecha: string;
};

export function validarEdicion(
  datos: DatosEdicion,
  oracion: OracionBiblioteca | undefined,
  contenido: ContenidoBiblioteca,
  oracionOriginalId: number,
): ErroresContenido {
  const errores = validarContenido(
    { ...datos, pdf: null, imagen: null, youtube: '' },
    oracion && oracion.id === oracionOriginalId ? { ...oracion, maxContenidos: null } : oracion,
  );
  delete errores.archivos;
  delete errores.imagen;
  if (esWidget(oracion) && (contenido.pdfPath || contenido.youtubeUrl)) {
    errores.oracion = MENSAJES_CONTENIDO.widgetSoloImagen;
  }
  return errores;
}

function nombreDeArchivo(ruta: string) {
  return ruta.slice(ruta.lastIndexOf('/') + 1);
}

async function moverArchivo(bucket: string, desde: string, hacia: string) {
  const { error } = await supabase.storage.from(bucket).move(desde, hacia);
  if (error) {
    const codigo = String((error as { statusCode?: string }).statusCode ?? '');
    if (codigo === '403') throw new ErrorContenido(MENSAJES_CONTENIDO.sinPermisos);
    if (esErrorDeRed(error.message)) throw new ErrorContenido(MENSAJES_CONTENIDO.sinConexion);
    throw new ErrorContenido(MENSAJES_CONTENIDO.moverArchivos);
  }
}

function errorDeEdicion(error: { code?: string; message: string }) {
  if (error.code === '23503' && /calendario|asignaciones/.test(error.message)) {
    return new ErrorContenido(MENSAJES_CONTENIDO.asignadoCalendario, 'oracion');
  }
  return errorDeGuardado(error);
}

export async function actualizarContenido(
  contenido: ContenidoBiblioteca,
  oracionOriginal: OracionBiblioteca,
  datos: DatosEdicion,
  oracion: OracionBiblioteca,
) {
  const cambiaTipo = oracion.id !== oracionOriginal.id;
  const campo = campoVariante(oracion);
  const movidos: { bucket: string; desde: string; hacia: string }[] = [];
  const carpeta = `${oracion.seccion}/${oracion.clave}`;
  const rutas = { pdf: contenido.pdfPath, imagen: contenido.imagenPath };

  try {
    if (cambiaTipo) {
      for (const [bucket, ruta, clave] of [
        [BUCKET_PDF, contenido.pdfPath, 'pdf'],
        [BUCKET_IMAGENES, contenido.imagenPath, 'imagen'],
      ] as const) {
        if (!ruta) continue;
        const hacia = `${carpeta}/${nombreDeArchivo(ruta)}`;
        await moverArchivo(bucket, ruta, hacia);
        movidos.push({ bucket, desde: ruta, hacia });
        rutas[clave] = hacia;
      }
    }

    const { data, error } = await supabase
      .from('contenidos')
      .update({
        oracion_id: oracion.id,
        nombre: datos.nombre.trim(),
        numero: campo === 'numero' || campo === 'diaConsagracion' ? Number(datos.numero) : null,
        fecha: campo === 'fecha' ? datos.fecha : null,
        pdf_path: rutas.pdf,
        imagen_path: rutas.imagen,
      })
      .eq('id', contenido.id)
      .select('id');

    if (error) throw errorDeEdicion(error);
    if (!data?.length) throw new ErrorContenido(MENSAJES_CONTENIDO.noExiste);
  } catch (error) {
    for (const { bucket, desde, hacia } of movidos.reverse()) {
      await supabase.storage.from(bucket).move(hacia, desde).catch(() => null);
    }
    if (error instanceof ErrorContenido) throw error;
    throw new ErrorContenido(MENSAJES_CONTENIDO.sinConexion);
  }
}

export async function diasAsignados(contenidoId: number, desde = fechaDeHoyEnBogota()) {
  const consultas = ['calendario_contenidos', 'asignaciones_oficios'].map(tabla =>
    supabase.from(tabla).select('fecha').eq('contenido_id', contenidoId).gte('fecha', desde),
  );
  const respuestas = await Promise.all(consultas);
  const fallo = respuestas.find(r => r.error);
  if (fallo?.error) {
    throw new ErrorContenido(
      esErrorDeRed(fallo.error.message)
        ? MENSAJES_CONTENIDO.sinConexion
        : MENSAJES_CONTENIDO.revisarCalendario,
    );
  }
  const fechas = respuestas.flatMap(r => (r.data ?? []).map(fila => fila.fecha as string));
  return [...new Set(fechas)].sort();
}

export async function eliminarContenido(contenido: ContenidoBiblioteca) {
  const { data, error } = await supabase
    .from('contenidos')
    .delete()
    .eq('id', contenido.id)
    .select('id');

  if (error) {
    if (error.code === '42501') throw new ErrorContenido(MENSAJES_CONTENIDO.sinPermisos);
    if (esErrorDeRed(error.message)) throw new ErrorContenido(MENSAJES_CONTENIDO.sinConexion);
    throw new ErrorContenido(MENSAJES_CONTENIDO.eliminar);
  }
  if (!data?.length) throw new ErrorContenido(MENSAJES_CONTENIDO.noExiste);

  const archivos: [string, string][] = [];
  if (contenido.pdfPath) archivos.push([BUCKET_PDF, contenido.pdfPath]);
  if (contenido.imagenPath) archivos.push([BUCKET_IMAGENES, contenido.imagenPath]);
  const resultados = await Promise.all(
    archivos.map(([bucket, ruta]) =>
      supabase.storage
        .from(bucket)
        .remove([ruta])
        .then(({ data, error: errorArchivo }) => !errorArchivo && (data?.length ?? 0) > 0)
        .catch(() => false),
    ),
  );
  return { archivosBorrados: resultados.every(Boolean) };
}
