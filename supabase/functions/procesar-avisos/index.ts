import { createClient } from 'npm:@supabase/supabase-js@2';
import { enviarPush, type MensajePush, type ResultadoToken } from '../_shared/push/fcm.ts';

const LIMITE_AVISOS = 10;
const MAX_TEXTO = 240;

type Aviso = {
  id: number;
  tipo: 'publicacion_nueva' | 'contenido_diario';
  publicacion_id: number | null;
  fecha: string | null;
  texto: string | null;
};

type FilaToken = {
  id: number;
  token: string;
  usuario_id: string;
};

function claveSecreta(): string {
  const llaves = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (llaves) {
    const valor = JSON.parse(llaves).default;
    if (valor) return valor;
  }
  const legado = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!legado) throw new Error('Falta la clave secreta del proyecto');
  return legado;
}

function responder(estado: number, cuerpo: Record<string, unknown>): Response {
  return Response.json(cuerpo, { status: estado });
}

function recortar(valor: string, maximo: number): string {
  const limpio = valor.replace(/\s+/g, ' ').trim();
  if (limpio.length <= maximo) return limpio;
  return `${limpio.slice(0, maximo - 1).trimEnd()}…`;
}

function mensajeDe(aviso: Aviso): MensajePush {
  if (aviso.tipo === 'contenido_diario') {
    return {
      titulo: 'La oración de hoy ya está disponible',
      texto: 'Entra a Santifica el día y ora hoy con la Escuela.',
      pantalla: '/oracion',
    };
  }
  const texto = aviso.texto ? recortar(aviso.texto, MAX_TEXTO) : '';
  return {
    titulo: 'Nueva publicación de la Escuela',
    texto: texto || 'La Escuela compartió una nueva publicación.',
    pantalla: '/',
  };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return responder(405, { error: 'metodo_no_permitido' });

  const clave = claveSecreta();
  const autorizacion = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (autorizacion !== clave) return responder(401, { error: 'no_autorizado' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, clave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: datosAvisos, error: errorAvisos } = await admin.rpc('tomar_avisos_pendientes', {
    p_limite: LIMITE_AVISOS,
  });
  if (errorAvisos) {
    console.error('avisos', errorAvisos);
    return responder(500, { error: 'error_avisos' });
  }
  const avisos = (datosAvisos ?? []) as Aviso[];
  if (avisos.length === 0) return responder(200, { procesados: 0, avisos: [] });

  const { data: datosTokens, error: errorTokens } = await admin
    .from('tokens_dispositivo')
    .select('id, token, usuario_id, perfiles!inner(bloqueado)')
    .eq('perfiles.bloqueado', false);
  if (errorTokens) {
    console.error('tokens', errorTokens);
    return responder(500, { error: 'error_tokens' });
  }
  let filas = (datosTokens ?? []) as FilaToken[];

  const resumen: Record<string, unknown>[] = [];

  for (const aviso of avisos) {
    const mensaje = mensajeDe(aviso);
    const registro = {
      titulo: mensaje.titulo,
      texto: mensaje.texto,
      pantalla: mensaje.pantalla,
      destinatarios: filas.length,
    };

    let resultados: ResultadoToken[];
    try {
      resultados = await enviarPush(
        mensaje,
        filas.map((fila) => fila.token),
      );
    } catch (error) {
      const detalle = error instanceof Error ? error.message : String(error);
      console.error('fcm', aviso.id, detalle);
      await admin
        .from('envios_push')
        .insert({ ...registro, fallidos: filas.length, error: detalle });
      resumen.push({ aviso_id: aviso.id, tipo: aviso.tipo, estado: 'error' });
      continue;
    }

    const porToken = new Map(filas.map((fila) => [fila.token, fila]));
    const invalidos = resultados.filter((resultado) => resultado.estado === 'invalido');
    const fallidos = resultados.filter((resultado) => resultado.estado === 'fallido');

    if (invalidos.length > 0) {
      const idsInvalidos = new Set(
        invalidos.map((resultado) => porToken.get(resultado.token)!.id),
      );
      const { error: errorBorrado } = await admin
        .from('tokens_dispositivo')
        .delete()
        .in('id', [...idsInvalidos]);
      if (errorBorrado) console.error('borrar tokens', errorBorrado);
      filas = filas.filter((fila) => !idsInvalidos.has(fila.id));
    }

    const fallos = [...invalidos, ...fallidos].map((resultado) => ({
      usuario_id: porToken.get(resultado.token)!.usuario_id,
      estado: resultado.estado,
      codigo: resultado.codigo,
      mensaje: resultado.mensaje,
      intentos: resultado.intentos,
    }));
    const enviados = resultados.length - invalidos.length - fallidos.length;

    const { data: envio, error: errorRegistro } = await admin
      .from('envios_push')
      .insert({
        ...registro,
        enviados,
        invalidos: invalidos.length,
        fallidos: fallidos.length,
        fallos,
      })
      .select('id')
      .single();
    if (errorRegistro) console.error('registro', errorRegistro);

    const { error: errorAviso } = await admin
      .from('avisos_push')
      .update({ enviado_en: new Date().toISOString(), envio_id: envio?.id ?? null })
      .eq('id', aviso.id);
    if (errorAviso) console.error('marcar aviso', aviso.id, errorAviso);

    resumen.push({
      aviso_id: aviso.id,
      tipo: aviso.tipo,
      estado: 'enviado',
      destinatarios: registro.destinatarios,
      enviados,
      invalidos: invalidos.length,
      fallidos: fallidos.length,
    });
  }

  return responder(200, { procesados: avisos.length, avisos: resumen });
});
