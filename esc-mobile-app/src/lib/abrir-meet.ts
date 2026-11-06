import { Linking, Platform } from 'react-native';

const PATRON_MEET = /^https:\/\/meet\.google\.com\/([A-Za-z0-9-]+)\/?(?:[?#].*)?$/;

export function codigoDeReunion(enlace: string) {
  const coincidencia = PATRON_MEET.exec(enlace.trim());
  return coincidencia ? coincidencia[1] : null;
}

async function intentarAbrir(url: string) {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export async function abrirMeet(enlace: string) {
  const url = enlace.trim();
  const codigo = codigoDeReunion(url);

  if (Platform.OS === 'ios' && codigo && (await intentarAbrir(`gmeet://${codigo}`))) {
    return true;
  }

  return intentarAbrir(url);
}
