import Ionicons from '@expo/vector-icons/Ionicons';
import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';
import * as Linking from 'expo-linking';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { BackHeader } from '../../components/back-header';
import { Button } from '../../components/button';
import { FormAlert } from '../../components/form-alert';
import { TextField } from '../../components/text-field';
import { supabase } from '../../lib/supabase';
import { normalizarCorreo } from '../../lib/validaciones-registro';
import { colors, fonts, spacing } from '../../theme';

const ESPERA_REENVIO_SEGUNDOS = 60;
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Aviso = 'sin-conexion' | 'limite' | 'desconocido';

const MENSAJES_AVISO: Record<Aviso, string> = {
  'sin-conexion': 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
  limite: 'Hiciste varios intentos seguidos. Espera unos minutos e inténtalo de nuevo.',
  desconocido: 'No pudimos enviar el enlace. Inténtalo de nuevo en unos minutos.',
};

export default function RecuperarContrasenaScreen() {
  const params = useLocalSearchParams<{ correo?: string }>();
  const [correo, setCorreo] = useState(params.correo ?? '');
  const [errorCorreo, setErrorCorreo] = useState<string>();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviadoA, setEnviadoA] = useState<string | null>(null);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) {
      return;
    }
    const temporizador = setTimeout(() => setEspera((actual) => actual - 1), 1000);
    return () => clearTimeout(temporizador);
  }, [espera]);

  const cambiarCorreo = (valor: string) => {
    setCorreo(valor);
    setErrorCorreo(undefined);
    setAviso(null);
  };

  const enviar = async () => {
    if (enviando || espera > 0) {
      return;
    }

    setAviso(null);
    const correoNormalizado = normalizarCorreo(correo);

    if (!correoNormalizado) {
      setErrorCorreo('Ingresa tu correo electrónico.');
      return;
    }
    if (!CORREO_VALIDO.test(correoNormalizado)) {
      setErrorCorreo('Ingresa un correo válido.');
      return;
    }

    setEnviando(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(correoNormalizado, {
        redirectTo: Linking.createURL('/nueva-contrasena'),
      });

      if (error) {
        if (isAuthRetryableFetchError(error)) {
          setAviso('sin-conexion');
        } else if (isAuthApiError(error) && error.status === 429) {
          setAviso('limite');
        } else {
          setAviso('desconocido');
        }
        return;
      }

      setEnviadoA(correoNormalizado);
      setEspera(ESPERA_REENVIO_SEGUNDOS);
    } catch {
      setAviso('sin-conexion');
    } finally {
      setEnviando(false);
    }
  };

  const usarOtroCorreo = () => {
    setEnviadoA(null);
    setAviso(null);
  };

  const alerta = aviso ? (
    <FormAlert
      message={MENSAJES_AVISO[aviso]}
      icon={aviso === 'sin-conexion' ? 'cloud-offline-outline' : 'alert-circle-outline'}
    />
  ) : null;

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <BackHeader />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {enviadoA ? (
            <>
              <View style={styles.icon}>
                <Ionicons name="mail-outline" size={30} color={'#315F7E'} />
              </View>
              <AppText style={[styles.title, styles.centered]}>Revisa tu correo</AppText>
              <AppText style={[styles.description, styles.centered]}>
                Si hay una cuenta con <AppText style={styles.email}>{enviadoA}</AppText>, te
                enviamos un enlace para crear una contraseña nueva. El enlace vence en 1 hora.
              </AppText>

              <View style={styles.form}>
                <Button
                  title={espera > 0 ? `Reenviar enlace en ${espera} s` : 'Reenviar enlace'}
                  variant="secondary"
                  loading={enviando}
                  disabled={espera > 0}
                  onPress={enviar}
                />
                {alerta}
                <AppText style={styles.switchLink} onPress={usarOtroCorreo}>
                  Usar otro correo
                </AppText>
                <AppText variant="caption" style={styles.centered}>
                  Abre el enlace desde este celular. Si no lo ves, revisa la carpeta de spam o
                  correo no deseado.
                </AppText>
              </View>
            </>
          ) : (
            <>
              <View style={styles.icon}>
                <Ionicons name="lock-closed-outline" size={28} color={'#315F7E'} />
              </View>
              <AppText style={styles.title}>Recupera tu contraseña</AppText>
              <AppText style={styles.description}>
                Te enviaremos un enlace seguro para crear una nueva.
              </AppText>

              <View style={styles.form}>
                <TextField
                  label="Correo electrónico"
                  placeholder="nombre@correo.com"
                  value={correo}
                  onChangeText={cambiarCorreo}
                  error={errorCorreo}
                  editable={!enviando}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={enviar}
                />
                <Button title="Enviar enlace de recuperación" loading={enviando} onPress={enviar} />
                {alerta}
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  icon: {
    width: 74,
    height: 74,
    borderRadius: 37,
    marginBottom: spacing.xl,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.skyLight,
    boxShadow: '0px 0px 0px 10px rgba(135, 180, 214, 0.1)',
  },
  centered: {
    textAlign: 'center',
  },
  title: {
    marginBottom: spacing.md,
    fontFamily: fonts.serif,
    fontSize: 38,
    lineHeight: 40,
    letterSpacing: -1.3,
  },
  description: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.textSecondary,
  },
  email: {
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.text,
  },
  form: {
    marginTop: 28,
    gap: 17,
  },
  switchLink: {
    alignSelf: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.primary,
  },
});
