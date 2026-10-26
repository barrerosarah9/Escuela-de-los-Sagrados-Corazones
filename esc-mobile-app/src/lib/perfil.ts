import { supabase } from './supabase';

export type Perfil = {
  id: string;
  nombre: string;
  correo: string;
  telefono: string | null;
  foto_path: string | null;
  creado_en: string;
};

export type CambiosPerfil = {
  nombre: string;
  telefono: string | null;
};

export type MotivoErrorPerfil = 'sin_conexion' | 'datos_invalidos' | 'no_guardado';

export type ResultadoGuardado =
  { ok: true; perfil: Perfil } | { ok: false; motivo: MotivoErrorPerfil };

export const BUCKET_AVATARES = 'avatares';

const COLUMNAS = 'id, nombre, correo, telefono, foto_path, creado_en';
const DIA_MS = 86_400_000;
const DESFASE_BOGOTA_MS = 5 * 3_600_000;
const DURACION_URL_FOTO_S = 3600;
const MAXIMO_DIAS_RACHA = 366;

function esErrorDeRed(mensaje: string) {
  return /network|fetch|timeout/i.test(mensaje);
}

export async function obtenerPerfil(usuarioId: string): Promise<Perfil | null> {
  const { data, error } = await supabase
    .from('perfiles')
    .select(COLUMNAS)
    .eq('id', usuarioId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function actualizarPerfil(
  usuarioId: string,
  cambios: CambiosPerfil,
): Promise<ResultadoGuardado> {
  const { data, error } = await supabase
    .from('perfiles')
    .update(cambios)
    .eq('id', usuarioId)
    .select(COLUMNAS)
    .maybeSingle();

  if (error) {
    if (error.code === '23514') return { ok: false, motivo: 'datos_invalidos' };
    if (esErrorDeRed(error.message)) return { ok: false, motivo: 'sin_conexion' };
    return { ok: false, motivo: 'no_guardado' };
  }
  if (!data) return { ok: false, motivo: 'no_guardado' };
  return { ok: true, perfil: data };
}

export async function obtenerUrlFoto(fotoPath: string | null) {
  if (!fotoPath) return null;
  const { data } = await supabase.storage
    .from(BUCKET_AVATARES)
    .createSignedUrl(fotoPath, DURACION_URL_FOTO_S);
  return data?.signedUrl ?? null;
}

export function fechaHoyBogota() {
  return new Date(Date.now() - DESFASE_BOGOTA_MS).toISOString().slice(0, 10);
}

function diaAnterior(fecha: string) {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) - DIA_MS).toISOString().slice(0, 10);
}

export function calcularRacha(fechas: string[], hoy = fechaHoyBogota()) {
  const dias = new Set(fechas);
  let cursor = dias.has(hoy) ? hoy : diaAnterior(hoy);
  let racha = 0;
  while (dias.has(cursor)) {
    racha += 1;
    cursor = diaAnterior(cursor);
  }
  return racha;
}

export async function obtenerRacha(usuarioId: string) {
  const { data, error } = await supabase
    .from('dias_oracion')
    .select('fecha')
    .eq('usuario_id', usuarioId)
    .order('fecha', { ascending: false })
    .limit(MAXIMO_DIAS_RACHA);
  if (error) throw error;
  return calcularRacha((data ?? []).map((fila) => fila.fecha as string));
}
