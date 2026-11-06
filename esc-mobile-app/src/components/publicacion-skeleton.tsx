import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Skeleton } from './skeleton';

type Props = {
  conImagen?: boolean;
};

export function PublicacionSkeleton({ conImagen = false }: Props) {
  return (
    <View style={styles.publicacion}>
      <Skeleton width={43} height={43} radius={22} />
      <View style={styles.cuerpo}>
        <Skeleton width="62%" height={12} />
        <View style={styles.lineas}>
          <Skeleton height={12} />
          <Skeleton width="88%" height={12} />
          <Skeleton width="54%" height={12} />
        </View>
        {conImagen && <Skeleton radius={16} style={styles.imagen} />}
        <View style={styles.contadores}>
          <Skeleton width={34} height={14} radius={7} />
          <Skeleton width={34} height={14} radius={7} />
        </View>
      </View>
    </View>
  );
}

type ListaProps = {
  cantidad?: number;
  etiqueta: string;
};

export function ListaPublicacionesSkeleton({ cantidad = 3, etiqueta }: ListaProps) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={etiqueta}
      accessibilityState={{ busy: true }}
    >
      {Array.from({ length: cantidad }, (_, indice) => (
        <PublicacionSkeleton key={indice} conImagen={indice % 2 === 0} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  publicacion: {
    flexDirection: 'row',
    gap: 11,
    paddingTop: 15,
    paddingBottom: 13,
    paddingHorizontal: 17,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.white,
  },
  cuerpo: {
    flex: 1,
    gap: 12,
    paddingTop: 2,
  },
  lineas: {
    gap: 8,
  },
  imagen: {
    aspectRatio: 4 / 3,
  },
  contadores: {
    flexDirection: 'row',
    gap: 28,
  },
});
