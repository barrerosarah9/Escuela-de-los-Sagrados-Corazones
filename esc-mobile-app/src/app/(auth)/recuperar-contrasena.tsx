import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BackHeader } from '../../components/back-header';
import { ScreenPlaceholder } from '../../components/screen-placeholder';
import { colors } from '../../theme';

export default function RecuperarContrasenaScreen() {
  return (
    <SafeAreaView style={styles.screen}>
      <BackHeader />
      <ScreenPlaceholder title="Recuperar contraseña" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
