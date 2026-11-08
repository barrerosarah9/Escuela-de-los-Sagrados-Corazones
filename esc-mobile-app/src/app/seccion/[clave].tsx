import { Redirect, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { BackHeader } from '../../components/back-header';
import { EstadoVacio } from '../../components/estado-vacio';
import { ListaDia } from '../../components/lista-dia';
import { ListaMes } from '../../components/lista-mes';
import { ListaSemana } from '../../components/lista-semana';
import { diaSemanaIso } from '../../lib/oraciones-hoy';
import {
  descripcionSeccion,
  diaDeHoy,
  esClaveSeccion,
  ETIQUETAS_SECCION,
  tituloSeccion,
} from '../../lib/secciones-oracion';
import { colors } from '../../theme';

const SABADO = 6;

export default function SeccionScreen() {
  const { clave } = useLocalSearchParams<{ clave: string }>();

  if (!esClaveSeccion(clave)) {
    return (
      <SafeAreaView style={styles.pantalla} edges={['top', 'left', 'right', 'bottom']}>
        <BackHeader />
        <EstadoVacio
          icono="compass-outline"
          titulo="No encontramos esta sección"
          mensaje="Vuelve a la pestaña Oración y elige una de las secciones."
        />
      </SafeAreaView>
    );
  }

  if (clave === 'semana' && diaSemanaIso() === SABADO) {
    return <Redirect href={{ pathname: '/detalle-oracion', params: { oracion: 'hora-maria' } }} />;
  }

  const dia = diaDeHoy();

  return (
    <SafeAreaView style={styles.pantalla} edges={['top', 'left', 'right', 'bottom']}>
      <BackHeader />
      <ScrollView contentContainerStyle={styles.contenido}>
        <View style={styles.encabezado}>
          <AppText variant="eyebrow">{ETIQUETAS_SECCION[clave]}</AppText>
          <AppText variant="display" accessibilityRole="header">
            {tituloSeccion(clave, dia)}
          </AppText>
          <AppText color={colors.textSecondary}>{descripcionSeccion(clave, dia)}</AppText>
        </View>
        {clave === 'dia' ? <ListaDia /> : null}
        {clave === 'semana' ? <ListaSemana /> : null}
        {clave === 'mes' ? <ListaMes /> : null}
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
});
