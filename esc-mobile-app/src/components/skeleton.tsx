import { useEffect } from 'react';
import { StyleSheet, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { colors } from '../theme';

type Props = {
  width?: DimensionValue;
  height?: DimensionValue;
  radius?: number;
  style?: StyleProp<ViewStyle>;
};

export function Skeleton({ width = '100%', height, radius = 8, style }: Props) {
  const reducirMovimiento = useReducedMotion();
  const opacidad = useSharedValue(1);

  useEffect(() => {
    if (reducirMovimiento) return;
    opacidad.set(
      withRepeat(withTiming(0.4, { duration: 800, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
    return () => cancelAnimation(opacidad);
  }, [opacidad, reducirMovimiento]);

  const estiloAnimado = useAnimatedStyle(() => ({ opacity: opacidad.get() }));

  return (
    <Animated.View
      style={[styles.bloque, { width, height, borderRadius: radius }, estiloAnimado, style]}
    />
  );
}

const styles = StyleSheet.create({
  bloque: {
    backgroundColor: colors.surface,
  },
});
