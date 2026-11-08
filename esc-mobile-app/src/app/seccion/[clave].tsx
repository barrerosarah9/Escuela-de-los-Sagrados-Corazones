import { useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { BackHeader } from '../../components/back-header';
import { EstadoVacio } from '../../components/estado-vacio';
import {
  descripcionSeccion,
  diaDeHoy,
  esClaveSeccion,
  ETIQUETAS_SECCION,
  tituloSeccion,
} from '../../lib/secciones-oracion';
import { colors } from '../../theme';

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
        <EstadoVacio
          icono="time-outline"
          titulo="Pronto verás aquí las oraciones"
          mensaje="Estamos preparando este espacio para acompañar tu oración."
        />
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
