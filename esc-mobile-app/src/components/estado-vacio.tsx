import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { EstadoMensaje, type NombreIcono } from './estado-mensaje';

type Props = {
  icono?: NombreIcono;
  titulo: string;
  mensaje?: string;
  accion?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

export function EstadoVacio({ icono = 'leaf-outline', titulo, mensaje, accion, style }: Props) {
  return (
    <EstadoMensaje tono="informativo" icono={icono} titulo={titulo} mensaje={mensaje} style={style}>
      {accion}
    </EstadoMensaje>
  );
}
