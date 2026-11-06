import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { fechaCompleta, fechaRelativa } from '../lib/fecha-relativa';
import { colors, fonts } from '../theme';
import { AppText } from './app-text';
import { Avatar } from './avatar';

type Props = {
  nombre: string;
  fotoPath: string | null;
  texto: string;
  creadoEn: string;
};

function ComentarioItemBase({ nombre, fotoPath, texto, creadoEn }: Props) {
  return (
    <View style={styles.comentario}>
      <Avatar nombre={nombre} fotoPath={fotoPath} tamano={34} />
      <View style={styles.cuerpo}>
        <View style={styles.meta}>
          <AppText style={styles.nombre} numberOfLines={1}>
            {nombre}
          </AppText>
          <AppText style={styles.fecha}>·</AppText>
          <AppText style={styles.fecha} accessibilityLabel={fechaCompleta(creadoEn)}>
            {fechaRelativa(creadoEn)}
          </AppText>
        </View>
        <AppText style={styles.texto}>{texto}</AppText>
      </View>
    </View>
  );
}

export const ComentarioItem = memo(ComentarioItemBase);

const styles = StyleSheet.create({
  comentario: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 17,
  },
  cuerpo: {
    flex: 1,
    gap: 3,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  nombre: {
    flexShrink: 1,
    fontFamily: fonts.sansBold,
    fontSize: 13,
  },
  fecha: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  texto: {
    fontSize: 14,
    lineHeight: 20,
  },
});
