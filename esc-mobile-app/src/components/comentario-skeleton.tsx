import { StyleSheet, View } from 'react-native';
import { Skeleton } from './skeleton';

const FILAS = ['70%', '92%', '55%'] as const;

export function ComentariosSkeleton() {
  return (
    <View accessible accessibilityLabel="Cargando comentarios">
      {FILAS.map((ancho) => (
        <View key={ancho} style={styles.fila}>
          <Skeleton width={34} height={34} radius={17} />
          <View style={styles.cuerpo}>
            <Skeleton width="38%" height={11} />
            <Skeleton width={ancho} height={12} />
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  fila: {
    flexDirection: 'row',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 17,
  },
  cuerpo: {
    flex: 1,
    gap: 7,
    paddingTop: 2,
  },
});
