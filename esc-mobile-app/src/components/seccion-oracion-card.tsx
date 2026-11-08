import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, radius } from '../theme';
import { AppText } from './app-text';

export type TonoSeccion = 'amarillo' | 'rojo' | 'azul';

type Props = {
  icono: ComponentProps<typeof Ionicons>['name'];
  etiqueta: string;
  titulo: string;
  descripcion: string;
  tono: TonoSeccion;
  onPress: () => void;
};

const FONDOS: Record<TonoSeccion, string> = {
  amarillo: colors.accent,
  rojo: colors.primary,
  azul: colors.sky,
};

export function SeccionOracionCard({ icono, etiqueta, titulo, descripcion, tono, onPress }: Props) {
  const oscuro = tono === 'rojo';
  const colorTexto = oscuro ? colors.white : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${titulo}. ${descripcion}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tarjeta,
        { backgroundColor: FONDOS[tono] },
        pressed && styles.presionada,
      ]}
    >
      <View style={[styles.anillos, oscuro && styles.anillosDorados]} />
      <View style={[styles.icono, oscuro && styles.iconoOscuro]}>
        <Ionicons name={icono} size={28} color={colorTexto} />
      </View>
      <View style={styles.textos}>
        <AppText style={[styles.etiqueta, { color: colorTexto }]}>{etiqueta}</AppText>
        <AppText style={[styles.titulo, { color: colorTexto }]} numberOfLines={1}>
          {titulo}
        </AppText>
        <AppText style={[styles.descripcion, { color: colorTexto }]}>{descripcion}</AppText>
      </View>
      <Ionicons name="chevron-forward" size={24} color={colorTexto} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    minHeight: 150,
    padding: 20,
    borderRadius: radius.card,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  presionada: {
    transform: [{ scale: 0.98 }],
  },
  anillos: {
    position: 'absolute',
    width: 175,
    height: 175,
    right: -68,
    top: -82,
    borderRadius: 88,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    boxShadow:
      '0px 0px 0px 24px rgba(255, 255, 255, 0.08), 0px 0px 0px 48px rgba(255, 255, 255, 0.045)',
  },
  anillosDorados: {
    borderColor: 'rgba(224, 188, 88, 0.28)',
    boxShadow:
      '0px 0px 0px 24px rgba(224, 188, 88, 0.055), 0px 0px 0px 48px rgba(224, 188, 88, 0.03)',
  },
  icono: {
    width: 49,
    height: 49,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
  },
  iconoOscuro: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
  },
  textos: {
    flex: 1,
    gap: 4,
  },
  etiqueta: {
    fontFamily: fonts.sansBold,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  titulo: {
    fontFamily: fonts.serif,
    fontSize: 25,
    lineHeight: 29,
    letterSpacing: -1,
  },
  descripcion: {
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.75,
  },
});
