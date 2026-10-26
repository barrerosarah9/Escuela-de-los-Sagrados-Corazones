import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { BackHeader } from '../components/back-header';
import { Button } from '../components/button';
import { FormAlert } from '../components/form-alert';
import { TextField } from '../components/text-field';
import { actualizarPerfil, obtenerPerfil, type MotivoErrorPerfil } from '../lib/perfil';
import { useSession } from '../lib/session';
import {
  normalizarNombre,
  normalizarTelefono,
  tieneErroresPerfil,
  validarPerfil,
  type DatosPerfilEditables,
  type ErroresPerfil,
} from '../lib/validaciones-perfil';
import { LONGITUD_MAXIMA_NOMBRE } from '../lib/validaciones-registro';
import { colors, fonts, spacing } from '../theme';

const MENSAJES_ERROR: Record<MotivoErrorPerfil, string> = {
  sin_conexion: 'No hay conexión. Revisa tu internet e inténtalo de nuevo.',
  datos_invalidos: 'Revisa el nombre y el teléfono e inténtalo de nuevo.',
  no_guardado: 'No pudimos guardar los cambios. Inténtalo de nuevo.',
};

export default function EditarPerfilScreen() {
  const { session } = useSession();
  const usuarioId = session?.user.id;
  const telefonoRef = useRef<TextInput>(null);
  const [original, setOriginal] = useState<DatosPerfilEditables | null>(null);
  const [datos, setDatos] = useState<DatosPerfilEditables>({ nombre: '', telefono: '' });
  const [errores, setErrores] = useState<ErroresPerfil>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    if (!usuarioId) return;
    let activo = true;
    obtenerPerfil(usuarioId)
      .then((perfil) => {
        if (!activo) return;
        if (!perfil) {
          setErrorGeneral('No encontramos tu perfil. Inténtalo de nuevo más tarde.');
          return;
        }
        const iniciales = { nombre: perfil.nombre, telefono: perfil.telefono ?? '' };
        setOriginal(iniciales);
        setDatos(iniciales);
      })
      .catch(() => {
        if (activo) {
          setErrorGeneral('No pudimos cargar tu perfil. Revisa tu conexión a internet.');
        }
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [usuarioId]);

  const cambiar = (campo: keyof DatosPerfilEditables, valor: string) => {
    setDatos((previos) => ({ ...previos, [campo]: valor }));
    setErrores((previos) => ({ ...previos, [campo]: undefined }));
    setErrorGeneral(null);
  };

  const sinCambios =
    original !== null &&
    normalizarNombre(datos.nombre) === normalizarNombre(original.nombre) &&
    normalizarTelefono(datos.telefono) === normalizarTelefono(original.telefono);

  const guardar = async () => {
    if (!usuarioId || guardando) return;
    const encontrados = validarPerfil(datos);
    setErrores(encontrados);
    setErrorGeneral(null);
    if (tieneErroresPerfil(encontrados)) return;

    setGuardando(true);
    const resultado = await actualizarPerfil(usuarioId, {
      nombre: normalizarNombre(datos.nombre),
      telefono: normalizarTelefono(datos.telefono),
    });
    setGuardando(false);

    if (resultado.ok) {
      router.back();
      return;
    }
    setErrorGeneral(MENSAJES_ERROR[resultado.motivo]);
  };

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right', 'bottom']}>
      <BackHeader />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.encabezado}>
            <AppText style={styles.title}>Editar perfil</AppText>
            <AppText color={colors.textSecondary}>
              Así te verá la comunidad en los comentarios.
            </AppText>
          </View>

          {cargando ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <View style={styles.form}>
              <TextField
                label="Nombre"
                value={datos.nombre}
                onChangeText={(valor) => cambiar('nombre', valor)}
                error={errores.nombre}
                placeholder="Tu nombre"
                autoCapitalize="words"
                autoComplete="name"
                textContentType="name"
                maxLength={LONGITUD_MAXIMA_NOMBRE}
                returnKeyType="next"
                editable={!guardando}
                onSubmitEditing={() => telefonoRef.current?.focus()}
              />
              <TextField
                ref={telefonoRef}
                label="Teléfono (opcional)"
                value={datos.telefono}
                onChangeText={(valor) => cambiar('telefono', valor)}
                error={errores.telefono}
                placeholder="300 123 4567"
                keyboardType="phone-pad"
                autoComplete="tel"
                textContentType="telephoneNumber"
                maxLength={20}
                returnKeyType="done"
                editable={!guardando}
                onSubmitEditing={() => void guardar()}
              />

              {errorGeneral ? <FormAlert message={errorGeneral} /> : null}

              <Button
                title="Guardar cambios"
                loading={guardando}
                disabled={!original || sinCambios}
                onPress={() => void guardar()}
              />
            </View>
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
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  encabezado: {
    gap: 6,
  },
  title: {
    marginTop: spacing.sm,
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.1,
  },
  form: {
    gap: spacing.lg,
  },
});
