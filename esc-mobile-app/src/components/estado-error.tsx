import type { StyleProp, ViewStyle } from 'react-native';
import { Button } from './button';
import { EstadoMensaje } from './estado-mensaje';

export type MotivoError = 'sin_conexion' | 'desconocido';

type Props = {
  motivo?: MotivoError;
  titulo?: string;
  mensaje?: string;
  onReintentar: () => void;
  reintentando?: boolean;
  style?: StyleProp<ViewStyle>;
};

const MENSAJES: Record<MotivoError, string> = {
  sin_conexion: 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
  desconocido: 'Algo salió mal de nuestro lado. Inténtalo de nuevo en unos minutos.',
};

export function EstadoError({
  motivo = 'desconocido',
  titulo = 'No pudimos cargar la información',
  mensaje,
  onReintentar,
  reintentando = false,
  style,
}: Props) {
  return (
    <EstadoMensaje
      tono="error"
      icono={motivo === 'sin_conexion' ? 'cloud-offline-outline' : 'alert-circle-outline'}
      titulo={titulo}
      mensaje={mensaje ?? MENSAJES[motivo]}
      style={style}
    >
      <Button title="Reintentar" onPress={onReintentar} loading={reintentando} />
    </EstadoMensaje>
  );
}
