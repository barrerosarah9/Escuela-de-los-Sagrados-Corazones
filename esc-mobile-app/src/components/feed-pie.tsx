import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts } from '../theme';
import { AppText } from './app-text';

type Props = {
  cargandoMas: boolean;
  errorAlCargarMas: boolean;
  hayMas: boolean;
  hayPublicaciones: boolean;
  onReintentar: () => void;
};

export function FeedPie({
  cargandoMas,
  errorAlCargarMas,
  hayMas,
  hayPublicaciones,
  onReintentar,
}: Props) {
  if (cargandoMas) {
    return (
      <View style={styles.pie}>
        <ActivityIndicator color={colors.primary} accessibilityLabel="Cargando más publicaciones" />
      </View>
    );
  }

  if (errorAlCargarMas) {
    return (
      <View style={styles.pie}>
        <AppText variant="caption">No pudimos cargar más publicaciones.</AppText>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={onReintentar}>
          <AppText style={styles.enlace}>Reintentar</AppText>
        </Pressable>
      </View>
    );
  }

  if (!hayMas && hayPublicaciones) {
    return (
      <View style={styles.pie}>
        <AppText variant="caption">Ya viste todas las publicaciones.</AppText>
      </View>
    );
  }

  return <View style={styles.espacio} />;
}

const styles = StyleSheet.create({
  pie: {
    alignItems: 'center',
    gap: 6,
    paddingVertical: 24,
  },
  enlace: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.link,
  },
  espacio: {
    height: 24,
  },
});
