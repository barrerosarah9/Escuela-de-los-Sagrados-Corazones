import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { fechaCompleta, fechaRelativa } from '../lib/fecha-relativa';
import type { Publicacion } from '../lib/feed';
import { colors, fonts } from '../theme';
import { AppText } from './app-text';
import { PublicacionImagenes } from './publicacion-imagenes';

const NOMBRE_AUTOR = 'Escuela de los Sagrados Corazones';

type Props = {
  publicacion: Publicacion;
  onAbrir?: (publicacionId: number) => void;
};

function textoContador(total: number, singular: string, plural: string) {
  return `${total} ${total === 1 ? singular : plural}`;
}

function PublicacionCardBase({ publicacion, onAbrir }: Props) {
  const { id, texto, imagenes, creadoEn, totalComentarios, totalMeGusta } = publicacion;
  const tieneTexto = texto.trim().length > 0;

  const contenido = (
    <>
      <View style={styles.avatar} accessible={false}>
        <MaterialCommunityIcons name="church" size={22} color={colors.white} />
      </View>

      <View style={styles.cuerpo}>
        <View style={styles.meta}>
          <AppText style={styles.autor} numberOfLines={1}>
            {NOMBRE_AUTOR}
          </AppText>
          <AppText style={styles.detalleMeta}>·</AppText>
          <AppText style={styles.detalleMeta} accessibilityLabel={fechaCompleta(creadoEn)}>
            {fechaRelativa(creadoEn)}
          </AppText>
        </View>

        {tieneTexto && <AppText style={styles.texto}>{texto}</AppText>}

        {imagenes.length > 0 && <PublicacionImagenes publicacionId={id} rutas={imagenes} />}

        <View style={styles.contadores}>
          <View
            style={styles.contador}
            accessible
            accessibilityLabel={textoContador(totalComentarios, 'comentario', 'comentarios')}
          >
            <Ionicons name="chatbubble-outline" size={17} color={colors.textSecondary} />
            <AppText style={styles.numero}>{totalComentarios}</AppText>
          </View>
          <View
            style={styles.contador}
            accessible
            accessibilityLabel={textoContador(totalMeGusta, 'Me gusta', 'Me gusta')}
          >
            <Ionicons name="heart-outline" size={17} color={colors.textSecondary} />
            <AppText style={styles.numero}>{totalMeGusta}</AppText>
          </View>
        </View>
      </View>
    </>
  );

  if (!onAbrir) return <View style={styles.publicacion}>{contenido}</View>;

  return (
    <Pressable
      onPress={() => onAbrir(id)}
      accessibilityRole="button"
      accessibilityHint="Abre la publicación para ver y escribir comentarios"
      style={({ pressed }) => [styles.publicacion, pressed && styles.presionada]}
    >
      {contenido}
    </Pressable>
  );
}

export const PublicacionCard = memo(PublicacionCardBase);

const styles = StyleSheet.create({
  publicacion: {
    flexDirection: 'row',
    gap: 11,
    paddingTop: 15,
    paddingBottom: 9,
    paddingHorizontal: 17,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  presionada: {
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 43,
    height: 43,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuerpo: {
    flex: 1,
    gap: 8,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  autor: {
    flexShrink: 1,
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  detalleMeta: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  texto: {
    fontSize: 14,
    lineHeight: 21,
  },
  contadores: {
    flexDirection: 'row',
    gap: 28,
    paddingVertical: 4,
  },
  contador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  numero: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
