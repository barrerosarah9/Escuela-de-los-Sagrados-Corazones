import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { BackHeader } from '../../components/back-header';
import { ComentarioComposer } from '../../components/comentario-composer';
import { ComentarioItem } from '../../components/comentario-item';
import { ComentariosSkeleton } from '../../components/comentario-skeleton';
import { EstadoError } from '../../components/estado-error';
import { EstadoVacio } from '../../components/estado-vacio';
import { PublicacionCard } from '../../components/publicacion-card';
import { PublicacionSkeleton } from '../../components/publicacion-skeleton';
import {
  crearComentario,
  nombreVisible,
  obtenerComentarios,
  type AutorComentario,
  type Comentario,
  type ComentarioConAutor,
} from '../../lib/comentarios';
import { avisarComentarioCreado } from '../../lib/eventos-feed';
import {
  ErrorFeed,
  obtenerPublicacion,
  type MotivoErrorFeed,
  type Publicacion,
} from '../../lib/feed';
import { obtenerPerfil } from '../../lib/perfil';
import { useSession } from '../../lib/session';
import { colors } from '../../theme';

type Estado = 'cargando' | 'listo' | 'no_encontrada' | 'error';

type EstadoComentarios = 'cargando' | 'listo' | 'error';

type ResultadosCarga = [
  PromiseSettledResult<Publicacion | null>,
  PromiseSettledResult<ComentarioConAutor[]>,
];

function motivoDe(error: unknown): MotivoErrorFeed {
  return error instanceof ErrorFeed ? error.motivo : 'desconocido';
}

function pedirDatos(publicacionId: number): Promise<ResultadosCarga> {
  return Promise.allSettled([obtenerPublicacion(publicacionId), obtenerComentarios(publicacionId)]);
}

