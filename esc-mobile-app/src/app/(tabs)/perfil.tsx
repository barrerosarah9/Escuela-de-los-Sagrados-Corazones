import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText } from '../../components/app-text';
import { Button } from '../../components/button';
import { supabase } from '../../lib/supabase';
import { colors, spacing } from '../../theme';

export default function PerfilScreen() {
  const [loading, setLoading] = useState(false);

  const handleSignOut = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <AppText variant="title">Perfil</AppText>
      <Button
        title="Cerrar sesión"
        variant="secondary"
        loading={loading}
        onPress={handleSignOut}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xl,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  button: {
    alignSelf: 'stretch',
  },
});
