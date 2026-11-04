import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ErrorFeed,
  obtenerPaginaFeed,
  type CursorFeed,
  type MotivoErrorFeed,
  type Publicacion,
} from './feed';

type EstadoFeed = 'cargando' | 'listo' | 'error';

function motivoDe(error: unknown): MotivoErrorFeed {
  return error instanceof ErrorFeed ? error.motivo : 'desconocido';
}

function unirSinRepetidos(actuales: Publicacion[], nuevas: Publicacion[]) {
  const vistos = new Set(actuales.map((publicacion) => publicacion.id));
  return [...actuales, ...nuevas.filter((publicacion) => !vistos.has(publicacion.id))];
}

export function useFeed() {
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [siguiente, setSiguiente] = useState<CursorFeed | null>(null);
  const [estado, setEstado] = useState<EstadoFeed>('cargando');
  const [motivoError, setMotivoError] = useState<MotivoErrorFeed | null>(null);
  const [refrescando, setRefrescando] = useState(false);
  const [cargandoMas, setCargandoMas] = useState(false);
  const [errorAlCargarMas, setErrorAlCargarMas] = useState(false);
  const generacion = useRef(0);
  const pidiendoMas = useRef(false);

  const resolverPrimeraPagina = useCallback(
    async (miGeneracion: number, modo: 'inicial' | 'refresco') => {
      try {
        const pagina = await obtenerPaginaFeed(null);
        if (miGeneracion !== generacion.current) return;
        setPublicaciones(pagina.publicaciones);
        setSiguiente(pagina.siguiente);
        setMotivoError(null);
        setEstado('listo');
      } catch (error) {
        if (miGeneracion !== generacion.current) return;
        setMotivoError(motivoDe(error));
        if (modo === 'inicial') setEstado('error');
      } finally {
        if (miGeneracion === generacion.current) setRefrescando(false);
      }
    },
    [],
  );

  useEffect(() => {
    const miGeneracion = ++generacion.current;
    void resolverPrimeraPagina(miGeneracion, 'inicial');
  }, [resolverPrimeraPagina]);

  const reiniciar = useCallback(
    (modo: 'inicial' | 'refresco') => {
      const miGeneracion = ++generacion.current;
      pidiendoMas.current = false;
      setCargandoMas(false);
      setErrorAlCargarMas(false);
      if (modo === 'inicial') setEstado('cargando');
      else setRefrescando(true);
      void resolverPrimeraPagina(miGeneracion, modo);
    },
    [resolverPrimeraPagina],
  );

  const reintentar = useCallback(() => reiniciar('inicial'), [reiniciar]);
  const refrescar = useCallback(() => reiniciar('refresco'), [reiniciar]);

  const cargarMas = useCallback(async () => {
    if (!siguiente || pidiendoMas.current || refrescando || estado !== 'listo') return;
    const miGeneracion = generacion.current;
    pidiendoMas.current = true;
    setCargandoMas(true);
    setErrorAlCargarMas(false);

    try {
      const pagina = await obtenerPaginaFeed(siguiente);
      if (miGeneracion !== generacion.current) return;
      setPublicaciones((actuales) => unirSinRepetidos(actuales, pagina.publicaciones));
      setSiguiente(pagina.siguiente);
    } catch {
      if (miGeneracion !== generacion.current) return;
      setErrorAlCargarMas(true);
    } finally {
      if (miGeneracion === generacion.current) {
        pidiendoMas.current = false;
        setCargandoMas(false);
      }
    }
  }, [siguiente, refrescando, estado]);

  return {
    publicaciones,
    estado,
    motivoError,
    refrescando,
    cargandoMas,
    errorAlCargarMas,
    hayMas: siguiente !== null,
    reintentar,
    refrescar,
    cargarMas,
  };
}
