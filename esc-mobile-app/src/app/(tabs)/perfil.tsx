import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState, type ComponentProps } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { AppText } from '../../components/app-text';
import { Avatar } from '../../components/avatar';
import { Button } from '../../components/button';
import { FormAlert } from '../../components/form-alert';
import { MenuRow, MenuSeparator } from '../../components/menu-row';
import { cerrarSesion, confirmarCierreDeSesion } from '../../lib/cerrar-sesion';
import { obtenerPerfil, obtenerRacha, type Perfil } from '../../lib/perfil';
import { useSession } from '../../lib/session';
import { colors, fonts, spacing } from '../../theme';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

const DESFASE_BOGOTA_MS = 5 * 3_600_000;

type IconoDato = ComponentProps<typeof Ionicons>['name'];

function formatearMiembroDesde(creadoEn: string) {
  const fecha = new Date(Date.parse(creadoEn) - DESFASE_BOGOTA_MS);
  return `${MESES[fecha.getUTCMonth()]} de ${fecha.getUTCFullYear()}`;
}

function textoRacha(dias: number) {
  if (dias === 0) return 'Empieza hoy tu racha';
  return dias === 1 ? '1 día seguido' : `${dias} días seguidos`;
}

function proximamente(opcion: string) {
  Alert.alert('Disponible pronto', `${opcion} estará disponible en una próxima versión.`);
}

function FilaDato({ icon, label, value }: { icon: IconoDato; label: string; value: string }) {
  return (
    <View style={styles.dato}>
      <Ionicons name={icon} size={18} color={colors.link} />
      <View style={styles.datoTextos}>
        <AppText variant="caption" color={colors.textSecondary}>
          {label}
        </AppText>
        <AppText style={styles.datoValor}>{value}</AppText>
      </View>
    </View>
  );
}

export default function PerfilScreen() {
  const { session } = useSession();
  const usuarioId = session?.user.id;
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [racha, setRacha] = useState<number | null>(null);
  const [cargando, setCargando] = useState(true);
  const [refrescando, setRefrescando] = useState(false);
  const [errorCarga, setErrorCarga] = useState(false);
  const [cerrando, setCerrando] = useState(false);

  const cargar = useCallback(async () => {
    if (!usuarioId) return;
    setErrorCarga(false);
    try {
      setPerfil(await obtenerPerfil(usuarioId));
    } catch {
      setErrorCarga(true);
    }
    try {
      setRacha(await obtenerRacha(usuarioId));
    } catch {
      setRacha(null);
    }
    setCargando(false);
  }, [usuarioId]);

  useFocusEffect(
    useCallback(() => {
      void cargar();
    }, [cargar]),
  );

  const refrescar = async () => {
    setRefrescando(true);
    await cargar();
    setRefrescando(false);
  };

  const salir = () => {
    confirmarCierreDeSesion(async () => {
      setCerrando(true);
      try {
        await cerrarSesion();
      } catch {
        setCerrando(false);
        Alert.alert(
          'No pudimos cerrar sesión',
          'Revisa tu conexión a internet e inténtalo de nuevo.',
        );
      }
    });
  };

  if (cargando && !perfil) {
    return (
      <View style={[styles.screen, styles.centro]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const nombre = perfil?.nombre ?? '';
  const correo = perfil?.correo ?? session?.user.email ?? '';

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refrescando} onRefresh={refrescar} tintColor={colors.primary} />
      }
    >
      <View style={styles.header}>
        <Avatar nombre={nombre || correo} fotoPath={perfil?.foto_path} style={styles.avatar} />
        <AppText style={styles.name}>{nombre || 'Tu perfil'}</AppText>
      </View>

      {errorCarga && !perfil ? (
        <View style={styles.section}>
          <FormAlert message="No pudimos cargar tu perfil. Revisa tu conexión a internet." />
          <Button title="Reintentar" variant="secondary" onPress={() => void cargar()} />
        </View>
      ) : null}

      {perfil ? (
        <>
          <View style={styles.racha}>
            <View style={styles.rachaIcono}>
              <Ionicons name="flame" size={22} color={colors.primary} />
            </View>
            <View style={styles.datoTextos}>
              <AppText variant="caption" color={colors.textSecondary}>
                Racha de oración
              </AppText>
              <AppText style={styles.rachaTexto}>
                {racha === null ? 'No disponible por ahora' : textoRacha(racha)}
              </AppText>
            </View>
          </View>

          <View style={styles.section}>
            <AppText variant="eyebrow">Datos básicos</AppText>
            <View style={styles.card}>
              <FilaDato icon="mail-outline" label="Correo" value={correo} />
              <View style={styles.datoSeparador} />
              <FilaDato
                icon="call-outline"
                label="Teléfono"
                value={perfil.telefono ?? 'Sin agregar'}
              />
              <View style={styles.datoSeparador} />
              <FilaDato
                icon="calendar-outline"
                label="Miembro desde"
                value={formatearMiembroDesde(perfil.creado_en)}
              />
            </View>
          </View>
        </>
      ) : null}

      <View style={styles.section}>
        <AppText variant="eyebrow">Mi actividad</AppText>
        <View style={styles.card}>
          <MenuRow
            icon="heart-outline"
            title="Mis donaciones"
            description="Donaciones únicas y mensuales"
            onPress={() => proximamente('Mis donaciones')}
          />
          <MenuSeparator />
          <MenuRow
            icon="bag-handle-outline"
            title="Mis pedidos"
            description="Compras de la tienda"
            onPress={() => proximamente('Mis pedidos')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <AppText variant="eyebrow">Cuenta</AppText>
        <View style={styles.card}>
          <MenuRow
            icon="person-outline"
            title="Editar perfil"
            description="Foto, nombre y teléfono"
            disabled={!perfil}
            onPress={() => router.push('/editar-perfil')}
          />
          <MenuSeparator />
          <MenuRow
            icon="settings-outline"
            title="Configuración de la cuenta"
            description="Seguridad, privacidad y comunicaciones"
            onPress={() => router.push('/configuracion')}
          />
        </View>
      </View>

      <View style={styles.card}>
        <MenuRow
          icon="log-out-outline"
          title={cerrando ? 'Cerrando sesión…' : 'Cerrar sesión'}
          tone="danger"
          showChevron={false}
          disabled={cerrando}
          onPress={salir}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centro: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: 6,
  },
  avatar: {
    marginBottom: spacing.sm,
    boxShadow: '0px 0px 0px 8px rgba(161, 30, 33, 0.08)',
  },
  name: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.8,
    textAlign: 'center',
  },
  racha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: colors.accentLight,
  },
  rachaIcono: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
  rachaTexto: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 17,
    color: colors.text,
  },
  section: {
    gap: 10,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
    overflow: 'hidden',
  },
  dato: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  datoTextos: {
    flex: 1,
    gap: 2,
  },
  datoValor: {
    fontFamily: fonts.sansSemiBold,
    fontSize: 15,
    color: colors.text,
  },
  datoSeparador: {
    height: 1,
    marginLeft: 48,
    backgroundColor: colors.border,
  },
});
