import { Linking } from 'react-native';

export type ResultadoVideo = 'abierto' | 'invalido' | 'no_disponible' | 'no_se_pudo_abrir';

const PATRON_ID = /^[A-Za-z0-9_-]{11}$/;
const RUTAS_CON_ID = ['embed', 'shorts', 'live', 'v'];
const TIEMPO_MAXIMO_MS = 6000;

export function idDeYoutube(enlace: string) {
  let url: URL;
  try {
    url = new URL(enlace.trim());
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^(www|m)\./, '');
  const partes = url.pathname.split('/').filter(Boolean);
  let id: string | null = null;

  if (host === 'youtu.be') {
    id = partes[0] ?? null;
  } else if (host === 'youtube.com') {
    if (partes[0] === 'watch') id = url.searchParams.get('v');
    else if (RUTAS_CON_ID.includes(partes[0] ?? '')) id = partes[1] ?? null;
  }

  return id && PATRON_ID.test(id) ? id : null;
}

export function miniaturaDeYoutube(id: string) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

async function videoExiste(id: string) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), TIEMPO_MAXIMO_MS);
  try {
    const respuesta = await fetch(
      `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(
        `https://www.youtube.com/watch?v=${id}`,
      )}`,
      { signal: controlador.signal },
    );
    return respuesta.status !== 400 && respuesta.status !== 404;
  } catch {
    return true;
  } finally {
    clearTimeout(temporizador);
  }
}

export async function abrirVideo(enlace: string): Promise<ResultadoVideo> {
  const id = idDeYoutube(enlace);
  if (!id) return 'invalido';
  if (!(await videoExiste(id))) return 'no_disponible';
  try {
    await Linking.openURL(`https://www.youtube.com/watch?v=${id}`);
    return 'abierto';
  } catch {
    return 'no_se_pudo_abrir';
  }
}
