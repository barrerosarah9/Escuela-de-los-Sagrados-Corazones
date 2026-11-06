import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatearHora, type EstadoOracionEnVivo } from '../lib/oracion-en-vivo';
import { colors, fonts, radius } from '../theme';
import { AppText } from './app-text';
import { PuntoEnVivo } from './punto-en-vivo';

const TINTA = '#0A1A2E';
const TINTA_SUAVE = 'rgba(10, 26, 46, 0.72)';
const TINTA_DESHABILITADA = 'rgba(10, 26, 46, 0.42)';

type Props = {
  titulo: string;
  hora: string;
  estado: EstadoOracionEnVivo;
  oficioDeManana: string | null;
  onUnirse: () => void;
};

export function OracionEnVivoCard({ titulo, hora, estado, oficioDeManana, onUnirse }: Props) {
  const horaTexto = formatearHora(hora);
  const enCurso = estado === 'en_curso';
  const terminada = estado === 'terminada';
  const invitacionManana = oficioDeManana
    ? ` Te esperamos mañana para orar ${oficioDeManana}.`
    : '';
  const descripcion = terminada
    ? `La oración de hoy ya terminó. ¡Gracias por acompañarnos!${invitacionManana}`
    : 'Te esperamos para unirnos a orar por las familias y las intenciones de nuestra comunidad.';

  return (
    <View style={styles.tarjeta}>
      <View style={[styles.ovalo, styles.ovaloInferior]} pointerEvents="none" />
      <View style={[styles.ovalo, styles.ovaloSuperior]} pointerEvents="none" />

      <View style={styles.cabecera}>
        <View style={styles.etiqueta}>
          <Ionicons name="videocam-outline" size={15} color={TINTA} />
          <AppText variant="eyebrow" color={TINTA} style={styles.etiquetaTexto}>
            Te esperamos • En vivo
          </AppText>
        </View>
        <View
          style={styles.pildoraHora}
          accessible
          accessibilityLabel={
            enCurso
              ? `En curso desde las ${horaTexto}`
              : terminada
                ? `Terminó; empezó a las ${horaTexto}`
                : `A las ${horaTexto}`
          }
        >
          {enCurso ? (
            <View style={styles.iconoHora}>
              <PuntoEnVivo />
            </View>
          ) : (
            <Ionicons name="alarm-outline" size={15} color={TINTA} />
          )}
          <AppText style={styles.horaTexto}>{horaTexto}</AppText>
        </View>
      </View>

      <AppText variant="title" color={TINTA} style={styles.titulo} accessibilityRole="header">
        {titulo}
      </AppText>
      <AppText color={TINTA} style={styles.descripcion}>
        {descripcion}
      </AppText>

      <View style={styles.enlace}>
        {enCurso ? (
          <AppText variant="eyebrow" style={styles.enCurso}>
            En curso
          </AppText>
        ) : null}
        <Pressable
          onPress={onUnirse}
          disabled={!enCurso}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityState={{ disabled: !enCurso }}
          accessibilityHint={enCurso ? 'Abre la reunión en Google Meet' : undefined}
          style={({ pressed }) => [styles.botonUnirse, pressed && styles.presionado]}
        >
          <Ionicons name="videocam" size={17} color={enCurso ? TINTA : TINTA_DESHABILITADA} />
          <AppText
            variant="label"
            color={enCurso ? TINTA : TINTA_DESHABILITADA}
            style={styles.botonTexto}
          >
            Unirse a la oración
          </AppText>
        </Pressable>
        {estado === 'proxima' ? (
          <AppText variant="caption" color={TINTA_SUAVE}>
            El enlace estará disponible a partir de las {horaTexto}
          </AppText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tarjeta: {
    overflow: 'hidden',
    paddingHorizontal: 23,
    paddingTop: 25,
    paddingBottom: 23,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    backgroundColor: colors.sky,
    boxShadow: '0px 16px 32px rgba(67, 112, 145, 0.2)',
  },
  ovalo: {
    position: 'absolute',
    borderRadius: radius.pill,
  },
  ovaloInferior: {
    width: 310,
    height: 125,
    left: -105,
    bottom: -84,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ rotate: '8deg' }],
  },
  ovaloSuperior: {
    width: 270,
    height: 105,
    right: -92,
    top: -67,
    backgroundColor: 'rgba(255, 255, 255, 0.09)',
    transform: [{ rotate: '-10deg' }],
  },
  cabecera: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  etiqueta: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  etiquetaTexto: {
    fontSize: 9,
    letterSpacing: 1.3,
  },
  pildoraHora: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 15,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(10, 26, 46, 0.14)',
    backgroundColor: 'rgba(255, 255, 255, 0.34)',
  },
  iconoHora: {
    width: 15,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horaTexto: {
    fontFamily: fonts.sansBold,
    fontSize: 14,
    color: TINTA,
  },
  titulo: {
    marginTop: 17,
    marginBottom: 8,
  },
  descripcion: {
    marginBottom: 22,
  },
  enlace: {
    alignItems: 'flex-start',
    gap: 5,
  },
  enCurso: {
    fontSize: 9,
    letterSpacing: 1.3,
  },
  botonUnirse: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  presionado: {
    opacity: 0.6,
  },
  botonTexto: {
    fontSize: 13,
  },
});
