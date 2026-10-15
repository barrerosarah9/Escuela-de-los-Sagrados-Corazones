import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '../theme';
import { AppText } from './app-text';

type Props = {
  size?: 'compact' | 'full';
};

export function Logo({ size = 'compact' }: Props) {
  const full = size === 'full';

  return (
    <View
      accessible
      accessibilityLabel="Escuela de los Sagrados Corazones de Jesús y de María"
      style={[styles.logo, full ? styles.logoFull : styles.logoCompact]}
    >
      <View style={[styles.mark, full ? styles.markFull : styles.markCompact]}>
        <MaterialCommunityIcons name="church" size={full ? 36 : 22} color={colors.white} />
      </View>
      {full ? (
        <View style={styles.fullText}>
          <AppText style={styles.prefix}>ESCUELA DE LOS</AppText>
          <AppText style={styles.nameFull}>Sagrados Corazones</AppText>
          <AppText style={styles.suffix}>DE JESÚS Y DE MARÍA</AppText>
        </View>
      ) : (
        <AppText style={styles.nameCompact}>Escuela de los Sagrados Corazones</AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  logo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoFull: {
    gap: 13,
  },
  logoCompact: {
    gap: 8,
  },
  mark: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markFull: {
    width: 67,
    height: 67,
    borderRadius: 34,
  },
  markCompact: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  fullText: {
    maxWidth: 245,
  },
  prefix: {
    fontFamily: fonts.sansBold,
    fontSize: 7,
    letterSpacing: 0.84,
    color: colors.primary,
    marginBottom: 4,
  },
  nameFull: {
    fontFamily: fonts.serif,
    fontSize: 25,
    lineHeight: 26,
    color: colors.primary,
  },
  suffix: {
    fontFamily: fonts.sansBold,
    fontSize: 7,
    letterSpacing: 1.26,
    marginTop: 4,
  },
  nameCompact: {
    fontFamily: fonts.serif,
    fontSize: 13,
    letterSpacing: -0.26,
    color: colors.primary,
  },
});
