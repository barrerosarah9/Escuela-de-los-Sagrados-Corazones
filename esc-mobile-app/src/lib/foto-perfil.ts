import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Alert, Linking } from 'react-native';
import { BUCKET_AVATARES } from './perfil';
import { supabase } from './supabase';

export type OrigenFoto = 'galeria' | 'camara';

export type ResultadoSeleccion =
  | { estado: 'elegida'; uri: string }
  | { estado: 'cancelada' }
  | { estado: 'sin_permiso' }
  | { estado: 'formato_invalido' }
  | { estado: 'error' };

export type MotivoErrorFoto = 'muy_grande' | 'formato_invalido' | 'sin_conexion' | 'no_subida';

export type ResultadoSubida =
  { ok: true; fotoPath: string } | { ok: false; motivo: MotivoErrorFoto };

export const TAMANO_MAXIMO_FOTO_BYTES = 5 * 1024 * 1024;

export const MENSAJES_ERROR_FOTO: Record<MotivoErrorFoto, string> = {
  muy_grande: 'La foto pesa más de 5 MB. Elige otra o recórtala.',
  formato_invalido: 'Ese formato de imagen no es compatible. Elige una foto JPEG, PNG o WebP.',
  sin_conexion: 'No hay conexión. Tus cambios siguen aquí; inténtalo de nuevo.',
  no_subida: 'No pudimos subir la foto. Tus cambios siguen aquí; inténtalo de nuevo.',
};

type ErrorStorage = { message: string; statusCode?: string; status?: number };

const LADO_MAXIMO_PX = 800;
const CALIDAD_JPEG = 0.7;
const TAMANO_MINIMO_FOTO_BYTES = 1024;

const OPCIONES_SELECTOR: ImagePicker.ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: true,
  aspect: [1, 1],
  quality: 1,
};

function esErrorDePermiso(error: unknown) {
  return error instanceof Error && /permission|permiso/i.test(error.message);
}

function esErrorDeRed(mensaje: string) {
  return /network|fetch|timeout/i.test(mensaje);
}

function motivoDeErrorStorage(error: ErrorStorage): MotivoErrorFoto {
  const codigo = String(error.statusCode ?? error.status ?? '');
  if (codigo === '413' || /maximum allowed size|too large/i.test(error.message)) {
    return 'muy_grande';
  }
  if (codigo === '415' || /mime type/i.test(error.message)) return 'formato_invalido';
  if (esErrorDeRed(error.message)) return 'sin_conexion';
  return 'no_subida';
}

async function comprimir(asset: ImagePicker.ImagePickerAsset) {
  const contexto = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > LADO_MAXIMO_PX) {
    contexto.resize(
      asset.width >= asset.height ? { width: LADO_MAXIMO_PX } : { height: LADO_MAXIMO_PX },
    );
  }
  const imagen = await contexto.renderAsync();
  const guardada = await imagen.saveAsync({ compress: CALIDAD_JPEG, format: SaveFormat.JPEG });
  return guardada.uri;
}

export async function elegirFoto(origen: OrigenFoto): Promise<ResultadoSeleccion> {
  let resultado: ImagePicker.ImagePickerResult;
  try {
    if (origen === 'camara') {
      const permiso = await ImagePicker.requestCameraPermissionsAsync();
      if (!permiso.granted) return { estado: 'sin_permiso' };
      resultado = await ImagePicker.launchCameraAsync(OPCIONES_SELECTOR);
    } else {
      resultado = await ImagePicker.launchImageLibraryAsync(OPCIONES_SELECTOR);
    }
  } catch (error) {
    return esErrorDePermiso(error) ? { estado: 'sin_permiso' } : { estado: 'error' };
  }

  const asset = resultado.canceled ? undefined : resultado.assets[0];
  if (!asset) return { estado: 'cancelada' };

  try {
    return { estado: 'elegida', uri: await comprimir(asset) };
  } catch {
    return { estado: 'formato_invalido' };
  }
}

export function avisarSinPermiso(origen: OrigenFoto) {
  const recurso = origen === 'camara' ? 'la cámara' : 'tus fotos';
  Alert.alert(
    `Sin acceso a ${recurso}`,
    `Para elegir tu foto de perfil, permite que la app use ${recurso} desde los ajustes de tu teléfono.`,
    [
      { text: 'Ahora no', style: 'cancel' },
      { text: 'Abrir ajustes', onPress: () => void Linking.openSettings() },
    ],
  );
}

export async function subirFoto(usuarioId: string, uri: string): Promise<ResultadoSubida> {
  let datos: Uint8Array;
  try {
    datos = await new File(uri).bytes();
  } catch {
    return { ok: false, motivo: 'no_subida' };
  }
  if (datos.byteLength < TAMANO_MINIMO_FOTO_BYTES) return { ok: false, motivo: 'no_subida' };
  if (datos.byteLength > TAMANO_MAXIMO_FOTO_BYTES) return { ok: false, motivo: 'muy_grande' };

  const fotoPath = `${usuarioId}/${Date.now()}.jpg`;
  try {
    const { error } = await supabase.storage
      .from(BUCKET_AVATARES)
      .upload(fotoPath, datos, { contentType: 'image/jpeg', upsert: false });
    if (error) return { ok: false, motivo: motivoDeErrorStorage(error as ErrorStorage) };
  } catch {
    return { ok: false, motivo: 'sin_conexion' };
  }
  return { ok: true, fotoPath };
}

export async function borrarFoto(fotoPath: string | null) {
  if (!fotoPath) return;
  await supabase.storage
    .from(BUCKET_AVATARES)
    .remove([fotoPath])
    .catch(() => undefined);
}
