import { router, useLocalSearchParams } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { BackHeader } from '../../components/back-header';
import { EstadoError } from '../../components/estado-error';
import { EstadoVacio } from '../../components/estado-vacio';
import { ListaCarga } from '../../components/lista-carga';
import { OpcionOracion } from '../../components/opcion-oracion';
import {
  numeroDeVariante,
  obtenerAsignacionesDeHoy,
  obtenerContenidosDeOraciones,
  obtenerOracionesPorClave,
  ordenarConHabilitadoPrimero,
} from '../../lib/oraciones-hoy';
import { oficioDelMes, type OficioDelMes } from '../../lib/oraciones-mes';
import { useCarga } from '../../lib/use-carga';
import { colors } from '../../theme';

async function cargarVariantes(oficio: OficioDelMes) {
  const [oraciones, asignaciones] = await Promise.all([
    obtenerOracionesPorClave(oficio.claves),
    obtenerAsignacionesDeHoy(),
  ]);
  const contenidos = await obtenerContenidosDeOraciones(oraciones.map((oracion) => oracion.id));
  return oraciones.map((oracion) => ({
    oracion,
    contenidos: contenidos.filter((contenido) => contenido.oracion_id === oracion.id),
    habilitadoId: asignaciones.get(oracion.id),
  }));
}

function VariantesDelMes({ oficio }: { oficio: OficioDelMes }) {
  const carga = useCarga(useCallback(() => cargarVariantes(oficio), [oficio]));
  const variasListas = oficio.claves.length > 1;

  if (carga.estado === 'cargando') return <ListaCarga />;

  if (carga.estado === 'error' || !carga.datos) {
    return (
      <EstadoError
        motivo={carga.motivo}
        titulo="No pudimos cargar las variantes"
        onReintentar={carga.reintentar}
      />
    );
  }

  return (
    <View style={styles.grupos}>
      {carga.datos.map(({ oracion, contenidos, habilitadoId }) => (
        <View key={oracion.id} style={styles.grupo}>
          <View style={styles.encabezadoGrupo}>
            <AppText variant="eyebrow">{variasListas ? 'Oración' : 'Variantes'}</AppText>
            <AppText variant="subtitle" color={colors.text} accessibilityRole="header">
              {oracion.nombre}
            </AppText>
          </View>
          {contenidos.length === 0 ? (
            <AppText color={colors.textSecondary}>Aún no hay variantes de esta oración.</AppText>
          ) : (
            ordenarConHabilitadoPrimero(contenidos, habilitadoId).map((contenido) => {
              const habilitada = contenido.id === habilitadoId;
              return (
                <OpcionOracion
                  key={contenido.id}
                  numero={numeroDeVariante(contenido, contenidos.indexOf(contenido))}
                  titulo={contenido.nombre}
                  descripcion={
                    habilitada ? 'Disponible este mes' : 'Disponible en el mes correspondiente'
                  }
                  insignia="ESTE MES"
                  habilitada={habilitada}
                  onPress={() =>
                    router.push({
                      pathname: '/detalle-oracion',
                      params: { oracion: oracion.clave, contenido: String(contenido.id) },
                    })
                  }
                />
              );
            })
          )}
        </View>
      ))}
    </View>
  );
}

export default function OracionDelMesScreen() {
  const { dia } = useLocalSearchParams<{ dia: string }>();
  const oficio = oficioDelMes(dia);

  return (
    <SafeAreaView style={styles.pantalla} edges={['top', 'left', 'right', 'bottom']}>
      <BackHeader />
      {oficio ? (
        <ScrollView contentContainerStyle={styles.contenido}>
          <View style={styles.encabezado}>
            <AppText variant="eyebrow">Variantes del mes</AppText>
            <AppText variant="display" accessibilityRole="header">
              {oficio.titulo}
            </AppText>
            <AppText color={colors.textSecondary}>
              Solo la variante correspondiente a este mes está disponible.
            </AppText>
          </View>
          <VariantesDelMes oficio={oficio} />
        </ScrollView>
      ) : (
        <EstadoVacio
          icono="compass-outline"
          titulo="No encontramos esta oración"
          mensaje="Vuelve a Santifica tu mes y elige una de las oraciones."
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contenido: {
    paddingBottom: 32,
  },
  encabezado: {
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  grupos: {
    gap: 26,
    paddingTop: 22,
  },
  grupo: {
    gap: 10,
    paddingHorizontal: 14,
  },
  encabezadoGrupo: {
    gap: 4,
    paddingHorizontal: 10,
  },
});
