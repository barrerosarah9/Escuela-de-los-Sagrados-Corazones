import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { Button } from '../../components/button';
import { Logo } from '../../components/logo';
import { colors, spacing } from '../../theme';

export default function BienvenidaScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.glow} />
      <View style={styles.art}>
        <View style={[styles.ring, styles.ringOuter]} />
        <View style={[styles.ring, styles.ringInner]} />
        <Logo size="full" />
      </View>
      <View style={styles.copy}>
        <AppText variant="eyebrow">Un lugar para crecer</AppText>
        <AppText variant="display" style={styles.title}>
          Acércate a la comunidad
        </AppText>
        <AppText style={styles.description}>
          Un espacio para orar, compartir y caminar juntos cada día.
        </AppText>
      </View>
      <View style={styles.actions}>
        <Button title="Iniciar sesión" onPress={() => router.push('/ingreso')} />
        <Button title="Crear cuenta" variant="secondary" onPress={() => router.push('/registro')} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xl,
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    width: 390,
    height: 390,
    top: -160,
    right: -160,
    borderRadius: 195,
    backgroundColor: 'rgba(135, 180, 214, 0.1)',
  },
  art: {
    minHeight: 265,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: 'rgba(161, 30, 33, 0.16)',
  },
  ringOuter: {
    width: 260,
    height: 260,
    borderRadius: 130,
  },
  ringInner: {
    width: 190,
    height: 190,
    borderRadius: 95,
  },
  copy: {
    paddingHorizontal: spacing.xs,
  },
  title: {
    fontSize: 52,
    lineHeight: 50,
    marginTop: spacing.md,
    marginBottom: 18,
  },
  description: {
    fontSize: 16,
    lineHeight: 25,
    color: '#675E58',
  },
  actions: {
    gap: spacing.md,
    marginTop: 30,
  },
});
