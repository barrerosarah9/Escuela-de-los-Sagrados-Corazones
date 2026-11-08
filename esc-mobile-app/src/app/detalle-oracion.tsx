import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, type ComponentProps } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { BackHeader } from '../components/back-header';
import { EstadoError } from '../components/estado-error';
import { EstadoVacio } from '../components/estado-vacio';
import { ListaCarga } from '../components/lista-carga';
import {
  obtenerAsignacionesDeHoy,
  obtenerContenidosDeOraciones,
  obtenerContenidosPorId,
  obtenerOracionesPorClave,
  type ContenidoOracion,
  type SeccionCatalogo,
} from '../lib/oraciones-hoy';
import { useCarga } from '../lib/use-carga';
import { colors, fonts } from '../theme';

const ETIQUETAS: Partial<Record<SeccionCatalogo, string>> = {
  dia: 'Oración de la jornada',
  semana: 'Oficio semanal',
  mes: 'Oración del mes',
};

async function cargarDetalle(clave: string, contenidoId: number | null) {
  const [oracion] = await obtenerOracionesPorClave([clave]);
  if (!oracion) return null;

  let contenidos: ContenidoOracion[];
  if (contenidoId) {
    contenidos = await obtenerContenidosPorId([contenidoId]);
  } else if (oracion.es_fija) {
    contenidos = await obtenerContenidosDeOraciones([oracion.id]);
  } else {
    const asignado = (await obtenerAsignacionesDeHoy()).get(oracion.id);
    contenidos = asignado ? await obtenerContenidosPorId([asignado]) : [];
  }

  return {
    oracion,
    contenidos: contenidos.filter((contenido) => contenido.oracion_id === oracion.id),
  };
}

function Formato({
  icono,
  titulo,
}: {
  icono: ComponentProps<typeof Ionicons>['name'];
  titulo: string;
}) {
  return (
    <View style={styles.formato}>
      <View style={styles.formatoIcono}>
        <Ionicons name={icono} size={20} color={colors.primary} />
      </View>
      <View style={styles.formatoTextos}>
        <AppText style={styles.formatoTitulo}>{titulo}</AppText>
        <AppText variant="caption">Disponible pronto</AppText>
      </View>
    </View>
  );
}

function TarjetaContenido({
  contenido,
  mostrarNombre,
}: {
  contenido: ContenidoOracion;
  mostrarNombre: boolean;
}) {
  return (
    <View style={styles.tarjeta}>
      {mostrarNombre ? <AppText style={styles.nombre}>{contenido.nombre}</AppText> : null}
      {contenido.youtube_url ? (
        <Formato icono="logo-youtube" titulo="Haz la oración con nuestro video de YouTube" />
      ) : null}
      {contenido.pdf_path ? (
        <Formato icono="document-text-outline" titulo="Haz la oración con nuestro PDF" />
      ) : null}
      {contenido.imagen_path ? (
        <Formato icono="image-outline" titulo="Imagen de la oración" />
      ) : null}
    </View>
  );
}

export default function DetalleOracionScreen() {
  const { oracion, contenido } = useLocalSearchParams<{ oracion: string; contenido?: string }>();
  const clave = typeof oracion === 'string' ? oracion : '';
  const numero = Number(contenido);
  const contenidoId = Number.isInteger(numero) && numero > 0 ? numero : null;
  const carga = useCarga(
    useCallback(() => cargarDetalle(clave, contenidoId), [clave, contenidoId]),
  );

  const renderCuerpo = () => {
    if (carga.estado === 'cargando') return <ListaCarga filas={2} />;
    if (carga.estado === 'error') {
      return (
        <EstadoError
          motivo={carga.motivo}
          titulo="No pudimos cargar la oración"
          onReintentar={carga.reintentar}
        />
      );
    }
    if (!carga.datos) {
      return (
        <EstadoVacio
          icono="compass-outline"
          titulo="No encontramos esta oración"
          mensaje="Vuelve a la pestaña Oración y elige otra."
        />
      );
    }

    const { oracion: datosOracion, contenidos } = carga.datos;
    const unico = contenidos.length === 1 ? contenidos[0] : null;

    return (
      <>
        <View style={styles.encabezado}>
          <AppText variant="eyebrow">{ETIQUETAS[datosOracion.seccion] ?? 'Oración'}</AppText>
          <AppText variant="display" accessibilityRole="header">
            {datosOracion.nombre}
          </AppText>
          {unico && unico.nombre !== datosOracion.nombre ? (
            <AppText variant="subtitle">{unico.nombre}</AppText>
          ) : null}
          {contenidos.length > 0 ? (
            <AppText color={colors.textSecondary}>
              Haz silencio, respira y prepara el corazón.
            </AppText>
          ) : null}
        </View>
        {contenidos.length === 0 ? (
          <EstadoVacio
            icono="time-outline"
            titulo="Esta oración estará disponible próximamente."
            mensaje="Estamos preparando este espacio con cuidado para acompañar tu oración."
          />
        ) : (
          <View style={styles.contenidos}>
            {contenidos.map((item) => (
              <TarjetaContenido key={item.id} contenido={item} mostrarNombre={!unico} />
            ))}
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.pantalla} edges={['top', 'left', 'right', 'bottom']}>
      <BackHeader />
      <ScrollView
        contentContainerStyle={styles.contenido}
        refreshControl={
          <RefreshControl
            refreshing={carga.refrescando}
            onRefresh={carga.refrescar}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {renderCuerpo()}
      </ScrollView>
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
  contenidos: {
    gap: 12,
    paddingHorizontal: 14,
    paddingTop: 22,
  },
  tarjeta: {
    gap: 10,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  nombre: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  formato: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  formatoIcono: {
    width: 40,
    height: 40,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  formatoTextos: {
    flex: 1,
    gap: 2,
  },
  formatoTitulo: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 14,
    lineHeight: 19,
    color: colors.text,
  },
});
