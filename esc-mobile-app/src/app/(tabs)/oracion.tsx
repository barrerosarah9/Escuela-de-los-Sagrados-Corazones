import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from '../../components/app-text';
import { RachaOracion } from '../../components/racha-oracion';
import { SeccionOracionCard } from '../../components/seccion-oracion-card';
import { obtenerPerfil, obtenerRacha } from '../../lib/perfil';
import {
  abrirSeccion,
  DESCRIPCION_DIA,
  DESCRIPCION_MES,
  diaDeHoy,
  ETIQUETAS_SECCION,
  tituloSeccion,
} from '../../lib/secciones-oracion';
import { useSession } from '../../lib/session';
import { colors, fonts } from '../../theme';

function textoRachaTarjeta(racha: number | null) {
  if (racha === null) return DESCRIPCION_DIA;
  if (racha === 0) return 'Abre una oración para empezar tu racha.';
  return racha === 1
    ? 'Llevas 1 día en racha. Sigue caminando.'
    : `Llevas ${racha} días en racha. Sigue caminando.`;
}

function primerNombre(nombre: string | null) {
  const limpio = nombre?.trim();
  return limpio ? limpio.split(/\s+/)[0] : null;
}

export default function OracionScreen() {
  const { session } = useSession();
  const usuarioId = session?.user.id;
  const [racha, setRacha] = useState<number | null>(null);
  const [nombre, setNombre] = useState<string | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [dia, setDia] = useState(diaDeHoy);

  const cargar = useCallback(async () => {
    setDia(diaDeHoy());
    if (!usuarioId) return;
    const [resultadoRacha, resultadoPerfil] = await Promise.allSettled([
      obtenerRacha(usuarioId),
      obtenerPerfil(usuarioId),
    ]);
    setRacha(resultadoRacha.status === 'fulfilled' ? resultadoRacha.value : null);
    if (resultadoPerfil.status === 'fulfilled') {
      setNombre(resultadoPerfil.value?.nombre ?? null);
    }
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

  const saludo = primerNombre(nombre);

  return (
    <ScrollView
      style={styles.pantalla}
      contentContainerStyle={styles.contenido}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refrescando}
          onRefresh={refrescar}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      <View style={styles.encabezado}>
        {racha !== null ? <RachaOracion dias={racha} /> : <View style={styles.rachaReservada} />}
        <AppText variant="eyebrow" style={styles.eyebrow}>
          Tu espacio de oración
        </AppText>
        <AppText style={styles.saludo} accessibilityRole="header">
          {saludo ? `¡Hola, ${saludo}!` : '¡Hola!'}
        </AppText>
        <AppText variant="subtitle" style={styles.pregunta}>
          ¿Quieres acercarte más a Dios?
        </AppText>
        <AppText style={styles.invitacion}>
          Atiende el llamado de amor de Nuestro Señor y realiza estas oraciones para contentar su
          Corazón.
        </AppText>
      </View>

      <View style={styles.secciones}>
        <SeccionOracionCard
          icono="sunny-outline"
          etiqueta={ETIQUETAS_SECCION.dia}
          titulo={tituloSeccion('dia', dia)}
          descripcion={textoRachaTarjeta(racha)}
          tono="amarillo"
          onPress={() => abrirSeccion('dia')}
        />
        <SeccionOracionCard
          icono="heart-outline"
          etiqueta={ETIQUETAS_SECCION.semana}
          titulo={tituloSeccion('semana', dia)}
          descripcion={dia.oficio}
          tono="rojo"
          onPress={() => abrirSeccion('semana')}
        />
        <SeccionOracionCard
          icono="moon-outline"
          etiqueta={ETIQUETAS_SECCION.mes}
          titulo={tituloSeccion('mes', dia)}
          descripcion={DESCRIPCION_MES}
          tono="azul"
          onPress={() => abrirSeccion('mes')}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contenido: {
    paddingBottom: 32,
  },
  encabezado: {
    paddingHorizontal: 24,
    paddingTop: 18,
  },
  rachaReservada: {
    minHeight: 40,
  },
  eyebrow: {
    marginTop: 30,
  },
  saludo: {
    marginTop: 8,
    marginBottom: 7,
    fontFamily: fonts.serif,
    fontSize: 42,
    lineHeight: 44,
    letterSpacing: -1.4,
    color: colors.text,
  },
  pregunta: {
    marginBottom: 14,
  },
  invitacion: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.textSecondary,
  },
  secciones: {
    paddingTop: 21,
    paddingHorizontal: 14,
    gap: 12,
  },
});
