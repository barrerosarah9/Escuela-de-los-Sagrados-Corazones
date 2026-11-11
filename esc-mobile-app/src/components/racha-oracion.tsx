import Ionicons from '@expo/vector-icons/Ionicons';
import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '../theme';
import { AppText } from './app-text';

type Props = {
  dias: number;
};

const COLOR_LLAMA = '#D49A27';

export function RachaOracion({ dias }: Props) {
  const vacia = dias === 0;

  return (
    <View
      style={[styles.contenedor, vacia && styles.contenedorVacio]}
      accessible
      accessibilityRole="text"
    >
      <Ionicons name="flame" size={22} color={COLOR_LLAMA} />
      {vacia ? (
        <AppText style={[styles.texto, styles.textoVacio]}>
          Aún no tienes días de oración. Abre una oración de Santifica el día para empezar tu racha.
        </AppText>
      ) : (
        <AppText style={styles.texto}>
          <AppText style={styles.dias}>{dias === 1 ? '1 día' : `${dias} días`}</AppText> cerca de
          Él, ¡la constancia es una gran virtud!
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    minHeight: 40,
    marginHorizontal: -12,
    paddingBottom: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  contenedorVacio: {
    alignItems: 'flex-start',
  },
  texto: {
    flexShrink: 1,
    fontFamily: fonts.serif,
    fontSize: 14,
    lineHeight: 22,
    letterSpacing: -0.6,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  textoVacio: {
    lineHeight: 19,
    textAlign: 'left',
  },
  dias: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    letterSpacing: -0.5,
    color: colors.text,
  },
});
