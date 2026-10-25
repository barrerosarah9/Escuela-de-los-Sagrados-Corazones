import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { type ColorValue, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

type Props = {
  name: ComponentProps<typeof Ionicons>['name'];
  color: ColorValue;
  focused: boolean;
};

export function TabIcon({ name, color, focused }: Props) {
  return (
    <View style={[styles.pill, focused && styles.pillActive]}>
      <Ionicons name={name} size={20} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    width: 38,
    height: 32,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillActive: {
    backgroundColor: colors.primarySoft,
  },
});
