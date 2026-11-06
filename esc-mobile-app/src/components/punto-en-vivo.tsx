import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
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

export function PuntoEnVivo() {
  const reducirMovimiento = useReducedMotion();
  const opacidad = useSharedValue(1);

  useEffect(() => {
    if (reducirMovimiento) return;
    opacidad.set(
      withRepeat(withTiming(0.28, { duration: 750, easing: Easing.inOut(Easing.ease) }), -1, true),
    );
    return () => cancelAnimation(opacidad);
  }, [opacidad, reducirMovimiento]);

  const estiloAnimado = useAnimatedStyle(() => ({ opacity: opacidad.get() }));

  return (
    <Animated.View
      style={[styles.punto, estiloAnimado]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const styles = StyleSheet.create({
  punto: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
});
