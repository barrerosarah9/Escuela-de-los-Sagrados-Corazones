import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, fonts, radius, shadows } from '../theme';

type Variant = 'primary' | 'secondary' | 'accent' | 'social';

type Props = Omit<PressableProps, 'style' | 'children'> & {
  title: string;
  variant?: Variant;
  icon?: ReactNode;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
};

const textColor: Record<Variant, string> = {
  primary: colors.white,
  secondary: colors.primary,
  accent: colors.text,
  social: colors.text,
};

export function Button({
  title,
  variant = 'primary',
  icon,
  loading = false,
  disabled,
  style,
  ...rest
}: Props) {
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        variantStyles[variant],
        pressed && styles.pressed,
        pressed && variant === 'primary' && styles.primaryPressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={textColor[variant]} />
      ) : (
        <View style={styles.content}>
          {icon}
          <Text style={[styles.label, { color: textColor[variant] }]}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    paddingHorizontal: 20,
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  label: {
    fontFamily: fonts.sansBold,
    fontSize: 15,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
  },
  primaryPressed: {
    backgroundColor: colors.primaryDark,
  },
  disabled: {
    opacity: 0.5,
  },
});

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    boxShadow: shadows.primaryButton,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  accent: {
    alignSelf: 'flex-start',
    minHeight: 44,
    paddingHorizontal: 18,
    backgroundColor: colors.accent,
  },
  social: {
    minHeight: 50,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
