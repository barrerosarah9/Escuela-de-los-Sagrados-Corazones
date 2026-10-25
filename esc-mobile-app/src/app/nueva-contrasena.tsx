import Ionicons from '@expo/vector-icons/Ionicons';
import { isAuthApiError, isAuthRetryableFetchError } from '@supabase/supabase-js';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  View,
  type TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { Button } from '../components/button';
import { FormAlert } from '../components/form-alert';
import { PasswordField } from '../components/password-field';
import { supabase } from '../lib/supabase';
import { colors, fonts, spacing } from '../theme';

const AZUL_ICONO = '#315F7E';
const CONTRASENA_SEGURA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

type Estado = 'validando' | 'formulario' | 'vencido';
type Aviso = 'sin-conexion' | 'desconocido';

type Errores = {
  contrasena?: string;
  confirmacion?: string;
};

const MENSAJES_AVISO: Record<Aviso, string> = {
  'sin-conexion': 'No hay conexión a internet. Revisa tu red e inténtalo de nuevo.',
  desconocido: 'No pudimos guardar tu contraseña. Inténtalo de nuevo en unos minutos.',
};

function validar(contrasena: string, confirmacion: string): Errores {
  const errores: Errores = {};
  if (!contrasena) {
    errores.contrasena = 'Escribe tu contraseña nueva.';
  } else if (!CONTRASENA_SEGURA.test(contrasena)) {
    errores.contrasena = 'Usa al menos 8 caracteres, con una mayúscula, una minúscula y un número.';
  }
  if (!confirmacion) {
    errores.confirmacion = 'Repite tu contraseña nueva.';
  } else if (confirmacion !== contrasena) {
    errores.confirmacion = 'Las contraseñas no coinciden.';
  }
  return errores;
}

export default function NuevaContrasenaScreen() {
  const params = useLocalSearchParams<{ code?: string; error?: string; error_code?: string }>();
  const enlaceInvalido = Boolean(params.error || params.error_code || !params.code);

  const [estado, setEstado] = useState<Estado>(enlaceInvalido ? 'vencido' : 'validando');
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [intentado, setIntentado] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string>();
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [guardando, setGuardando] = useState(false);

  const confirmacionRef = useRef<TextInput>(null);
  const procesado = useRef(false);

  useEffect(() => {
    if (enlaceInvalido || !params.code || procesado.current) {
      return;
    }
    procesado.current = true;

    supabase.auth
      .exchangeCodeForSession(params.code)
      .then(({ error }) => setEstado(error ? 'vencido' : 'formulario'))
      .catch(() => setEstado('vencido'));
  }, [enlaceInvalido, params.code]);

  const errores: Errores = intentado ? validar(contrasena, confirmacion) : {};
  if (errorServidor) {
    errores.contrasena = errorServidor;
  }

  const cambiarContrasena = (valor: string) => {
    setContrasena(valor);
    setErrorServidor(undefined);
    setAviso(null);
  };

  const cambiarConfirmacion = (valor: string) => {
    setConfirmacion(valor);
    setAviso(null);
  };

  const guardar = async () => {
    if (guardando) {
      return;
    }

    setIntentado(true);
    setAviso(null);
    setErrorServidor(undefined);

    const erroresActuales = validar(contrasena, confirmacion);
    if (erroresActuales.contrasena || erroresActuales.confirmacion) {
      return;
    }

    setGuardando(true);

    try {
      const { error } = await supabase.auth.updateUser({ password: contrasena });

      if (error) {
        if (isAuthRetryableFetchError(error)) {
          setAviso('sin-conexion');
        } else if (isAuthApiError(error) && error.code === 'same_password') {
          setErrorServidor('Elige una contraseña distinta a la anterior.');
        } else if (isAuthApiError(error) && error.code === 'weak_password') {
          setErrorServidor('La contraseña no cumple los requisitos de seguridad.');
        } else if (isAuthApiError(error) && error.status === 401) {
          setEstado('vencido');
        } else {
          setAviso('desconocido');
        }
        return;
      }

      Alert.alert('Contraseña actualizada', 'Ya puedes usar tu contraseña nueva.');
      router.replace('/');
    } catch {
      setAviso('sin-conexion');
    } finally {
      setGuardando(false);
    }
  };

  if (estado === 'validando') {
    return (
      <SafeAreaView style={[styles.screen, styles.centrado]}>
        <ActivityIndicator color={colors.primary} />
        <AppText color={colors.textSecondary} style={styles.validando}>
          Validando el enlace…
        </AppText>
      </SafeAreaView>
    );
  }

  if (estado === 'vencido') {
    return (
      <SafeAreaView style={styles.screen}>
        <ScrollView contentContainerStyle={[styles.content, styles.contenidoCentrado]}>
          <View style={styles.icon}>
            <Ionicons name="time-outline" size={30} color={AZUL_ICONO} />
          </View>
          <AppText style={[styles.title, styles.textoCentrado]}>El enlace venció</AppText>
          <AppText style={[styles.description, styles.textoCentrado]}>
            Los enlaces para crear una contraseña nueva duran 1 hora y sirven una sola vez, desde el
            celular donde los pediste. Pide uno nuevo para continuar.
          </AppText>
          <View style={styles.form}>
            <Button
              title="Pedir otro enlace"
              onPress={() => router.replace('/recuperar-contrasena')}
            />
            <AppText style={styles.link} onPress={() => router.replace('/')}>
              Volver al inicio
            </AppText>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView style={styles.flex} behavior="padding">
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.icon}>
            <Ionicons name="key-outline" size={28} color={AZUL_ICONO} />
          </View>
          <AppText style={styles.title}>Crea una contraseña nueva</AppText>
          <AppText style={styles.description}>
            Elige una contraseña que no hayas usado antes en esta cuenta.
          </AppText>

          <View style={styles.form}>
            <PasswordField
              label="Contraseña nueva"
              placeholder="Mínimo 8 caracteres"
              value={contrasena}
              onChangeText={cambiarContrasena}
              error={errores.contrasena}
              editable={!guardando}
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
              value={confirmacion}
              onChangeText={cambiarConfirmacion}
              error={errores.confirmacion}
              editable={!guardando}
              autoComplete="new-password"
              textContentType="newPassword"
              returnKeyType="done"
              onSubmitEditing={guardar}
            />

            <Button title="Guardar contraseña" loading={guardando} onPress={guardar} />

            {aviso ? (
              <FormAlert
                message={MENSAJES_AVISO[aviso]}
                icon={aviso === 'sin-conexion' ? 'cloud-offline-outline' : 'alert-circle-outline'}
              />
            ) : null}
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
  centrado: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  validando: {
    fontSize: 13,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xxl,
  },
  contenidoCentrado: {
    flexGrow: 1,
    justifyContent: 'center',
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
  textoCentrado: {
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
  form: {
    marginTop: 28,
    gap: 17,
  },
  hint: {
    marginTop: -10,
  },
  link: {
    alignSelf: 'center',
    fontFamily: fonts.sansBold,
    fontSize: 13,
    color: colors.primary,
  },
});
