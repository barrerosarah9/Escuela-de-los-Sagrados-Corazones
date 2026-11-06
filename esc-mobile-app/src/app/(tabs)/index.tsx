import { FlashList } from '@shopify/flash-list';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { EstadoError } from '../../components/estado-error';
import { EstadoVacio } from '../../components/estado-vacio';
import { FeedEncabezado } from '../../components/feed-encabezado';
import { FeedPie } from '../../components/feed-pie';
import { OracionEnVivoCard } from '../../components/oracion-en-vivo-card';
import { PublicacionCard } from '../../components/publicacion-card';
import { ListaPublicacionesSkeleton } from '../../components/publicacion-skeleton';
import type { Publicacion } from '../../lib/feed';
import { useFeed } from '../../lib/use-feed';
import { useOracionEnVivo } from '../../lib/use-oracion-en-vivo';
import { colors } from '../../theme';

export default function InicioScreen() {
  const feed = useFeed();
  const oracionEnVivo = useOracionEnVivo();
  const { refrescar: refrescarFeed, reintentar: reintentarFeed } = feed;
  const { recargar: recargarOracion } = oracionEnVivo;

  const refrescar = useCallback(() => {
    refrescarFeed();
    void recargarOracion();
  }, [refrescarFeed, recargarOracion]);

  const reintentar = useCallback(() => {
    reintentarFeed();
    void recargarOracion();
  }, [reintentarFeed, recargarOracion]);

  const abrirPublicacion = useCallback((publicacionId: number) => {
    router.push({ pathname: '/publicacion/[id]', params: { id: String(publicacionId) } });
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Publicacion }) => (
      <PublicacionCard publicacion={item} onAbrir={abrirPublicacion} />
    ),
    [abrirPublicacion],
  );

  const encabezado = (
    <FeedEncabezado
      oracionEnVivo={
        oracionEnVivo.oracion ? (
          <OracionEnVivoCard
            titulo={oracionEnVivo.oracion.titulo}
            hora={oracionEnVivo.oracion.hora}
            estado={oracionEnVivo.estado ?? 'proxima'}
            oficioDeManana={oracionEnVivo.oracion.oficioDeManana}
            confirmada={oracionEnVivo.confirmada}
            guardandoAsistencia={oracionEnVivo.guardandoAsistencia}
            onUnirse={oracionEnVivo.unirse}
            onAlternarAsistencia={oracionEnVivo.alternarAsistencia}
          />
        ) : undefined
      }
    />
  );

  if (feed.estado === 'cargando') {
    return (
      <ScrollView style={styles.lista} scrollEnabled={false}>
        {encabezado}
        <ListaPublicacionesSkeleton etiqueta="Cargando publicaciones" />
      </ScrollView>
    );
  }

  if (feed.estado === 'error') {
    return (
      <ScrollView
        style={styles.lista}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={reintentar}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {encabezado}
        <EstadoError
          motivo={feed.motivoError ?? 'desconocido'}
          titulo="No se pudo cargar el feed"
          onReintentar={reintentar}
        />
      </ScrollView>
    );
  }

  return (
    <FlashList
      style={styles.lista}
      data={feed.publicaciones}
      keyExtractor={(publicacion) => String(publicacion.id)}
      renderItem={renderItem}
      ListHeaderComponent={encabezado}
      ListEmptyComponent={
        <EstadoVacio
          icono="newspaper-outline"
          titulo="Aún no hay publicaciones"
          mensaje="Cuando la comunidad comparta novedades, aparecerán aquí."
        />
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
          onRefresh={refrescar}
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
});
