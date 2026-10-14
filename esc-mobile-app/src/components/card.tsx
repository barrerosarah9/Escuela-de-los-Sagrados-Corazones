import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, radius, shadows } from '../theme';

type Variant = 'surface' | 'accent' | 'primary' | 'sky';

type Props = {
  variant?: Variant;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function Card({ variant = 'surface', children, style, onPress, accessibilityLabel }: Props) {
  const cardStyle = [styles.base, variantStyles[variant], style];

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        style={({ pressed }) => [cardStyle, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }

  return <View style={cardStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  base: {
    padding: 20,
    borderRadius: radius.card,
    gap: 6,
    overflow: 'hidden',
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
});

const variantStyles = StyleSheet.create({
  surface: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    boxShadow: shadows.card,
  },
  accent: {
    backgroundColor: colors.accent,
  },
  primary: {
    backgroundColor: colors.primary,
  },
  sky: {
    backgroundColor: colors.sky,
  },
});
