import { AppState } from 'react-native';
import { supabase } from './supabase';

export type ResumenRacha = {
  actual: number;
  mejor: number;
};

type Pendiente = {
  usuarioId: string;
  fecha: string;
};

const CLAVES_SANTIFICA_EL_DIA = new Set([
  'oracion-iniciar-dia',
  'divina-cita',
  'jaculatorias',
  'evangelio-hoy',
  'santo-rosario-hoy',
  'diario-espiritual',
  'hora-reparacion',
  'oracion-noche',
]);

const CLAVE_PENDIENTES = 'racha:pendientes';
const PREFIJO_REGISTRADO = 'racha:registrado:';
const DIA_MS = 86_400_000;
const DESFASE_BOGOTA_MS = 5 * 3_600_000;
const REINTENTO_MS = 30_000;

let envio: Promise<void> | null = null;
let reintento: ReturnType<typeof setTimeout> | null = null;

function hoyBogota() {
  return new Date(Date.now() - DESFASE_BOGOTA_MS).toISOString().slice(0, 10);
}

function diaAnterior(fecha: string) {
  return new Date(Date.parse(`${fecha}T00:00:00Z`) - DIA_MS).toISOString().slice(0, 10);
}

function esErrorDeRed(mensaje: string) {
  return /network|fetch|timeout/i.test(mensaje);
}

function esPendiente(valor: unknown): valor is Pendiente {
  if (typeof valor !== 'object' || valor === null) return false;
  const { usuarioId, fecha } = valor as Record<string, unknown>;
  return typeof usuarioId === 'string' && typeof fecha === 'string';
}

function leerPendientes(): Pendiente[] {
  try {
    const valor: unknown = JSON.parse(localStorage.getItem(CLAVE_PENDIENTES) ?? '[]');
    return Array.isArray(valor) ? valor.filter(esPendiente) : [];
  } catch {
    return [];
  }
}

function guardarPendientes(lista: Pendiente[]) {
  if (lista.length === 0) localStorage.removeItem(CLAVE_PENDIENTES);
  else localStorage.setItem(CLAVE_PENDIENTES, JSON.stringify(lista));
}

function programarReintento() {
  if (reintento) return;
  reintento = setTimeout(() => {
    reintento = null;
    void enviarDiasPendientes();
  }, REINTENTO_MS);
}

async function registrarEnLaBase(fecha: string) {
  try {
    const { error } = await supabase.rpc('registrar_dia_oracion', { p_fecha: fecha });
    return error;
  } catch (error) {
    return { message: error instanceof Error ? error.message : 'network' };
  }
}

async function enviar(usuarioId: string) {
  const hoy = hoyBogota();
  let lista = leerPendientes().filter((pendiente) => pendiente.fecha >= diaAnterior(hoy));
  const propios = lista.filter((pendiente) => pendiente.usuarioId === usuarioId);

  for (const pendiente of propios) {
    const error = await registrarEnLaBase(pendiente.fecha);
    if (error && esErrorDeRed(error.message)) {
      guardarPendientes(lista);
      programarReintento();
      return;
    }
    lista = lista.filter((otro) => otro !== pendiente);
    if (!error && pendiente.fecha === hoy) {
      localStorage.setItem(PREFIJO_REGISTRADO + usuarioId, hoy);
    }
  }

  guardarPendientes(lista);
}

async function usuarioDeLaSesion() {
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? null;
}

export function enviarDiasPendientes(usuarioId?: string): Promise<void> {
  if (envio) return envio.then(() => enviarDiasPendientes(usuarioId));
  envio = (async () => {
    const usuario = usuarioId ?? (await usuarioDeLaSesion());
    if (usuario) await enviar(usuario);
  })()
    .catch(() => undefined)
    .finally(() => {
      envio = null;
    });
  return envio;
}

export function esDeSantificaElDia(clave: string) {
  return CLAVES_SANTIFICA_EL_DIA.has(clave);
}

export function registrarDiaDeOracion(usuarioId: string) {
  const hoy = hoyBogota();
  if (localStorage.getItem(PREFIJO_REGISTRADO + usuarioId) === hoy) return Promise.resolve();
  const lista = leerPendientes();
  if (!lista.some((pendiente) => pendiente.usuarioId === usuarioId && pendiente.fecha === hoy)) {
    guardarPendientes([...lista, { usuarioId, fecha: hoy }]);
  }
  return enviarDiasPendientes(usuarioId);
}

export async function obtenerResumenRacha(usuarioId: string): Promise<ResumenRacha> {
  await enviarDiasPendientes(usuarioId);
  const { data, error } = await supabase.rpc('racha_oracion').single();
  if (error) throw error;
  const fila = data as { actual: number | null; mejor: number | null };
  return { actual: fila.actual ?? 0, mejor: fila.mejor ?? 0 };
}

AppState.addEventListener('change', (estado) => {
  if (estado === 'active') void enviarDiasPendientes();
});
