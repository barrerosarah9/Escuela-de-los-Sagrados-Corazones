import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '../theme';
import { AppText } from './app-text';

type Props = {
  message: string;
  icon?: ComponentProps<typeof Ionicons>['name'];
  children?: ReactNode;
};

export function FormAlert({ message, icon = 'alert-circle-outline', children }: Props) {
  return (
    <View accessibilityRole="alert" accessibilityLiveRegion="polite" style={styles.alert}>
      <View style={styles.messageRow}>
        <Ionicons name={icon} size={14} color={colors.primary} />
        <AppText style={styles.message}>{message}</AppText>
      </View>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  alert: {
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 13,
    backgroundColor: 'rgba(161, 30, 33, 0.055)',
    alignItems: 'center',
    gap: 6,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  message: {
    flexShrink: 1,
    fontFamily: fonts.sansSemiBold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.primary,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 16,
  },
});
