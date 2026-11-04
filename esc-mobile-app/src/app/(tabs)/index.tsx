import { FlashList } from '@shopify/flash-list';
import { useCallback } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/app-text';
import { Button } from '../../components/button';
import { FeedEncabezado } from '../../components/feed-encabezado';
import { FeedPie } from '../../components/feed-pie';
import { PublicacionCard } from '../../components/publicacion-card';
import type { Publicacion } from '../../lib/feed';
import { useFeed } from '../../lib/use-feed';
import { colors } from '../../theme';

const MENSAJES_ERROR = {
  sin_conexion: 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
  desconocido: 'No pudimos cargar las publicaciones. Inténtalo de nuevo en unos minutos.',
} as const;

export default function InicioScreen() {
  const feed = useFeed();

  const renderItem = useCallback(
    ({ item }: { item: Publicacion }) => <PublicacionCard publicacion={item} />,
    [],
  );

  if (feed.estado === 'cargando') {
    return (
      <View style={styles.centro}>
        <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando publicaciones" />
      </View>
    );
  }

  if (feed.estado === 'error') {
    return (
      <View style={[styles.centro, styles.conMargen]}>
        <AppText variant="subtitle" style={styles.textoCentrado}>
          No se pudo cargar el feed
        </AppText>
        <AppText style={styles.textoCentrado}>
          {MENSAJES_ERROR[feed.motivoError ?? 'desconocido']}
        </AppText>
        <Button title="Reintentar" onPress={feed.reintentar} style={styles.boton} />
      </View>
    );
  }

  return (
    <FlashList
      style={styles.lista}
      data={feed.publicaciones}
      keyExtractor={(publicacion) => String(publicacion.id)}
      renderItem={renderItem}
      ListHeaderComponent={<FeedEncabezado />}
      ListEmptyComponent={
        <View style={styles.vacio}>
          <AppText variant="subtitle" style={styles.textoCentrado}>
            Aún no hay publicaciones
          </AppText>
          <AppText style={styles.textoCentrado}>
            Cuando la comunidad comparta novedades, aparecerán aquí.
          </AppText>
        </View>
      }
      ListFooterComponent={
        <FeedPie
          cargandoMas={feed.cargandoMas}
          errorAlCargarMas={feed.errorAlCargarMas}
          hayMas={feed.hayMas}
          hayPublicaciones={feed.publicaciones.length > 0}
          onReintentar={feed.cargarMas}
        />
      }
      onEndReached={feed.cargarMas}
      onEndReachedThreshold={0.6}
      refreshControl={
        <RefreshControl
          refreshing={feed.refrescando}
          onRefresh={feed.refrescar}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  lista: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centro: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: colors.background,
  },
  conMargen: {
    paddingHorizontal: 32,
  },
  textoCentrado: {
    textAlign: 'center',
  },
  boton: {
    alignSelf: 'stretch',
    marginTop: 8,
  },
  vacio: {
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
});
