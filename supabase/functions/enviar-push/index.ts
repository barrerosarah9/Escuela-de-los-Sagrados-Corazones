import { createClient } from 'npm:@supabase/supabase-js@2';
import { enviarPush, type MensajePush } from '../_shared/push/fcm.ts';

const MAX_TITULO = 80;
const MAX_TEXTO = 240;
const MAX_USUARIOS = 1000;
const PATRON_PANTALLA = /^\/[A-Za-z0-9/_\-?=&]{0,199}$/;
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Solicitud = MensajePush & { usuarios: string[] | null };

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

function texto(valor: unknown, maximo: number): string | null {
  if (typeof valor !== 'string') return null;
  const limpio = valor.trim();
  return limpio.length > 0 && limpio.length <= maximo ? limpio : null;
}

function leerSolicitud(cuerpo: Record<string, unknown>): Solicitud | null {
  const titulo = texto(cuerpo.titulo, MAX_TITULO);
  const mensaje = texto(cuerpo.texto, MAX_TEXTO);
  const pantalla = typeof cuerpo.pantalla === 'string' ? cuerpo.pantalla : '';
  if (!titulo || !mensaje || !PATRON_PANTALLA.test(pantalla)) return null;

  if (cuerpo.usuarios === undefined || cuerpo.usuarios === null) {
    return { titulo, texto: mensaje, pantalla, usuarios: null };
  }
  if (!Array.isArray(cuerpo.usuarios) || cuerpo.usuarios.length > MAX_USUARIOS) return null;
  const usuarios = cuerpo.usuarios.filter(
    (id): id is string => typeof id === 'string' && PATRON_UUID.test(id),
  );
  if (usuarios.length !== cuerpo.usuarios.length) return null;
  return { titulo, texto: mensaje, pantalla, usuarios };
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return responder(405, { error: 'metodo_no_permitido' });

  const clave = claveSecreta();
  const autorizacion = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (autorizacion !== clave) return responder(401, { error: 'no_autorizado' });

  let cuerpo: Record<string, unknown>;
  try {
    cuerpo = await req.json();
  } catch {
    return responder(400, { error: 'cuerpo_invalido' });
  }
  const solicitud = leerSolicitud(cuerpo);
  if (!solicitud) return responder(400, { error: 'datos_invalidos' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, clave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let consulta = admin
    .from('tokens_dispositivo')
    .select('id, token, usuario_id, perfiles!inner(bloqueado)')
    .eq('perfiles.bloqueado', false);
  if (solicitud.usuarios) consulta = consulta.in('usuario_id', solicitud.usuarios);
  const { data, error: errorTokens } = await consulta;
  if (errorTokens) {
    console.error('tokens', errorTokens);
    return responder(500, { error: 'error_tokens' });
  }
  const filas = (data ?? []) as FilaToken[];

  const registro = {
    titulo: solicitud.titulo,
    texto: solicitud.texto,
    pantalla: solicitud.pantalla,
    destinatarios: filas.length,
  };

  let resultados;
  try {
    resultados = await enviarPush(
      solicitud,
      filas.map((fila) => fila.token),
    );
  } catch (error) {
    const mensaje = error instanceof Error ? error.message : String(error);
    console.error('fcm', mensaje);
    await admin
      .from('envios_push')
      .insert({ ...registro, fallidos: filas.length, error: mensaje });
    return responder(502, { error: 'error_fcm' });
  }

  const porToken = new Map(filas.map((fila) => [fila.token, fila]));
  const invalidos = resultados.filter((resultado) => resultado.estado === 'invalido');
  const fallidos = resultados.filter((resultado) => resultado.estado === 'fallido');

  if (invalidos.length > 0) {
    const { error: errorBorrado } = await admin
      .from('tokens_dispositivo')
      .delete()
      .in(
        'id',
        invalidos.map((resultado) => porToken.get(resultado.token)!.id),
      );
    if (errorBorrado) console.error('borrar tokens', errorBorrado);
  }

  const fallos = [...invalidos, ...fallidos].map((resultado) => ({
    usuario_id: porToken.get(resultado.token)!.usuario_id,
    estado: resultado.estado,
    codigo: resultado.codigo,
    mensaje: resultado.mensaje,
    intentos: resultado.intentos,
  }));

  const { data: envio, error: errorRegistro } = await admin
    .from('envios_push')
    .insert({
      ...registro,
      enviados: resultados.length - invalidos.length - fallidos.length,
      invalidos: invalidos.length,
      fallidos: fallidos.length,
      fallos,
    })
    .select('id')
    .single();
  if (errorRegistro) console.error('registro', errorRegistro);

  return responder(200, {
    envio_id: envio?.id ?? null,
    destinatarios: filas.length,
    enviados: resultados.length - invalidos.length - fallidos.length,
    invalidos: invalidos.length,
    fallidos: fallidos.length,
  });
});
