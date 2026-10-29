import { createClient } from 'npm:@supabase/supabase-js@2';
import { cancelarDonacionesMensuales } from '../_shared/donaciones.ts';

const BUCKET_AVATARES = 'avatares';

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

Deno.serve(async (req) => {
  if (req.method !== 'POST') return responder(405, { error: 'metodo_no_permitido' });

  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return responder(401, { error: 'sin_sesion' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, claveSecreta(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const {
    data: { user },
    error: errorUsuario,
  } = await admin.auth.getUser(token);
  if (errorUsuario || !user) return responder(401, { error: 'sesion_invalida' });

  const { data: perfil, error: errorPerfil } = await admin
    .from('perfiles')
    .select('rol, foto_path')
    .eq('id', user.id)
    .maybeSingle();
  if (errorPerfil) {
    console.error('perfil', errorPerfil);
    return responder(500, { error: 'error_eliminacion' });
  }
  if (perfil?.rol === 'administrador') {
    return responder(403, { error: 'cuenta_administrador' });
  }

  try {
    await cancelarDonacionesMensuales(admin, user.id);
  } catch (error) {
    console.error('donaciones', error);
    return responder(500, { error: 'error_donaciones' });
  }

  const rutas = new Set<string>();
  if (perfil?.foto_path) rutas.add(perfil.foto_path);

  const { data: archivos, error: errorLista } = await admin.storage
    .from(BUCKET_AVATARES)
    .list(user.id, { limit: 100 });
  if (errorLista) {
    console.error('lista de fotos', errorLista);
    return responder(500, { error: 'error_eliminacion' });
  }
  for (const archivo of archivos ?? []) rutas.add(`${user.id}/${archivo.name}`);

  if (rutas.size > 0) {
    const { error: errorFoto } = await admin.storage.from(BUCKET_AVATARES).remove([...rutas]);
    if (errorFoto) {
      console.error('foto', errorFoto);
      return responder(500, { error: 'error_eliminacion' });
    }
  }

  const { error: errorBorrado } = await admin.auth.admin.deleteUser(user.id);
  if (errorBorrado) {
    console.error('usuario', errorBorrado);
    if (perfil?.foto_path) {
      await admin.from('perfiles').update({ foto_path: null }).eq('id', user.id);
    }
    return responder(500, { error: 'error_eliminacion' });
  }

  return responder(200, { eliminada: true });
});
