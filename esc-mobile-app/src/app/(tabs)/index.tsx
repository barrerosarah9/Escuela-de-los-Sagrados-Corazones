import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/app-text';
import { Button } from '../../components/button';
import { Card } from '../../components/card';
import { TextField } from '../../components/text-field';
import { colors, spacing } from '../../theme';

export default function InicioScreen() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View>
        <AppText variant="eyebrow">Componentes base</AppText>
        <AppText variant="display">Inicio</AppText>
      </View>

      <View style={styles.group}>
        <AppText variant="subtitle">Botones</AppText>
        <Button title="Iniciar sesión" />
        <Button title="Crear cuenta" variant="secondary" />
        <Button
          title="Continuar con Google"
          variant="social"
          icon={<Ionicons name="logo-google" size={18} color={colors.text} />}
        />
        <Button title="Ver más" variant="accent" />
        <Button title="Cargando" loading />
      </View>

      <View style={styles.group}>
        <AppText variant="subtitle">Campos</AppText>
        <TextField
          label="Correo electrónico"
          placeholder="tu@correo.com"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextField
          label="Contraseña"
          placeholder="Tu contraseña"
          secureTextEntry={!showPassword}
          accessory={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              hitSlop={8}
              onPress={() => setShowPassword((value) => !value)}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={colors.textSecondary}
              />
            </Pressable>
          }
        />
        <TextField
          label="Correo electrónico"
          defaultValue="correo@invalido"
          error="Ingresa un correo válido"
        />
      </View>

      <View style={styles.group}>
        <AppText variant="subtitle">Tarjetas</AppText>
        <Card>
          <AppText variant="eyebrow">Superficie</AppText>
          <AppText variant="title">Santifica el día</AppText>
          <AppText color={colors.textSecondary}>Fondo blanco, borde sutil y sombra suave.</AppText>
        </Card>
        <Card variant="accent">
          <AppText variant="title">Santifica tu lunes</AppText>
          <AppText>Variante amarilla.</AppText>
        </Card>
        <Card variant="primary" onPress={() => {}} accessibilityLabel="Santifica tu mes">
          <AppText variant="title" color={colors.white}>
            Santifica tu mes
          </AppText>
          <AppText color={colors.white}>Variante roja y presionable.</AppText>
        </Card>
        <Card variant="sky">
          <AppText variant="title">Encuentro semanal</AppText>
          <AppText>Variante azul cielo.</AppText>
        </Card>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.xl,
    gap: spacing.xxl,
  },
  group: {
    gap: spacing.md,
  },
});