export default function PublicacionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const publicacionId = Number(id);
  const idValido = Number.isInteger(publicacionId) && publicacionId > 0;
  const { session } = useSession();
  const usuarioId = session?.user.id;
  const listaRef = useRef<FlatList<ComentarioConAutor>>(null);
  const [estado, setEstado] = useState<Estado>('cargando');
  const [motivoError, setMotivoError] = useState<MotivoErrorFeed>('desconocido');
  const [publicacion, setPublicacion] = useState<Publicacion | null>(null);
  const [estadoComentarios, setEstadoComentarios] = useState<EstadoComentarios>('cargando');
  const [motivoErrorComentarios, setMotivoErrorComentarios] =
    useState<MotivoErrorFeed>('desconocido');
  const [cargados, setCargados] = useState<ComentarioConAutor[]>([]);
  const [recientes, setRecientes] = useState<Comentario[]>([]);
  const [autorPropio, setAutorPropio] = useState<AutorComentario>({
    nombre: 'Tú',
    fotoPath: null,
  });
  const [refrescando, setRefrescando] = useState(false);
  const [intento, setIntento] = useState(0);

  const aplicar = useCallback((resultados: ResultadosCarga, refresco: boolean) => {
    const [resultadoPublicacion, resultadoComentarios] = resultados;

    if (resultadoPublicacion.status === 'fulfilled') {
      setPublicacion(resultadoPublicacion.value);
      setEstado(resultadoPublicacion.value ? 'listo' : 'no_encontrada');
    } else if (!refresco) {
      setMotivoError(motivoDe(resultadoPublicacion.reason));
      setEstado('error');
    }

    if (resultadoComentarios.status === 'fulfilled') {
      setCargados(resultadoComentarios.value);
      setEstadoComentarios('listo');
    } else {
      setMotivoErrorComentarios(motivoDe(resultadoComentarios.reason));
      setEstadoComentarios((actual) => (refresco && actual === 'listo' ? actual : 'error'));
    }
  }, []);

  useEffect(() => {
    if (!idValido) return;
    let activo = true;
    pedirDatos(publicacionId).then((resultados) => {
      if (activo) aplicar(resultados, false);
    });
    return () => {
      activo = false;
    };
  }, [idValido, publicacionId, intento, aplicar]);

  useEffect(() => {
    if (!usuarioId) return;
    let activo = true;
    obtenerPerfil(usuarioId)
      .then((perfil) => {
        if (activo && perfil) setAutorPropio({ nombre: perfil.nombre, fotoPath: perfil.foto_path });
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, [usuarioId]);

  const comentarios = useMemo(() => {
    const idsCargados = new Set(cargados.map((comentario) => comentario.id));
    const nuevos = recientes
      .filter((comentario) => !idsCargados.has(comentario.id))
      .map((comentario) => ({ ...comentario, autor: autorPropio }));
    return [...cargados, ...nuevos].map((comentario) =>
      comentario.usuarioId === usuarioId ? { ...comentario, autor: autorPropio } : comentario,
    );
  }, [cargados, recientes, autorPropio, usuarioId]);

  const enviar = useCallback(
    async (texto: string) => {
      if (!publicacion || !usuarioId) return 'desconocido' as const;
      const resultado = await crearComentario(publicacion.id, usuarioId, texto);
      if (!resultado.ok) return resultado.motivo;
      setRecientes((actuales) => [...actuales, resultado.comentario]);
      setPublicacion((actual) =>
        actual ? { ...actual, totalComentarios: actual.totalComentarios + 1 } : actual,
      );
      avisarComentarioCreado(publicacion.id);
      requestAnimationFrame(() => listaRef.current?.scrollToEnd({ animated: true }));
      return null;
    },
    [publicacion, usuarioId],
  );

  const reintentar = useCallback(() => {
    setEstado('cargando');
    setEstadoComentarios('cargando');
    setIntento((actual) => actual + 1);
  }, []);

  const reintentarComentarios = useCallback(() => {
    setEstadoComentarios('cargando');
    setIntento((actual) => actual + 1);
  }, []);

  const refrescar = useCallback(async () => {
    setRefrescando(true);
    aplicar(await pedirDatos(publicacionId), true);
    setRefrescando(false);
  }, [aplicar, publicacionId]);

  const estadoVisible: Estado = idValido ? estado : 'no_encontrada';

  const renderItem = useCallback(
    ({ item }: { item: ComentarioConAutor }) => (
      <ComentarioItem
        nombre={nombreVisible(item.autor)}
        fotoPath={item.autor.fotoPath}
        texto={item.texto}
        creadoEn={item.creadoEn}
      />
    ),
    [],
  );

  const sinComentarios = comentarios.length === 0;

  return (
    <SafeAreaView style={styles.pantalla} edges={['top', 'left', 'right', 'bottom']}>
      <BackHeader />
      {estadoVisible === 'cargando' && <PublicacionSkeleton />}
      {estadoVisible === 'error' && (
        <EstadoError
          motivo={motivoError}
          titulo="No se pudo cargar la publicación"
          onReintentar={reintentar}
        />
      )}
      {estadoVisible === 'no_encontrada' && (
        <EstadoVacio
          icono="document-text-outline"
          titulo="Esta publicación ya no está disponible"
          mensaje="Es posible que la administración la haya eliminado."
        />
      )}
      {estadoVisible === 'listo' && publicacion && (
        <KeyboardAvoidingView style={styles.flex} behavior="padding">
          <FlatList
            ref={listaRef}
            style={styles.flex}
            data={comentarios}
            keyExtractor={(comentario) => String(comentario.id)}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            refreshControl={
              <RefreshControl
                refreshing={refrescando}
                onRefresh={refrescar}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListHeaderComponent={
              <View>
                <PublicacionCard publicacion={publicacion} />
                <AppText variant="label" style={styles.titulo} accessibilityRole="header">
                  Comentarios
                </AppText>
              </View>
            }
            ListEmptyComponent={
              estadoComentarios === 'listo' ? (
                <EstadoVacio
                  icono="chatbubble-outline"
                  titulo="Aún no hay comentarios"
                  mensaje="Sé el primero en comentar."
                  style={styles.estadoLista}
                />
              ) : undefined
            }
            ListFooterComponent={
              estadoComentarios === 'cargando' && sinComentarios ? (
                <ComentariosSkeleton />
              ) : estadoComentarios === 'error' ? (
                <EstadoError
                  motivo={motivoErrorComentarios}
                  titulo="No pudimos cargar los comentarios"
                  onReintentar={reintentarComentarios}
                  style={styles.estadoLista}
                />
              ) : undefined
            }
          />
          <ComentarioComposer onEnviar={enviar} deshabilitado={!usuarioId} />
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  titulo: {
    paddingHorizontal: 17,
    paddingTop: 14,
    paddingBottom: 4,
  },
  estadoLista: {
    paddingVertical: 28,
  },
});
