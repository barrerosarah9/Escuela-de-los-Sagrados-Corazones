import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type TextInputInstance,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '../components/app-text';
import { Avatar } from '../components/avatar';
import { BackHeader } from '../components/back-header';
import { Button } from '../components/button';
import { FormAlert } from '../components/form-alert';
import { TextField } from '../components/text-field';
import {
  avisarSinPermiso,
  borrarFoto,
  elegirFoto,
  MENSAJES_ERROR_FOTO,
  subirFoto,
  type OrigenFoto,
} from '../lib/foto-perfil';
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
  sin_conexion: 'No hay conexión. Tus cambios siguen aquí; inténtalo de nuevo.',
  datos_invalidos: 'Revisa el nombre y el teléfono e inténtalo de nuevo.',
  no_guardado: 'No pudimos guardar los cambios. Tus cambios siguen aquí; inténtalo de nuevo.',
};

type FotoSubida = { uri: string; path: string };

export default function EditarPerfilScreen() {
  const { session } = useSession();
  const usuarioId = session?.user.id;
  const telefonoRef = useRef<TextInputInstance>(null);
  const huerfanaRef = useRef<string | null>(null);
  const [original, setOriginal] = useState<DatosPerfilEditables | null>(null);
  const [datos, setDatos] = useState<DatosPerfilEditables>({ nombre: '', telefono: '' });
  const [fotoOriginal, setFotoOriginal] = useState<string | null>(null);
  const [fotoNueva, setFotoNueva] = useState<string | null>(null);
  const [fotoSubida, setFotoSubida] = useState<FotoSubida | null>(null);
  const [errores, setErrores] = useState<ErroresPerfil>({});
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [fallo, setFallo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [eligiendo, setEligiendo] = useState(false);
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
        setFotoOriginal(perfil.foto_path);
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

  useEffect(() => {
    return () => {
      if (huerfanaRef.current) void borrarFoto(huerfanaRef.current);
    };
  }, []);

  const limpiarAvisos = () => {
    setErrorGeneral(null);
    setFallo(false);
  };

  const cambiar = (campo: keyof DatosPerfilEditables, valor: string) => {
    setDatos((previos) => ({ ...previos, [campo]: valor }));
    setErrores((previos) => ({ ...previos, [campo]: undefined }));
    limpiarAvisos();
  };

  const descartarSubida = () => {
    if (huerfanaRef.current) void borrarFoto(huerfanaRef.current);
    huerfanaRef.current = null;
    setFotoSubida(null);
  };

  const elegir = async (origen: OrigenFoto) => {
    setEligiendo(true);
    const resultado = await elegirFoto(origen);
    setEligiendo(false);

    if (resultado.estado === 'elegida') {
      descartarSubida();
      setFotoNueva(resultado.uri);
      setErrorFoto(null);
      limpiarAvisos();
      return;
    }
    if (resultado.estado === 'sin_permiso') {
      avisarSinPermiso(origen);
      return;
    }
    if (resultado.estado === 'formato_invalido') {
      setErrorFoto(MENSAJES_ERROR_FOTO.formato_invalido);
      return;
    }
    if (resultado.estado === 'error') {
      setErrorFoto(
        `No pudimos abrir ${origen === 'camara' ? 'la cámara' : 'la galería'}. Inténtalo de nuevo.`,
      );
    }
  };

  const abrirOpcionesFoto = () => {
    Alert.alert(
      'Foto de perfil',
      '¿De dónde quieres tomar la foto?',
      [
        { text: 'Tomar foto', onPress: () => void elegir('camara') },
        { text: 'Elegir de la galería', onPress: () => void elegir('galeria') },
        { text: 'Cancelar', style: 'cancel' },
      ],
      { cancelable: true },
    );
  };

  const descartarFotoNueva = () => {
    descartarSubida();
    setFotoNueva(null);
    setErrorFoto(null);
    limpiarAvisos();
  };

  const sinCambios =
    original !== null &&
    fotoNueva === null &&
    normalizarNombre(datos.nombre) === normalizarNombre(original.nombre) &&
    normalizarTelefono(datos.telefono) === normalizarTelefono(original.telefono);

  const ocupado = guardando || eligiendo;

  const guardar = async () => {
    if (!usuarioId || ocupado) return;
    const encontrados = validarPerfil(datos);
    setErrores(encontrados);
    limpiarAvisos();
    if (tieneErroresPerfil(encontrados)) return;

    setGuardando(true);

    let fotoPath: string | undefined;
    if (fotoNueva) {
      if (fotoSubida?.uri === fotoNueva) {
        fotoPath = fotoSubida.path;
      } else {
        const subida = await subirFoto(usuarioId, fotoNueva);
        if (!subida.ok) {
          setGuardando(false);
          if (subida.motivo === 'muy_grande' || subida.motivo === 'formato_invalido') {
            setErrorFoto(MENSAJES_ERROR_FOTO[subida.motivo]);
            return;
          }
          setErrorGeneral(MENSAJES_ERROR_FOTO[subida.motivo]);
          setFallo(true);
          return;
        }
        huerfanaRef.current = subida.fotoPath;
        setFotoSubida({ uri: fotoNueva, path: subida.fotoPath });
        fotoPath = subida.fotoPath;
      }
    }

    const resultado = await actualizarPerfil(usuarioId, {
      nombre: normalizarNombre(datos.nombre),
      telefono: normalizarTelefono(datos.telefono),
      ...(fotoPath ? { foto_path: fotoPath } : {}),
    });
    setGuardando(false);

    if (resultado.ok) {
      if (fotoPath) {
        huerfanaRef.current = null;
        void borrarFoto(fotoOriginal);
      }
      router.back();
      return;
    }
    setErrorGeneral(MENSAJES_ERROR[resultado.motivo]);
    setFallo(resultado.motivo !== 'datos_invalidos');
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
              <View style={styles.fotoBloque}>
                <Pressable
                  onPress={abrirOpcionesFoto}
                  disabled={!original || ocupado}
                  accessibilityRole="button"
                  accessibilityLabel="Cambiar foto de perfil"
                  style={styles.avatarBoton}
                >
                  <Avatar
                    nombre={datos.nombre || original?.nombre || ''}
                    fotoPath={fotoOriginal}
                    uriLocal={fotoNueva}
                    tamano={104}
                  />
                  <View style={styles.insignia}>
                    {eligiendo ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <Ionicons name="camera" size={16} color={colors.primary} />
                    )}
                  </View>
                </Pressable>

                <View style={styles.accionesFoto}>
                  <Pressable
                    onPress={abrirOpcionesFoto}
                    disabled={!original || ocupado}
                    accessibilityRole="button"
                    hitSlop={8}
                  >
                    <AppText style={styles.enlace}>Cambiar foto</AppText>
                  </Pressable>
                  {fotoNueva ? (
                    <Pressable
                      onPress={descartarFotoNueva}
                      disabled={ocupado}
                      accessibilityRole="button"
                      hitSlop={8}
                    >
                      <AppText style={styles.enlaceSecundario}>Descartar</AppText>
                    </Pressable>
                  ) : null}
                </View>

                {fotoNueva ? (
                  <AppText variant="caption" color={colors.textSecondary}>
                    Foto nueva sin guardar
                  </AppText>
                ) : null}
                {errorFoto ? <FormAlert message={errorFoto} /> : null}
              </View>

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
                editable={!ocupado}
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
                editable={!ocupado}
                onSubmitEditing={() => void guardar()}
              />

              {errorGeneral ? <FormAlert message={errorGeneral} /> : null}

              <Button
                title={fallo ? 'Reintentar' : 'Guardar cambios'}
                loading={guardando}
                disabled={!original || sinCambios || eligiendo}
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
  fotoBloque: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatarBoton: {
    borderRadius: 52,
  },
  insignia: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  accionesFoto: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  enlace: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.link,
  },
  enlaceSecundario: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.textSecondary,
  },
});
