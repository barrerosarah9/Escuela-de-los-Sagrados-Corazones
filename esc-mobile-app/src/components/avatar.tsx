import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { obtenerUrlFoto } from '../lib/perfil';
import { colors, fonts } from '../theme';
import { AppText } from './app-text';

type AvatarProps = {
  nombre: string;
  fotoPath?: string | null;
  uriLocal?: string | null;
  tamano?: number;
  style?: StyleProp<ViewStyle>;
};

export function obtenerIniciales(nombre: string) {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  const iniciales = palabras
    .slice(0, 2)
    .map((palabra) => palabra[0])
    .join('');
  return iniciales.toUpperCase() || '?';
}

export function Avatar({
  nombre,
  fotoPath = null,
  uriLocal = null,
  tamano = 84,
  style,
}: AvatarProps) {
  const [firmada, setFirmada] = useState<{ path: string; url: string } | null>(null);
  const [fuenteFallida, setFuenteFallida] = useState<string | null>(null);

  useEffect(() => {
    if (uriLocal || !fotoPath) return;
    let activo = true;
    obtenerUrlFoto(fotoPath)
      .then((url) => {
        if (activo && url) setFirmada({ path: fotoPath, url });
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, [fotoPath, uriLocal]);

  const urlRemota = firmada && firmada.path === fotoPath ? firmada.url : null;
  const fuente = uriLocal ?? urlRemota;
  const claveCache = uriLocal ?? fotoPath;
  const mostrarFoto = fuente !== null && fuenteFallida !== claveCache;

  return (
    <View
      style={[styles.base, { width: tamano, height: tamano, borderRadius: tamano / 2 }, style]}
      accessibilityRole="image"
      accessibilityLabel={mostrarFoto ? `Foto de perfil de ${nombre}` : `Iniciales de ${nombre}`}
    >
      {fuente && mostrarFoto ? (
        <Image
          source={{ uri: fuente, cacheKey: claveCache ?? undefined }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
          onError={() => setFuenteFallida(claveCache)}
        />
      ) : (
        <AppText
          style={{
            ...styles.iniciales,
            fontSize: Math.round(tamano * 0.38),
            lineHeight: Math.round(tamano * 0.48),
          }}
        >
          {obtenerIniciales(nombre)}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  iniciales: {
    fontFamily: fonts.serif,
    color: colors.white,
    includeFontPadding: false,
  },
});
