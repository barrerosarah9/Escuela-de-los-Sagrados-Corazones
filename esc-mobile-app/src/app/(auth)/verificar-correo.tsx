import Ionicons from '@expo/vector-icons/Ionicons';
import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';
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
import { colors, fonts, spacing } from '../../theme';

const LONGITUD_CODIGO = 6;
const ESPERA_REENVIO_SEGUNDOS = 60;

type Aviso = 'sin-conexion' | 'limite' | 'desconocido' | 'reenviado';

const MENSAJES_AVISO: Record<Aviso, string> = {
  'sin-conexion': 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
  limite: 'Hiciste varios intentos seguidos. Espera un minuto e inténtalo de nuevo.',
  desconocido: 'No pudimos verificar tu cuenta. Inténtalo de nuevo en unos minutos.',
  reenviado: 'Te enviamos un código nuevo.',
};

export default function VerificarCorreoScreen() {
  const { correo } = useLocalSearchParams<{ correo: string }>();
  const [codigo, setCodigo] = useState('');
  const [errorCodigo, setErrorCodigo] = useState<string>();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [verificando, setVerificando] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [espera, setEspera] = useState(ESPERA_REENVIO_SEGUNDOS);

  useEffect(() => {
    if (espera <= 0) return;
    const temporizador = setTimeout(() => setEspera((actual) => actual - 1), 1000);
    return () => clearTimeout(temporizador);
  }, [espera]);

  const cambiarCodigo = (valor: string) => {
    setCodigo(valor.replace(/\D/g, '').slice(0, LONGITUD_CODIGO));
    setErrorCodigo(undefined);
  };

  const avisoPorError = (error: Error): Aviso => {
    if (isAuthRetryableFetchError(error)) return 'sin-conexion';
    if (isAuthApiError(error) && error.status === 429) return 'limite';
    return 'desconocido';
  };

  const verificar = async () => {
    setAviso(null);

    if (codigo.length !== LONGITUD_CODIGO) {
      setErrorCodigo(`Escribe los ${LONGITUD_CODIGO} dígitos del código.`);
      return;
    }

    setVerificando(true);

    try {
      const { error } = await supabase.auth.verifyOtp({
        email: correo,
        token: codigo,
        type: 'email',
      });

      if (!error) return;

      if (isAuthApiError(error) && (error.code === 'otp_expired' || error.status === 403)) {
        setErrorCodigo('El código no es correcto o ya venció. Revísalo o pide uno nuevo.');
        return;
      }

      setAviso(avisoPorError(error));
    } catch {
      setAviso('sin-conexion');
    } finally {
      setVerificando(false);
    }
  };

  const reenviar = async () => {
    setAviso(null);
    setReenviando(true);

    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: correo });

      if (error) {
        setAviso(avisoPorError(error));
        return;
      }

      setCodigo('');
      setErrorCodigo(undefined);
      setAviso('reenviado');
      setEspera(ESPERA_REENVIO_SEGUNDOS);
    } catch {
      setAviso('sin-conexion');
    } finally {
      setReenviando(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <BackHeader />
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.icon}>
            <Ionicons name="mail-outline" size={32} color="#315F7E" />
          </View>
          <AppText variant="eyebrow" style={styles.centered}>
            Un paso más
          </AppText>
          <AppText style={styles.title}>Revisa tu correo</AppText>
          <AppText style={styles.description}>
            Enviamos un código de {LONGITUD_CODIGO} dígitos a{' '}
            <AppText style={styles.email}>{correo}</AppText>. Escríbelo aquí para activar tu cuenta.
          </AppText>

          <View style={styles.form}>
            <TextField
              label="Código de verificación"
              placeholder="000000"
              value={codigo}
              onChangeText={cambiarCodigo}
              error={errorCodigo}
              editable={!verificando}
              keyboardType="number-pad"
              maxLength={LONGITUD_CODIGO}
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              returnKeyType="done"
              onSubmitEditing={verificar}
              style={styles.codeInput}
            />

            <Button title="Confirmar" loading={verificando} onPress={verificar} />

            {aviso ? (
              <FormAlert
                message={MENSAJES_AVISO[aviso]}
                icon={
                  aviso === 'reenviado'
                    ? 'checkmark-circle-outline'
                    : aviso === 'sin-conexion'
                      ? 'cloud-offline-outline'
                      : 'alert-circle-outline'
                }
              />
            ) : null}

            <Button
              title={espera > 0 ? `Reenviar código en ${espera} s` : 'Reenviar código'}
              variant="secondary"
              loading={reenviando}
              disabled={espera > 0 || verificando}
              onPress={reenviar}
            />

            <AppText variant="caption" style={styles.centered}>
              Si no lo ves, revisa la carpeta de spam o correo no deseado.
            </AppText>
          </View>
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
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
    marginVertical: spacing.md,
    fontFamily: fonts.serif,
    fontSize: 38,
    lineHeight: 40,
    letterSpacing: -1.3,
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    lineHeight: 21,
    color: colors.textSecondary,
    textAlign: 'center',
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
  codeInput: {
    textAlign: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 22,
    letterSpacing: 8,
  },
});
