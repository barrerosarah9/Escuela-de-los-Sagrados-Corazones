import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';
import { Skeleton } from './skeleton';

function FilaSkeleton() {
  return (
    <View style={styles.fila}>
      <Skeleton width={18} height={18} radius={9} />
      <View style={styles.filaTextos}>
        <Skeleton width={70} height={10} />
        <Skeleton width="65%" height={14} />
      </View>
    </View>
  );
}

export function PerfilSkeleton() {
  return (
    <View
      style={styles.contenedor}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="Cargando tu perfil"
      accessibilityState={{ busy: true }}
    >
      <View style={styles.encabezado}>
        <Skeleton width={84} height={84} radius={42} style={styles.avatar} />
        <Skeleton width={180} height={28} radius={10} />
      </View>

      <Skeleton height={70} radius={20} />

      <View style={styles.seccion}>
        <Skeleton width={110} height={10} />
        <View style={styles.tarjeta}>
          <FilaSkeleton />
          <View style={styles.separador} />
          <FilaSkeleton />
          <View style={styles.separador} />
          <FilaSkeleton />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  contenedor: {
    gap: 24,
  },
  encabezado: {
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    marginBottom: 8,
  },
  seccion: {
    gap: 10,
  },
  tarjeta: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  fila: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  filaTextos: {
    flex: 1,
    gap: 6,
  },
  separador: {
    height: 1,
    marginLeft: 48,
    backgroundColor: colors.border,
  },
});
