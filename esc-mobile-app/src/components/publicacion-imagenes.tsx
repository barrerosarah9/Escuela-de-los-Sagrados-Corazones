import { Image } from 'expo-image';
import { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { urlImagenPublicacion } from '../lib/feed';
import { colors } from '../theme';
import { AppText } from './app-text';

type Props = {
  publicacionId: number;
  rutas: string[];
};

export function PublicacionImagenes({ publicacionId, rutas }: Props) {
  const [ancho, setAncho] = useState(0);
  const [indice, setIndice] = useState(0);
  const varias = rutas.length > 1;

  function alMedir(evento: LayoutChangeEvent) {
    setAncho(evento.nativeEvent.layout.width);
  }

  function alDesplazar(evento: NativeSyntheticEvent<NativeScrollEvent>) {
    if (ancho === 0) return;
    setIndice(Math.round(evento.nativeEvent.contentOffset.x / ancho));
  }

  return (
    <View style={styles.marco} onLayout={alMedir}>
      {ancho > 0 && (
        <ScrollView
          horizontal
          pagingEnabled
          nestedScrollEnabled
          scrollEnabled={varias}
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={alDesplazar}
        >
          {rutas.map((ruta, posicion) => (
            <Image
              key={`${publicacionId}-${ruta}`}
              source={{ uri: urlImagenPublicacion(ruta), cacheKey: ruta }}
              recyclingKey={`${publicacionId}-${ruta}`}
              cachePolicy="memory-disk"
              contentFit="cover"
              transition={150}
              accessibilityLabel={
                varias
                  ? `Imagen ${posicion + 1} de ${rutas.length} de la publicación`
                  : 'Imagen de la publicación'
              }
              style={{ width: ancho, height: '100%' }}
            />
          ))}
        </ScrollView>
      )}
      {varias && (
        <View style={styles.contador} pointerEvents="none">
          <AppText variant="caption" color={colors.white}>
            {`${indice + 1}/${rutas.length}`}
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  marco: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  contador: {
    position: 'absolute',
    top: 10,
    right: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: 'rgba(25, 14, 14, 0.6)',
  },
});
