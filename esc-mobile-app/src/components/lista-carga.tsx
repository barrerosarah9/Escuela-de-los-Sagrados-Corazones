import { StyleSheet, View } from 'react-native';
import { Skeleton } from './skeleton';

type Props = {
  filas?: number;
};

export function ListaCarga({ filas = 5 }: Props) {
  return (
    <View
      style={styles.lista}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando oraciones"
    >
      {Array.from({ length: filas }, (_, indice) => (
        <Skeleton key={indice} height={72} radius={20} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  lista: {
    gap: 10,
    paddingHorizontal: 14,
    paddingTop: 20,
  },
});
