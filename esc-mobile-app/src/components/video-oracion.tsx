import Ionicons from '@expo/vector-icons/Ionicons';
import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { abrirVideo, idDeYoutube, miniaturaDeYoutube, type ResultadoVideo } from '../lib/youtube';
import { colors, fonts, radius } from '../theme';
import { AppText } from './app-text';
import { FormAlert } from './form-alert';

type Props = {
  enlace: string;
  titulo: string;
};

const MENSAJES: Record<Exclude<ResultadoVideo, 'abierto'>, string> = {
  invalido: 'Este video no está disponible en este momento. Intenta más tarde.',
  no_disponible: 'Este video no está disponible en este momento. Intenta más tarde.',
  no_se_pudo_abrir: 'No pudimos abrir YouTube. Revisa tu conexión e inténtalo de nuevo.',
};

export function VideoOracion({ enlace, titulo }: Props) {
  const id = idDeYoutube(enlace);
  const [abriendo, setAbriendo] = useState(false);
  const [error, setError] = useState<string | null>(id ? null : MENSAJES.invalido);

  const escuchar = async () => {
    if (abriendo) return;
    setAbriendo(true);
    setError(null);
    const resultado = await abrirVideo(enlace);
    setAbriendo(false);
    if (resultado !== 'abierto') setError(MENSAJES[resultado]);
  };

  return (
    <View style={styles.contenedor}>
      <AppText style={styles.encabezado}>Haz la oración con nuestro video de YouTube</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Escuchar ${titulo} en YouTube`}
        accessibilityState={{ disabled: !id, busy: abriendo }}
        disabled={!id || abriendo}
        onPress={() => void escuchar()}
        style={({ pressed }) => [styles.video, pressed && styles.presionado]}
      >
        {id ? (
          <Image
            source={{ uri: miniaturaDeYoutube(id) }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            accessible={false}
          />
        ) : null}
        <View style={styles.velo} />
        <View style={[styles.boton, !id && styles.botonApagado]}>
          <Ionicons name={abriendo ? 'hourglass-outline' : 'play'} size={28} color={colors.text} />
        </View>
        <View style={styles.etiqueta}>
          <Ionicons name="logo-youtube" size={14} color={colors.white} />
          <AppText style={styles.etiquetaTexto}>
            {abriendo ? 'Abriendo…' : 'Escuchar en YouTube'}
          </AppText>
        </View>
      </Pressable>
      {error ? <FormAlert icon="alert-circle-outline" message={error} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: 10,
  },
  encabezado: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  video: {
    height: 200,
    borderRadius: radius.card,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text,
  },
  presionado: {
    transform: [{ scale: 0.98 }],
  },
  velo: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(25, 14, 14, 0.35)',
  },
  boton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
    boxShadow: '0px 8px 22px rgba(25, 14, 14, 0.3)',
  },
  botonApagado: {
    opacity: 0.5,
  },
  etiqueta: {
    position: 'absolute',
    left: 14,
    bottom: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(25, 14, 14, 0.65)',
  },
  etiquetaTexto: {
    fontFamily: fonts.sansBold,
    fontSize: 11,
    color: colors.white,
  },
});
