import type Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  formatosDe,
  obtenerAsignacionesDeHoy,
  obtenerContenidosDeOraciones,
  obtenerContenidosPorId,
  obtenerOracionesDeSeccion,
} from '../lib/oraciones-hoy';
import { useCarga } from '../lib/use-carga';
import { EstadoError } from './estado-error';
import { ListaCarga } from './lista-carga';
import { OpcionOracion, type TonoOpcion } from './opcion-oracion';

type Apariencia = { icono: ComponentProps<typeof Ionicons>['name']; tono: TonoOpcion };

const APARIENCIA: Record<string, Apariencia> = {
  'oracion-iniciar-dia': { icono: 'sunny-outline', tono: 'amarillo' },
  'divina-cita': { icono: 'heart-outline', tono: 'rojo' },
  jaculatorias: { icono: 'sparkles-outline', tono: 'azul' },
  'evangelio-hoy': { icono: 'book-outline', tono: 'tinta' },
  'santo-rosario-hoy': { icono: 'flower-outline', tono: 'rojo' },
  'diario-espiritual': { icono: 'journal-outline', tono: 'azul' },
  'hora-reparacion': { icono: 'time-outline', tono: 'amarillo' },
  'oracion-noche': { icono: 'moon-outline', tono: 'tinta' },
};

async function cargarOracionesDelDia() {
  const [oraciones, asignaciones] = await Promise.all([
    obtenerOracionesDeSeccion('dia'),
    obtenerAsignacionesDeHoy(),
  ]);
  const fijas = oraciones.filter((oracion) => oracion.es_fija).map((oracion) => oracion.id);
  const asignados = oraciones
    .map((oracion) => asignaciones.get(oracion.id))
    .filter((id): id is number => id !== undefined);
  const [deFijas, deHoy] = await Promise.all([
    obtenerContenidosDeOraciones(fijas),
    obtenerContenidosPorId(asignados),
  ]);
  const contenidos = [...deFijas, ...deHoy];
  return oraciones.map((oracion) => ({
    oracion,
    contenidos: contenidos.filter((contenido) => contenido.oracion_id === oracion.id),
  }));
}

export function ListaDia() {
  const carga = useCarga(cargarOracionesDelDia);

  if (carga.estado === 'cargando') return <ListaCarga filas={8} />;

  if (carga.estado === 'error' || !carga.datos) {
    return (
      <EstadoError
        motivo={carga.motivo}
        titulo="No pudimos cargar las oraciones"
        onReintentar={carga.reintentar}
      />
    );
  }

  return (
    <View style={styles.lista}>
      {carga.datos.map(({ oracion, contenidos }) => {
        const apariencia = APARIENCIA[oracion.clave] ?? { icono: 'heart-outline', tono: 'tinta' };
        return (
          <OpcionOracion
            key={oracion.id}
            titulo={oracion.nombre}
            descripcion={formatosDe(contenidos)}
            icono={apariencia.icono}
            tono={apariencia.tono}
            onPress={() =>
              router.push({ pathname: '/detalle-oracion', params: { oracion: oracion.clave } })
            }
          />
        );
      })}
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
