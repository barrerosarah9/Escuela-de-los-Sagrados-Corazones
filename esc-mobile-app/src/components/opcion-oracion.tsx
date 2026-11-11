import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts } from '../theme';
import { AppText } from './app-text';

export type TonoOpcion = 'amarillo' | 'rojo' | 'azul' | 'tinta';

type Props = {
  titulo: string;
  descripcion: string;
  icono?: ComponentProps<typeof Ionicons>['name'];
  numero?: string;
  tono?: TonoOpcion;
  insignia?: string;
  habilitada?: boolean;
  onPress?: () => void;
};

const FONDOS_ICONO: Record<TonoOpcion, string> = {
  amarillo: colors.accentLight,
  rojo: colors.primarySoft,
  azul: colors.skyLight,
  tinta: colors.surface,
};

const COLORES_ICONO: Record<TonoOpcion, string> = {
  amarillo: '#9A7414',
  rojo: colors.primary,
  azul: colors.link,
  tinta: colors.text,
};

export function OpcionOracion({
  titulo,
  descripcion,
  icono,
  numero,
  tono = 'tinta',
  insignia,
  habilitada = true,
  onPress,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${descripcion}`}
      accessibilityState={{ disabled: !habilitada }}
      disabled={!habilitada}
      onPress={onPress}
      style={({ pressed }) => [
        styles.opcion,
        insignia && habilitada && styles.destacada,
        !habilitada && styles.bloqueada,
        pressed && styles.presionada,
      ]}
    >
      {numero ? (
        <View style={[styles.numero, habilitada && insignia && styles.numeroActivo]}>
          <AppText style={[styles.numeroTexto, habilitada && insignia && styles.numeroTextoActivo]}>
            {numero}
          </AppText>
        </View>
      ) : (
        <View style={[styles.icono, { backgroundColor: FONDOS_ICONO[tono] }]}>
          {icono ? <Ionicons name={icono} size={21} color={COLORES_ICONO[tono]} /> : null}
        </View>
      )}
      <View style={styles.textos}>
        <AppText style={styles.titulo} numberOfLines={2}>
          {titulo}
        </AppText>
        <AppText style={styles.descripcion} numberOfLines={2}>
          {descripcion}
        </AppText>
      </View>
      {insignia && habilitada ? (
        <View style={styles.insignia}>
          <AppText style={styles.insigniaTexto}>{insignia}</AppText>
        </View>
      ) : habilitada ? (
        <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
      ) : (
        <Ionicons name="lock-closed-outline" size={18} color={colors.tabInactive} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  opcion: {
    minHeight: 72,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  destacada: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(161, 30, 33, 0.04)',
  },
  bloqueada: {
    backgroundColor: colors.surface,
    borderColor: 'transparent',
    opacity: 0.75,
  },
  presionada: {
    transform: [{ scale: 0.98 }],
  },
  icono: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numero: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
  },
  numeroActivo: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  numeroTexto: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: colors.textSecondary,
  },
  numeroTextoActivo: {
    color: colors.white,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.text,
  },
  descripcion: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 16,
    color: colors.textSecondary,
  },
  insignia: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.primary,
  },
  insigniaTexto: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1,
    color: colors.white,
  },
});
