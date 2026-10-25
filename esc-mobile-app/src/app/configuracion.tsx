import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { BackHeader } from '../components/back-header';
import { MenuRow, MenuSeparator } from '../components/menu-row';
import { cerrarSesion, confirmarCierreDeSesion } from '../lib/cerrar-sesion';
import { colors, fonts, spacing } from '../theme';

function proximamente(opcion: string) {
  Alert.alert('Disponible pronto', `${opcion} estará disponible en una próxima versión.`);
}

export default function ConfiguracionScreen() {
  const [cerrando, setCerrando] = useState(false);

  const salir = () => {
    confirmarCierreDeSesion(async () => {
      setCerrando(true);
      try {
        await cerrarSesion();
      } catch {
        setCerrando(false);
        Alert.alert(
          'No pudimos cerrar sesión',
          'Revisa tu conexión a internet e inténtalo de nuevo.',
        );
      }
    });
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <BackHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <AppText style={styles.title}>Configuración de la cuenta</AppText>

        <View style={styles.section}>
          <AppText variant="eyebrow">Seguridad</AppText>
          <View style={styles.card}>
            <MenuRow
              icon="key-outline"
              title="Cambiar contraseña"
              onPress={() => proximamente('Cambiar contraseña')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="eyebrow">Privacidad</AppText>
          <View style={styles.card}>
            <MenuRow
              icon="eye-outline"
              title="Privacidad del perfil"
              description="Elige si la comunidad ve tu nombre y tu foto"
              onPress={() => proximamente('Privacidad del perfil')}
            />
            <MenuSeparator />
            <MenuRow
              icon="analytics-outline"
              title="Datos de uso"
              description="Ayúdanos a mejorar la app de forma anónima"
              onPress={() => proximamente('Datos de uso')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="eyebrow">Comunicaciones</AppText>
          <View style={styles.card}>
            <MenuRow
              icon="mail-outline"
              title="Correos y notificaciones"
              description="Reflexión semanal y novedades de la comunidad"
              onPress={() => proximamente('Correos y notificaciones')}
            />
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="eyebrow">Sesión</AppText>
          <View style={styles.card}>
            <MenuRow
              icon="log-out-outline"
              title={cerrando ? 'Cerrando sesión…' : 'Cerrar sesión'}
              tone="danger"
              showChevron={false}
              disabled={cerrando}
              onPress={salir}
            />
          </View>
        </View>

        <View style={styles.section}>
          <AppText variant="eyebrow">Zona sensible</AppText>
          <View style={styles.card}>
            <MenuRow
              icon="trash-outline"
              title="Eliminar cuenta"
              description="Borra tu cuenta y todos tus datos"
              tone="danger"
              onPress={() => proximamente('Eliminar cuenta')}
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  title: {
    marginTop: spacing.sm,
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.1,
  },
  section: {
    gap: 10,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
});
