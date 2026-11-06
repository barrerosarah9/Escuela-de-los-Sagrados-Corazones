import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import {
  estaEnCurso,
  fechaDeHoyEnBogota,
  obtenerOracionEnVivoDeHoy,
  type OracionEnVivo,
} from './oracion-en-vivo';

const INTERVALO_RELOJ_MS = 30_000;

export function useOracionEnVivo() {
  const [oracion, setOracion] = useState<OracionEnVivo | null>(null);
  const [ahora, setAhora] = useState(() => new Date());
  const generacion = useRef(0);
  const fechaConsultada = useRef<string | null>(null);

  const consultar = useCallback(async (miGeneracion: number) => {
    try {
      const resultado = await obtenerOracionEnVivoDeHoy();
      if (miGeneracion === generacion.current) setOracion(resultado);
    } catch {
      return;
    }
  }, []);

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

  const unirse = useCallback(() => {
    if (!enlace) return;
    Linking.openURL(enlace).catch(() => {
      Alert.alert('No se pudo abrir la reunión', 'Intenta de nuevo en unos segundos.');
    });
  }, [enlace]);

  return {
    oracion: oracionDeHoy,
    enCurso: oracionDeHoy ? estaEnCurso(oracionDeHoy, ahora) : false,
    recargar,
    unirse,
  };
}
