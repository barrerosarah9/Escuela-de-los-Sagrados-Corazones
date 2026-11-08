import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { AppText } from './app-text';
import { DestacadosInicio } from './destacados-inicio';

type Props = {
  oracionEnVivo?: ReactNode;
};

export function FeedEncabezado({ oracionEnVivo }: Props) {
  return (
    <View>
      <DestacadosInicio />
      {oracionEnVivo ? <View style={styles.oracionEnVivo}>{oracionEnVivo}</View> : null}
      <View style={styles.comunidad}>
        <AppText variant="eyebrow">Comunidad</AppText>
        <AppText variant="title" accessibilityRole="header">
          Mantente al día con la comunidad
        </AppText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  oracionEnVivo: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  comunidad: {
    gap: 5,
    paddingHorizontal: 24,
    paddingTop: 18,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
