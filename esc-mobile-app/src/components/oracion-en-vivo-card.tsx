import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, View } from 'react-native';
import { formatearHora, type EstadoOracionEnVivo } from '../lib/oracion-en-vivo';
import { colors, fonts, radius, shadows } from '../theme';
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
  confirmada: boolean;
  guardandoAsistencia: boolean;
  onUnirse: () => void;
  onAlternarAsistencia: () => void;
};

type BotonProps = {
  destacado: boolean;
};

type BotonAsistenciaProps = BotonProps & {
  confirmada: boolean;
  guardando: boolean;
  onPress: () => void;
};

type BotonUnirseProps = BotonProps & {
  habilitado: boolean;
  onPress: () => void;
};

function BotonAsistencia({ destacado, confirmada, guardando, onPress }: BotonAsistenciaProps) {
  const iconoConfirmado = destacado ? 'checkmark' : 'checkmark-circle';
  const icono = confirmada ? iconoConfirmado : destacado ? null : 'add-circle-outline';

  return (
    <Pressable
      onPress={onPress}
      disabled={guardando}
      hitSlop={destacado ? undefined : 12}
      accessibilityRole="button"
      accessibilityLabel={confirmada ? 'Asistencia confirmada' : 'Confirmar asistencia'}
      accessibilityHint={confirmada ? 'Toca para cancelar tu asistencia' : undefined}
      accessibilityState={{ selected: confirmada, busy: guardando }}
      style={({ pressed }) => [
        destacado ? styles.pildora : styles.botonTexto,
        destacado && (confirmada ? styles.pildoraSuave : styles.pildoraBlanca),
        (pressed || guardando) && styles.presionado,
      ]}
    >
      {icono ? <Ionicons name={icono} size={destacado ? 14 : 16} color={TINTA} /> : null}
      <AppText variant="label" color={TINTA} style={destacado ? undefined : styles.textoSecundario}>
        {confirmada ? 'Confirmado' : 'Confirmar asistencia'}
      </AppText>
    </Pressable>
  );
}

function BotonUnirse({ destacado, habilitado, onPress }: BotonUnirseProps) {
  const color = destacado ? colors.white : habilitado ? TINTA : TINTA_DESHABILITADA;

  return (
    <Pressable
      onPress={onPress}
      disabled={!habilitado}
      hitSlop={destacado ? undefined : 12}
      accessibilityRole="button"
      accessibilityState={{ disabled: !habilitado }}
      accessibilityHint={habilitado ? 'Abre la reunión en Google Meet' : undefined}
      style={({ pressed }) => [
        destacado ? [styles.pildora, styles.pildoraPrincipal] : styles.botonTexto,
        pressed && styles.presionado,
      ]}
    >
      <Ionicons name="videocam" size={17} color={color} />
      <AppText variant="label" color={color} style={styles.textoSecundario}>
        Unirse a la oración
      </AppText>
    </Pressable>
  );
}

export function OracionEnVivoCard({
  titulo,
  hora,
  estado,
  oficioDeManana,
  confirmada,
  guardandoAsistencia,
  onUnirse,
  onAlternarAsistencia,
}: Props) {
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

      {enCurso ? (
        <View style={styles.acciones}>
          <View style={styles.bloqueEnCurso}>
            <AppText variant="eyebrow" style={styles.enCurso}>
              En curso
            </AppText>
            <BotonUnirse destacado habilitado onPress={onUnirse} />
          </View>
          <BotonAsistencia
            destacado={false}
            confirmada={confirmada}
            guardando={guardandoAsistencia}
            onPress={onAlternarAsistencia}
          />
        </View>
      ) : (
        <View style={styles.acciones}>
          {terminada ? null : (
            <BotonAsistencia
              destacado
              confirmada={confirmada}
              guardando={guardandoAsistencia}
              onPress={onAlternarAsistencia}
            />
          )}
          <BotonUnirse destacado={false} habilitado={false} onPress={onUnirse} />
        </View>
      )}

      {estado === 'proxima' ? (
        <AppText variant="caption" color={TINTA_SUAVE} style={styles.aviso}>
          El enlace estará disponible próximamente, a partir de las {horaTexto}
        </AppText>
      ) : null}
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
    marginBottom: 14,
  },
  acciones: {
    alignItems: 'flex-start',
    gap: 10,
  },
  bloqueEnCurso: {
    alignItems: 'flex-start',
    gap: 6,
  },
  enCurso: {
    fontSize: 9,
    letterSpacing: 1.3,
  },
  pildora: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
  },
  pildoraBlanca: {
    backgroundColor: colors.white,
    boxShadow: '0px 8px 18px rgba(50, 93, 124, 0.18)',
  },
  pildoraSuave: {
    backgroundColor: 'rgba(255, 255, 255, 0.78)',
  },
  pildoraPrincipal: {
    backgroundColor: colors.primary,
    boxShadow: shadows.primaryButton,
  },
  botonTexto: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
  },
  textoSecundario: {
    fontSize: 13,
  },
  presionado: {
    opacity: 0.6,
  },
  aviso: {
    marginTop: 8,
  },
});
