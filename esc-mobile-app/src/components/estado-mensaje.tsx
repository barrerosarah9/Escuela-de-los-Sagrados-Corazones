import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps, ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme';
import { AppText } from './app-text';

export type NombreIcono = ComponentProps<typeof Ionicons>['name'];

type Tono = 'error' | 'informativo';

type Props = {
  tono: Tono;
  icono: NombreIcono;
  titulo: string;
  mensaje?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

const fondoIcono: Record<Tono, string> = {
  error: colors.primarySoft,
  informativo: colors.skyLight,
};

const colorIcono: Record<Tono, string> = {
  error: colors.primary,
  informativo: colors.link,
};

const colorTitulo: Record<Tono, string> = {
  error: colors.primary,
  informativo: colors.text,
};

export function EstadoMensaje({ tono, icono, titulo, mensaje, children, style }: Props) {
  return (
    <View style={[styles.contenedor, style]}>
      <View style={[styles.icono, { backgroundColor: fondoIcono[tono] }]} accessible={false}>
        <Ionicons name={icono} size={30} color={colorIcono[tono]} />
      </View>
      <AppText
        variant="subtitle"
        color={colorTitulo[tono]}
        style={styles.centrado}
        accessibilityRole="header"
      >
        {titulo}
      </AppText>
      {mensaje ? (
        <AppText color={colors.textSecondary} style={styles.centrado}>
          {mensaje}
        </AppText>
      ) : null}
      {children ? <View style={styles.acciones}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  icono: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  centrado: {
    textAlign: 'center',
  },
  acciones: {
    alignSelf: 'stretch',
    marginTop: 10,
  },
});
