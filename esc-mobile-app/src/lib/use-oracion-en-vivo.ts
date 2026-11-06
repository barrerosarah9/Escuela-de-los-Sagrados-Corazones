import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import {
  cancelarAsistencia,
  confirmarAsistencia,
  obtenerAsistenciaConfirmada,
  type MotivoErrorAsistencia,
} from './asistencia';
import {
  estadoDeOracion,
  fechaDeHoyEnBogota,
  obtenerOracionEnVivoDeHoy,
  type OracionEnVivo,
} from './oracion-en-vivo';
import { useSession } from './session';

const INTERVALO_RELOJ_MS = 30_000;

type AsistenciaGuardada = {
  oracionId: number;
  confirmada: boolean;
};

const MENSAJE_ERROR_ASISTENCIA: Record<MotivoErrorAsistencia, string> = {
  sin_conexion: 'Revisa tu conexión e intenta de nuevo.',
  cuenta_bloqueada: 'Tu cuenta está bloqueada y no puede confirmar asistencia.',
  oracion_eliminada: 'La oración de hoy ya no está disponible.',
  desconocido: 'Intenta de nuevo en unos segundos.',
};

export function useOracionEnVivo() {
  const { session } = useSession();
  const usuarioId = session?.user.id ?? null;
  const [oracion, setOracion] = useState<OracionEnVivo | null>(null);
  const [asistencia, setAsistencia] = useState<AsistenciaGuardada | null>(null);
  const [guardandoAsistencia, setGuardandoAsistencia] = useState(false);
  const [ahora, setAhora] = useState(() => new Date());
  const generacion = useRef(0);
  const fechaConsultada = useRef<string | null>(null);
  const guardando = useRef(false);

  const consultar = useCallback(
    async (miGeneracion: number) => {
      try {
        const resultado = await obtenerOracionEnVivoDeHoy();
        const confirmada =
          resultado && usuarioId
            ? await obtenerAsistenciaConfirmada(resultado.id, usuarioId).catch(() => null)
            : null;
        if (miGeneracion !== generacion.current) return;
        setOracion(resultado);
        if (resultado && confirmada !== null && !guardando.current) {
          setAsistencia({ oracionId: resultado.id, confirmada });
        }
      } catch {
        return;
      }
    },
    [usuarioId],
  );

  const recargar = useCallback(() => {
    const miGeneracion = ++generacion.current;
    fechaConsultada.current = fechaDeHoyEnBogota();
    return consultar(miGeneracion);
  }, [consultar]);

  useEffect(() => {
    const miGeneracion = ++generacion.current;
    fechaConsultada.current = fechaDeHoyEnBogota();
    void consultar(miGeneracion);
  }, [consultar]);

  useEffect(() => {
    const intervalo = setInterval(() => {
      const momento = new Date();
      setAhora(momento);
      if (fechaDeHoyEnBogota(momento) !== fechaConsultada.current) void recargar();
    }, INTERVALO_RELOJ_MS);

    const suscripcion = AppState.addEventListener('change', (estado) => {
      if (estado !== 'active') return;
      setAhora(new Date());
      void recargar();
    });

    return () => {
      clearInterval(intervalo);
      suscripcion.remove();
    };
  }, [recargar]);

  const oracionDeHoy = oracion && oracion.fecha === fechaDeHoyEnBogota(ahora) ? oracion : null;
  const enlace = oracionDeHoy?.enlaceMeet;
  const oracionId = oracionDeHoy?.id ?? null;
  const confirmada =
    oracionId !== null && asistencia?.oracionId === oracionId ? asistencia.confirmada : false;

  const unirse = useCallback(() => {
    if (!enlace) return;
    Linking.openURL(enlace).catch(() => {
      Alert.alert('No se pudo abrir la reunión', 'Intenta de nuevo en unos segundos.');
    });
  }, [enlace]);

  const cambiarAsistencia = useCallback(
    async (confirmar: boolean) => {
      if (oracionId === null || !usuarioId || guardando.current) return;
      guardando.current = true;
      setGuardandoAsistencia(true);
      setAsistencia({ oracionId, confirmada: confirmar });

      const resultado = confirmar
        ? await confirmarAsistencia(oracionId, usuarioId)
        : await cancelarAsistencia(oracionId, usuarioId);

      if (!resultado.ok) {
        setAsistencia({ oracionId, confirmada: !confirmar });
        Alert.alert(
          confirmar ? 'No se pudo confirmar tu asistencia' : 'No se pudo cancelar tu asistencia',
          MENSAJE_ERROR_ASISTENCIA[resultado.motivo],
        );
      }

      guardando.current = false;
      setGuardandoAsistencia(false);
      if (!resultado.ok && resultado.motivo === 'oracion_eliminada') void recargar();
    },
    [oracionId, usuarioId, recargar],
  );

  const alternarAsistencia = useCallback(() => {
    if (!confirmada) {
      void cambiarAsistencia(true);
      return;
    }
    Alert.alert('¿Cancelar tu asistencia?', 'Ya no aparecerás en la lista de asistentes de hoy.', [
      { text: 'Volver', style: 'cancel' },
      {
        text: 'Cancelar asistencia',
        style: 'destructive',
        onPress: () => void cambiarAsistencia(false),
      },
    ]);
  }, [confirmada, cambiarAsistencia]);

  return {
    oracion: oracionDeHoy,
    estado: oracionDeHoy ? estadoDeOracion(oracionDeHoy, ahora) : null,
    confirmada,
    guardandoAsistencia,
    recargar,
    unirse,
    alternarAsistencia,
  };
}
