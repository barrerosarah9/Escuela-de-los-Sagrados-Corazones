import { useCallback, useEffect, useState } from 'react';
import { motivoDe, type MotivoErrorOraciones } from './oraciones-hoy';

type Resultado<T> =
  | { estado: 'cargando'; datos: null; motivo: MotivoErrorOraciones }
  | { estado: 'listo'; datos: T; motivo: MotivoErrorOraciones }
  | { estado: 'error'; datos: null; motivo: MotivoErrorOraciones };

export function useCarga<T>(cargar: () => Promise<T>) {
  const [resultado, setResultado] = useState<Resultado<T>>({
    estado: 'cargando',
    datos: null,
    motivo: 'desconocido',
  });
  const [intento, setIntento] = useState(0);
  const [refrescando, setRefrescando] = useState(false);

  useEffect(() => {
    let activo = true;
    cargar().then(
      (datos) => {
        if (!activo) return;
        setResultado({ estado: 'listo', datos, motivo: 'desconocido' });
        setRefrescando(false);
      },
      (error: unknown) => {
        if (!activo) return;
        setResultado({ estado: 'error', datos: null, motivo: motivoDe(error) });
        setRefrescando(false);
      },
    );
    return () => {
      activo = false;
    };
  }, [cargar, intento]);

  const reintentar = useCallback(() => {
    setResultado({ estado: 'cargando', datos: null, motivo: 'desconocido' });
    setIntento((valor) => valor + 1);
  }, []);

  const refrescar = useCallback(() => {
    setRefrescando(true);
    setIntento((valor) => valor + 1);
  }, []);

  return { ...resultado, refrescando, reintentar, refrescar };
}
