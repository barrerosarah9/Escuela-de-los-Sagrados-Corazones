import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts } from '../theme';
import { AppText } from './app-text';

type Props = {
  icon: ComponentProps<typeof Ionicons>['name'];
  title: string;
  description?: string;
  tone?: 'default' | 'danger';
  showChevron?: boolean;
  disabled?: boolean;
  onPress: () => void;
};

const AZUL_ICONO = '#315F7E';

export function MenuRow({
  icon,
  title,
  description,
  tone = 'default',
  showChevron = true,
  disabled = false,
  onPress,
}: Props) {
  const peligro = tone === 'danger';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, disabled && styles.disabled]}
    >
      <View style={[styles.icon, peligro && styles.iconDanger]}>
        <Ionicons name={icon} size={19} color={peligro ? colors.primary : AZUL_ICONO} />
      </View>
      <View style={styles.texts}>
        <AppText style={[styles.title, peligro && styles.titleDanger]}>{title}</AppText>
        {description ? (
          <AppText variant="caption" style={styles.description}>
            {description}
          </AppText>
        ) : null}
      </View>
      {showChevron ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
      ) : null}
    </Pressable>
  );
}

export function MenuSeparator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  pressed: {
    backgroundColor: 'rgba(25, 14, 14, 0.04)',
  },
  disabled: {
    opacity: 0.5,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.skyLight,
  },
  iconDanger: {
    backgroundColor: colors.errorSoft,
  },
  texts: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  titleDanger: {
    color: colors.primary,
  },
  description: {
    color: colors.textSecondary,
  },
  separator: {
    height: 1,
    marginLeft: 68,
    backgroundColor: colors.border,
  },
});
