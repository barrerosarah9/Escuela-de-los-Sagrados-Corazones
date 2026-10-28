import Ionicons from '@expo/vector-icons/Ionicons';
import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';
import { router } from 'expo-router';
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
import { MENSAJE_CUENTA_BLOQUEADA } from '../../lib/cuenta';
import { supabase } from '../../lib/supabase';
import {
  normalizarCorreo,
  tieneErrores,
  validarRegistro,
  type DatosRegistro,
  type ErroresRegistro,
} from '../../lib/validaciones-registro';
import { colors, fonts, spacing } from '../../theme';

type AvisoRegistro = 'duplicado' | 'sin-conexion' | 'limite' | 'desconocido';

const DATOS_INICIALES: DatosRegistro = {
  nombre: '',
  correo: '',
  contrasena: '',
  confirmacion: '',
};

const MENSAJES_AVISO: Record<AvisoRegistro, string> = {
  duplicado: 'Ya existe una cuenta con este correo.',
  'sin-conexion': 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
  limite: 'Hiciste varios intentos seguidos. Espera un minuto e inténtalo de nuevo.',
  desconocido: 'No pudimos crear tu cuenta. Inténtalo de nuevo en unos minutos.',
};

export default function RegistroScreen() {
  const [datos, setDatos] = useState<DatosRegistro>(DATOS_INICIALES);
  const [intentado, setIntentado] = useState(false);
  const [erroresServidor, setErroresServidor] = useState<ErroresRegistro>({});
  const [aviso, setAviso] = useState<AvisoRegistro | null>(null);
  const [cargando, setCargando] = useState(false);
  const [conectandoGoogle, setConectandoGoogle] = useState(false);

  const correoRef = useRef<TextInputInstance>(null);
  const contrasenaRef = useRef<TextInputInstance>(null);
  const confirmacionRef = useRef<TextInputInstance>(null);

  const errores: ErroresRegistro = {
    ...erroresServidor,
    ...(intentado ? validarRegistro(datos) : {}),
  };

  const actualizar = (campo: keyof DatosRegistro) => (valor: string) => {
    setDatos((actual) => ({ ...actual, [campo]: valor }));
    setErroresServidor((actual) => ({ ...actual, [campo]: undefined }));
    if (campo === 'correo' && aviso === 'duplicado') {
      setAviso(null);
    }
  };

  const registrarse = async () => {
    setIntentado(true);
    setAviso(null);
    setErroresServidor({});

    if (tieneErrores(validarRegistro(datos))) {
      return;
    }

    const correo = normalizarCorreo(datos.correo);
    setCargando(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: correo,
        password: datos.contrasena,
        options: { data: { nombre: datos.nombre.trim() } },
      });

      if (error) {
        manejarError(error);
        return;
      }

      if (data.user && data.user.identities?.length === 0) {
        marcarCorreoDuplicado();
        return;
      }

      if (!data.session) {
        router.replace({ pathname: '/verificar-correo', params: { correo } });
      }
    } catch {
      setAviso('sin-conexion');
    } finally {
      setCargando(false);
    }
  };

  const marcarCorreoDuplicado = () => {
    setErroresServidor({ correo: 'Este correo ya está registrado.' });
    setAviso('duplicado');
  };

  const manejarError = (error: Error) => {
    if (isAuthRetryableFetchError(error)) {
      setAviso('sin-conexion');
      return;
    }

    if (!isAuthApiError(error)) {
      setAviso('desconocido');
      return;
    }

    switch (error.code) {
      case 'user_already_exists':
      case 'email_exists':
        marcarCorreoDuplicado();
        return;
      case 'weak_password':
        setErroresServidor({
          contrasena: 'La contraseña no cumple los requisitos de seguridad.',
        });
        return;
      case 'email_address_invalid':
        setErroresServidor({ correo: 'Este correo no es válido. Revisa que esté bien escrito.' });
        return;
      case 'over_request_rate_limit':
      case 'over_email_send_rate_limit':
        setAviso('limite');
        return;
      default:
        setAviso(error.status === 429 ? 'limite' : 'desconocido');
    }
  };

  const proximamente = (proveedor: string) => {
    Alert.alert(
      'Disponible pronto',
      `El registro con ${proveedor} estará disponible en una próxima versión.`,
    );
  };

  const continuarConGoogle = async () => {
    if (cargando || conectandoGoogle) {
      return;
    }

    setAviso(null);
    setConectandoGoogle(true);
    const resultado = await iniciarSesionConGoogle();
    setConectandoGoogle(false);

    if (resultado.estado === 'bloqueada') {
      Alert.alert('Cuenta bloqueada', MENSAJE_CUENTA_BLOQUEADA);
    } else if (resultado.estado === 'error') {
      Alert.alert('No pudimos continuar con Google', resultado.mensaje);
    }
  };

  const irAIngreso = () => {
    router.push({ pathname: '/ingreso', params: { correo: normalizarCorreo(datos.correo) } });
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
            <AppText style={styles.title}>Únete a la comunidad</AppText>
            <AppText color={colors.textSecondary}>
              Creamos este espacio para caminar contigo.
            </AppText>
          </View>

          <View style={styles.form}>
            <TextField
              label="Nombre completo"
              placeholder="¿Cómo te llamas?"
              value={datos.nombre}
              onChangeText={actualizar('nombre')}
              error={errores.nombre}
              editable={!cargando}
              autoCapitalize="words"
              autoComplete="name"
              textContentType="name"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => correoRef.current?.focus()}
            />
            <TextField
              ref={correoRef}
              label="Correo electrónico"
              placeholder="nombre@correo.com"
              value={datos.correo}
              onChangeText={actualizar('correo')}
              error={errores.correo}
              editable={!cargando}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              textContentType="emailAddress"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => contrasenaRef.current?.focus()}
            />
            <PasswordField
              ref={contrasenaRef}
              label="Contraseña"
              placeholder="Mínimo 8 caracteres"
              value={datos.contrasena}
              onChangeText={actualizar('contrasena')}
              error={errores.contrasena}
              editable={!cargando}
              autoComplete="new-password"
              textContentType="newPassword"
              passwordRules="minlength: 8; required: lower; required: upper; required: digit;"
              returnKeyType="next"
              submitBehavior="submit"
              onSubmitEditing={() => confirmacionRef.current?.focus()}
            />
            <AppText variant="caption" style={styles.hint}>
              Usa al menos 8 caracteres, con una mayúscula, una minúscula y un número.
            </AppText>
            <PasswordField
              ref={confirmacionRef}
              label="Confirmar contraseña"
              placeholder="Repite tu contraseña"
              value={datos.confirmacion}
              onChangeText={actualizar('confirmacion')}
              error={errores.confirmacion}
              editable={!cargando}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={registrarse}
            />

            <Button
              title="Registrarse"
              loading={cargando}
              disabled={conectandoGoogle}
              onPress={registrarse}
            />

            {aviso ? (
              <FormAlert
                message={MENSAJES_AVISO[aviso]}
                icon={aviso === 'sin-conexion' ? 'cloud-offline-outline' : 'alert-circle-outline'}
              >
                {aviso === 'duplicado' ? (
                  <>
                    <AppText style={styles.alertLink} onPress={irAIngreso}>
                      Iniciar sesión
                    </AppText>
                    <AppText
                      style={styles.alertLink}
                      onPress={() => router.push('/recuperar-contrasena')}
                    >
                      Recuperar contraseña
                    </AppText>
                  </>
                ) : null}
              </FormAlert>
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
                onPress={() => proximamente('Apple')}
                style={styles.socialButton}
              />
            </View>

            <AppText style={styles.switchCopy}>
              ¿Ya tienes una cuenta?{' '}
              <AppText style={styles.switchLink} onPress={irAIngreso}>
                Inicia sesión
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
  hint: {
    marginTop: -10,
  },
  alertLink: {
    fontFamily: fonts.sansBold,
    fontSize: 12,
    color: colors.link,
    textDecorationLine: 'underline',
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
