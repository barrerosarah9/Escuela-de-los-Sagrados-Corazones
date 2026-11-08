import { createClient } from 'npm:@supabase/supabase-js@2';
import { type Correo, formatoMedioPago } from '../_shared/correos/base.ts';
import { comprobanteCompra } from '../_shared/correos/comprobante-compra.ts';
import { comprobanteDonacion } from '../_shared/correos/comprobante-donacion.ts';
import { enviarCorreo } from '../_shared/correos/enviar.ts';
import { recordatorioPagoRechazado } from '../_shared/correos/recordatorio-pago.ts';

const MAX_DESTINATARIOS = 3;
const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PAUSA_ENTRE_ENVIOS_MS = 600;

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

function esperar(milisegundos: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, milisegundos));
}

function correosDeMuestra(): Correo[] {
  const hoy = new Date();
  const enUnMes = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return [
    comprobanteDonacion({
      nombre: 'María',
      numero: 'D-000123',
      fecha: hoy,
      montoCentavos: 5000000,
      tipo: 'mensual',
      metodoPago: formatoMedioPago('tarjeta', '4242'),
      donante: 'María Fernanda Gómez',
      proximoCobro: enUnMes,
    }),
    comprobanteCompra({
      nombre: 'María',
      pedidoId: 'prueba',
      numeroPedido: 'P-000045',
      fecha: hoy,
      metodoPago: formatoMedioPago('nequi'),
      articulos: [
        {
          tipo: 'Libro',
          nombre: 'Historia de un alma',
          detalle: 'Santa Teresa de Lisieux · Tapa blanda',
          cantidad: 1,
          precioUnitarioCentavos: 4500000,
        },
        {
          tipo: 'Rosario',
          nombre: 'Rosario de madera de olivo',
          detalle: 'Cuentas de 8 mm con cruz de metal',
          cantidad: 2,
          precioUnitarioCentavos: 2500000,
        },
      ],
      subtotalCentavos: 9500000,
      envioCentavos: 1200000,
      totalCentavos: 10700000,
      envio: {
        nombre: 'María Fernanda Gómez',
        direccion: 'Carrera 43A # 1-50, apto 802',
        ciudad: 'Medellín',
        departamento: 'Antioquia',
        telefono: '300 123 4567',
      },
    }),
    recordatorioPagoRechazado({
      nombre: 'María',
      montoCentavos: 5000000,
      fechaIntento: hoy,
      metodoPago: formatoMedioPago('tarjeta', '4242'),
      motivo: 'Fondos insuficientes',
      proximoIntento: enUnMes,
    }),
  ];
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
    .select('rol, bloqueado')
    .eq('id', user.id)
    .maybeSingle();
  if (errorPerfil) {
    console.error('perfil', errorPerfil);
    return responder(500, { error: 'error_perfil' });
  }
  if (perfil?.rol !== 'administrador' || perfil.bloqueado) {
    return responder(403, { error: 'solo_administradores' });
  }

  let cuerpo: { para?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return responder(400, { error: 'cuerpo_invalido' });
  }

  const para = Array.isArray(cuerpo.para) ? cuerpo.para : [];
  const validos = para.filter(
    (correo): correo is string => typeof correo === 'string' && PATRON_CORREO.test(correo),
  );
  if (validos.length === 0 || validos.length !== para.length || validos.length > MAX_DESTINATARIOS) {
    return responder(400, { error: 'destinatarios_invalidos' });
  }

  const enviados: Array<{ para: string; asunto: string; id: string }> = [];
  for (const destinatario of validos) {
    for (const correo of correosDeMuestra()) {
      try {
        const id = await enviarCorreo({
          para: destinatario,
          correo: { ...correo, asunto: `[Prueba] ${correo.asunto}` },
        });
        enviados.push({ para: destinatario, asunto: correo.asunto, id });
      } catch (error) {
        console.error('envio', error);
        return responder(502, { error: 'error_envio', detalle: String(error), enviados });
      }
      await esperar(PAUSA_ENTRE_ENVIOS_MS);
    }
  }

  return responder(200, { enviados });
});
