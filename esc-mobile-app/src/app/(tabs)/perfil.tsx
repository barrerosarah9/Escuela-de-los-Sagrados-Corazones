import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/app-text';
import { MenuRow, MenuSeparator } from '../../components/menu-row';
import { cerrarSesion, confirmarCierreDeSesion } from '../../lib/cerrar-sesion';
import { useSession } from '../../lib/session';
import { supabase } from '../../lib/supabase';
import { colors, fonts, spacing } from '../../theme';

type DatosPerfil = {
  nombre: string;
  correo: string;
};

function obtenerIniciales(nombre: string) {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  const iniciales = palabras
    .slice(0, 2)
    .map((palabra) => palabra[0])
    .join('');
  return iniciales.toUpperCase() || '?';
}

function proximamente(opcion: string) {
  Alert.alert('Disponible pronto', `${opcion} estará disponible en una próxima versión.`);
}

export default function PerfilScreen() {
  const { session } = useSession();
  const usuarioId = session?.user.id;
  const [perfil, setPerfil] = useState<DatosPerfil | null>(null);
  const [cerrando, setCerrando] = useState(false);

  useEffect(() => {
    if (!usuarioId) {
      return;
    }
    supabase
      .from('perfiles')
      .select('nombre, correo')
      .eq('id', usuarioId)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPerfil(data);
        }
      });
  }, [usuarioId]);

  const nombre = perfil?.nombre ?? '';
  const correo = perfil?.correo ?? session?.user.email ?? '';

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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <View style={styles.avatar}>
          <AppText style={styles.avatarText}>{obtenerIniciales(nombre || correo)}</AppText>
        </View>
        <AppText style={styles.name}>{nombre || 'Tu perfil'}</AppText>
        {correo ? <AppText color={colors.textSecondary}>{correo}</AppText> : null}
      </View>

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
            description="Nombre, foto y teléfono"
            onPress={() => proximamente('Editar perfil')}
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
    width: 84,
    height: 84,
    borderRadius: 42,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    boxShadow: '0px 0px 0px 8px rgba(161, 30, 33, 0.08)',
  },
  avatarText: {
    fontFamily: fonts.serif,
    fontSize: 32,
    color: colors.white,
  },
  name: {
    fontFamily: fonts.serif,
    fontSize: 30,
    lineHeight: 34,
    letterSpacing: -0.8,
    textAlign: 'center',
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
});
