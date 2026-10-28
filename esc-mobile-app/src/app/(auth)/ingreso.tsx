import Ionicons from '@expo/vector-icons/Ionicons';
import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
  type TextInputInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../../components/app-text';
import { BackHeader } from '../../components/back-header';
import { Button } from '../../components/button';
import { FormAlert } from '../../components/form-alert';
import { Logo } from '../../components/logo';
import { PasswordField } from '../../components/password-field';
import { TextField } from '../../components/text-field';
import { iniciarSesionConGoogle } from '../../lib/auth-google';
import { cuentaBloqueada, MENSAJE_CUENTA_BLOQUEADA } from '../../lib/cuenta';
import { supabase } from '../../lib/supabase';
import { normalizarCorreo } from '../../lib/validaciones-registro';
import { colors, fonts, spacing } from '../../theme';

type AvisoIngreso = 'credenciales' | 'sin-conexion' | 'limite' | 'desconocido';

type ErroresIngreso = {
  correo?: string;
  contrasena?: string;
};

const MENSAJES_AVISO: Record<AvisoIngreso, string> = {
  credenciales: 'El correo o la contraseña no son correctos.',
  'sin-conexion': 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
  limite: 'Hiciste varios intentos seguidos. Espera un minuto e inténtalo de nuevo.',
  desconocido: 'No pudimos iniciar sesión. Inténtalo de nuevo en unos minutos.',
};

const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validarIngreso(correo: string, contrasena: string): ErroresIngreso {
  const errores: ErroresIngreso = {};
  if (!correo) {
    errores.correo = 'Ingresa tu correo electrónico.';
  } else if (!CORREO_VALIDO.test(correo)) {
    errores.correo = 'Ingresa un correo válido.';
  }
  if (!contrasena) {
    errores.contrasena = 'Ingresa tu contraseña.';
  }
  return errores;
}

function avisarCuentaBloqueada() {
  Alert.alert('Cuenta bloqueada', MENSAJE_CUENTA_BLOQUEADA);
}

