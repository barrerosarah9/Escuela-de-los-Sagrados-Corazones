import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { BackHeader } from '../../components/back-header';
import { ComentarioComposer } from '../../components/comentario-composer';
import { ComentarioItem } from '../../components/comentario-item';
import { EstadoError } from '../../components/estado-error';
import { EstadoVacio } from '../../components/estado-vacio';
import { PublicacionCard } from '../../components/publicacion-card';
import { PublicacionSkeleton } from '../../components/publicacion-skeleton';
import { crearComentario, type Comentario } from '../../lib/comentarios';
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

type Autor = { nombre: string; fotoPath: string | null };

export default function PublicacionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const publicacionId = Number(id);
  const idValido = Number.isInteger(publicacionId) && publicacionId > 0;
  const { session } = useSession();
  const usuarioId = session?.user.id;
  const listaRef = useRef<FlatList<Comentario>>(null);
  const [estado, setEstado] = useState<Estado>('cargando');
  const [motivoError, setMotivoError] = useState<MotivoErrorFeed>('desconocido');
  const [publicacion, setPublicacion] = useState<Publicacion | null>(null);
  const [recientes, setRecientes] = useState<Comentario[]>([]);
  const [autor, setAutor] = useState<Autor>({ nombre: 'Tú', fotoPath: null });
  const [intento, setIntento] = useState(0);

  useEffect(() => {
    if (!idValido) return;
    let activo = true;
    obtenerPublicacion(publicacionId)
      .then((encontrada) => {
        if (!activo) return;
        setPublicacion(encontrada);
        setEstado(encontrada ? 'listo' : 'no_encontrada');
      })
      .catch((error: unknown) => {
        if (!activo) return;
        setMotivoError(error instanceof ErrorFeed ? error.motivo : 'desconocido');
        setEstado('error');
      });
    return () => {
      activo = false;
    };
  }, [idValido, publicacionId, intento]);

  useEffect(() => {
    if (!usuarioId) return;
    let activo = true;
    obtenerPerfil(usuarioId)
      .then((perfil) => {
        if (activo && perfil) setAutor({ nombre: perfil.nombre, fotoPath: perfil.foto_path });
      })
      .catch(() => undefined);
    return () => {
      activo = false;
    };
  }, [usuarioId]);

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
    setIntento((actual) => actual + 1);
  }, []);

  const estadoVisible: Estado = idValido ? estado : 'no_encontrada';

  const renderItem = useCallback(
    ({ item }: { item: Comentario }) => (
      <ComentarioItem
        nombre={autor.nombre}
        fotoPath={autor.fotoPath}
        texto={item.texto}
        creadoEn={item.creadoEn}
      />
    ),
    [autor],
  );

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
            data={recientes}
            keyExtractor={(comentario) => String(comentario.id)}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            ListHeaderComponent={
              <View>
                <PublicacionCard publicacion={publicacion} />
                <AppText variant="label" style={styles.titulo} accessibilityRole="header">
                  Comentarios
                </AppText>
              </View>
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
});