export default function IngresoScreen() {
  const params = useLocalSearchParams<{ correo?: string }>();
  const [correo, setCorreo] = useState(params.correo ?? '');
  const [contrasena, setContrasena] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [aviso, setAviso] = useState<AvisoIngreso | null>(null);
  const [cargando, setCargando] = useState(false);
  const [conectandoGoogle, setConectandoGoogle] = useState(false);

  const contrasenaRef = useRef<TextInputInstance>(null);

  const ocupado = cargando || conectandoGoogle;
  const errores: ErroresIngreso = intentado
    ? validarIngreso(normalizarCorreo(correo), contrasena)
    : {};

  const cambiarCorreo = (valor: string) => {
    setCorreo(valor);
    setAviso(null);
  };

  const cambiarContrasena = (valor: string) => {
    setContrasena(valor);
    setAviso(null);
  };

  const manejarError = (error: Error, correoNormalizado: string) => {
    if (isAuthRetryableFetchError(error)) {
      setAviso('sin-conexion');
      return;
    }

    if (!isAuthApiError(error)) {
      setAviso('desconocido');
      return;
    }

    switch (error.code) {
      case 'invalid_credentials':
        setAviso('credenciales');
        return;
      case 'email_not_confirmed':
        router.push({ pathname: '/verificar-correo', params: { correo: correoNormalizado } });
        return;
      case 'user_banned':
        avisarCuentaBloqueada();
        return;
      case 'over_request_rate_limit':
        setAviso('limite');
        return;
      default:
        if (error.status === 429) {
          setAviso('limite');
        } else if (error.status === 400) {
          setAviso('credenciales');
        } else {
          setAviso('desconocido');
        }
    }
  };

  const iniciarSesion = async () => {
    if (ocupado) {
      return;
    }

    setIntentado(true);
    setAviso(null);

    const correoNormalizado = normalizarCorreo(correo);
    const erroresActuales = validarIngreso(correoNormalizado, contrasena);
    if (erroresActuales.correo || erroresActuales.contrasena) {
      return;
    }

    setCargando(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: correoNormalizado,
        password: contrasena,
      });

      if (error) {
        manejarError(error, correoNormalizado);
        return;
      }

      if (await cuentaBloqueada(data.user.id)) {
        await supabase.auth.signOut();
        avisarCuentaBloqueada();
      }
    } catch {
      setAviso('sin-conexion');
    } finally {
      setCargando(false);
    }
  };

  const continuarConGoogle = async () => {
    if (ocupado) {
      return;
    }

    setAviso(null);
    setConectandoGoogle(true);
    const resultado = await iniciarSesionConGoogle();
    setConectandoGoogle(false);

    if (resultado.estado === 'bloqueada') {
      avisarCuentaBloqueada();
    } else if (resultado.estado === 'error') {
      Alert.alert('No pudimos continuar con Google', resultado.mensaje);
    }
  };

  const continuarConApple = () => {
    Alert.alert(
      'Disponible pronto',
      'El inicio de sesión con Apple estará disponible en una próxima versión.',
    );
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
          <View style={styles.heading}>
            <Logo />
            <AppText style={styles.title}>Qué alegría verte</AppText>
            <AppText color={colors.textSecondary}>Inicia sesión para continuar tu camino.</AppText>
          </View>

          <View style={styles.form}>
            <TextField
              label="Correo electrónico"
              placeholder="nombre@correo.com"
              value={correo}
              onChangeText={cambiarCorreo}
              error={errores.correo}
              editable={!ocupado}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => contrasenaRef.current?.focus()}
            />
            <View style={styles.passwordBlock}>
              <PasswordField
                ref={contrasenaRef}
                label="Contraseña"
                placeholder="Tu contraseña"
                value={contrasena}
                onChangeText={cambiarContrasena}
                error={errores.contrasena}
                editable={!ocupado}
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="done"
                onSubmitEditing={iniciarSesion}
              />
              <AppText
                style={styles.forgotLink}
                onPress={() =>
                  router.push({
                    pathname: '/recuperar-contrasena',
                    params: { correo: normalizarCorreo(correo) },
                  })
                }
              >
                ¿Olvidaste tu contraseña?
              </AppText>
            </View>

            <Button
              title="Iniciar sesión"
              loading={cargando}
              disabled={conectandoGoogle}
              onPress={iniciarSesion}
            />

            {aviso ? (
              <FormAlert
                message={MENSAJES_AVISO[aviso]}
                icon={aviso === 'sin-conexion' ? 'cloud-offline-outline' : 'alert-circle-outline'}
              />
            ) : null}

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <AppText variant="caption" style={styles.dividerText}>
                o continúa con
              </AppText>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <Button
                title="Google"
                variant="social"
                icon={<Ionicons name="logo-google" size={18} color={colors.text} />}
                loading={conectandoGoogle}
                disabled={cargando}
                onPress={continuarConGoogle}
                style={styles.socialButton}
              />
              <Button
                title="Apple"
                variant="social"
                icon={<Ionicons name="logo-apple" size={20} color={colors.text} />}
                disabled={ocupado}
                onPress={continuarConApple}
                style={styles.socialButton}
              />
            </View>

            <AppText style={styles.switchCopy}>
              ¿Aún no tienes cuenta?{' '}
              <AppText style={styles.switchLink} onPress={() => router.replace('/registro')}>
                Regístrate
              </AppText>
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
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  heading: {
    marginTop: spacing.sm,
  },
  title: {
    marginTop: 30,
    marginBottom: 10,
    fontFamily: fonts.serif,
    fontSize: 40,
    lineHeight: 42,
    letterSpacing: -1.4,
  },
  form: {
    marginTop: 28,
    gap: 17,
  },
  passwordBlock: {
    gap: 10,
  },
  forgotLink: {
    alignSelf: 'flex-end',
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.link,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    fontSize: 11,
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
  },
  socialButton: {
    flex: 1,
  },
  switchCopy: {
    marginTop: spacing.xs,
    fontSize: 12,
    textAlign: 'center',
    color: colors.textSecondary,
  },
  switchLink: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.primary,
  },
});
