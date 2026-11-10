const ALCANCE = 'https://www.googleapis.com/auth/firebase.messaging';
const URL_TOKEN = 'https://oauth2.googleapis.com/token';
const INTENTOS = 3;
const ESPERA_BASE_MS = 500;
const ENVIOS_SIMULTANEOS = 20;
const CANAL_POR_DEFECTO = 'general';

type CuentaServicio = {
  project_id: string;
  client_email: string;
  private_key: string;
};

export type MensajePush = {
  titulo: string;
  texto: string;
  pantalla: string;
  canal?: string;
};

export type EstadoEnvio = 'enviado' | 'invalido' | 'fallido';

export type ResultadoToken = {
  token: string;
  estado: EstadoEnvio;
  intentos: number;
  codigo?: string;
  mensaje?: string;
};

type ErrorFcm = {
  error?: {
    status?: string;
    message?: string;
    details?: Array<{ errorCode?: string }>;
  };
};

let accesoEnCache: { token: string; vence: number } | null = null;

function leerCuenta(): CuentaServicio {
  const crudo = Deno.env.get('FCM_CUENTA_SERVICIO');
  if (!crudo) throw new Error('Falta el secreto FCM_CUENTA_SERVICIO');
  const cuenta = JSON.parse(crudo) as Partial<CuentaServicio>;
  if (!cuenta.project_id || !cuenta.client_email || !cuenta.private_key) {
    throw new Error('FCM_CUENTA_SERVICIO no es una cuenta de servicio válida');
  }
  return cuenta as CuentaServicio;
}

function base64Url(datos: Uint8Array | string): string {
  const bytes = typeof datos === 'string' ? new TextEncoder().encode(datos) : datos;
  let binario = '';
  for (const byte of bytes) binario += String.fromCharCode(byte);
  return btoa(binario).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function firmarAfirmacion(cuenta: CuentaServicio): Promise<string> {
  const ahora = Math.floor(Date.now() / 1000);
  const encabezado = base64Url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const carga = base64Url(
    JSON.stringify({
      iss: cuenta.client_email,
      scope: ALCANCE,
      aud: URL_TOKEN,
      iat: ahora,
      exp: ahora + 3600,
    }),
  );
  const pem = cuenta.private_key.replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const der = Uint8Array.from(atob(pem), (caracter) => caracter.charCodeAt(0));
  const llave = await crypto.subtle.importKey(
    'pkcs8',
    der,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const firma = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    llave,
    new TextEncoder().encode(`${encabezado}.${carga}`),
  );
  return `${encabezado}.${carga}.${base64Url(new Uint8Array(firma))}`;
}

async function tokenDeAcceso(cuenta: CuentaServicio): Promise<string> {
  if (accesoEnCache && accesoEnCache.vence > Date.now() + 60_000) return accesoEnCache.token;
  const respuesta = await fetch(URL_TOKEN, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await firmarAfirmacion(cuenta),
    }),
  });
  const cuerpo = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok || !cuerpo.access_token) {
    throw new Error(`Google no entregó el token de acceso (${respuesta.status})`);
  }
  accesoEnCache = {
    token: cuerpo.access_token,
    vence: Date.now() + Number(cuerpo.expires_in ?? 3600) * 1000,
  };
  return accesoEnCache.token;
}

function esperar(milisegundos: number): Promise<void> {
  return new Promise((resolver) => setTimeout(resolver, milisegundos));
}

export function clasificarRespuesta(
  estado: number,
  cuerpo: ErrorFcm,
): { tipo: 'invalido' | 'reintentar' | 'fallido'; codigo: string; mensaje: string } {
  const codigoDetalle = cuerpo.error?.details?.find((detalle) => detalle.errorCode)?.errorCode;
  const codigo = codigoDetalle ?? cuerpo.error?.status ?? `HTTP_${estado}`;
  const mensaje = cuerpo.error?.message ?? '';
  if (estado === 404 || codigo === 'UNREGISTERED' || codigo === 'SENDER_ID_MISMATCH') {
    return { tipo: 'invalido', codigo, mensaje };
  }
  if (estado === 400 && /registration token/i.test(mensaje)) {
    return { tipo: 'invalido', codigo, mensaje };
  }
  if (estado === 429 || estado >= 500) return { tipo: 'reintentar', codigo, mensaje };
  return { tipo: 'fallido', codigo, mensaje };
}

function esperaAntesDe(intento: number, reintentarEn: string | null): number {
  const segundos = Number(reintentarEn);
  if (Number.isFinite(segundos) && segundos > 0) return Math.min(segundos, 10) * 1000;
  return ESPERA_BASE_MS * 2 ** (intento - 1);
}

async function enviarAToken(
  cuenta: CuentaServicio,
  acceso: string,
  token: string,
  mensaje: MensajePush,
): Promise<ResultadoToken> {
  let codigo = 'SIN_RESPUESTA';
  let detalle = '';
  for (let intento = 1; intento <= INTENTOS; intento++) {
    let reintentarEn: string | null = null;
    try {
      const respuesta = await fetch(
        `https://fcm.googleapis.com/v1/projects/${cuenta.project_id}/messages:send`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${acceso}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: mensaje.titulo, body: mensaje.texto },
              data: { pantalla: mensaje.pantalla },
              android: {
                priority: 'high',
                notification: { channel_id: mensaje.canal ?? CANAL_POR_DEFECTO },
              },
              apns: { payload: { aps: { sound: 'default' } } },
            },
          }),
        },
      );
      if (respuesta.ok) return { token, estado: 'enviado', intentos: intento };
      const cuerpo = (await respuesta.json().catch(() => ({}))) as ErrorFcm;
      const clasificacion = clasificarRespuesta(respuesta.status, cuerpo);
      codigo = clasificacion.codigo;
      detalle = clasificacion.mensaje;
      if (clasificacion.tipo !== 'reintentar') {
        return { token, estado: clasificacion.tipo, intentos: intento, codigo, mensaje: detalle };
      }
      reintentarEn = respuesta.headers.get('Retry-After');
    } catch (error) {
      codigo = 'SIN_RESPUESTA';
      detalle = error instanceof Error ? error.message : String(error);
    }
    if (intento < INTENTOS) await esperar(esperaAntesDe(intento, reintentarEn));
  }
  return { token, estado: 'fallido', intentos: INTENTOS, codigo, mensaje: detalle };
}

export async function enviarPush(
  mensaje: MensajePush,
  tokens: string[],
): Promise<ResultadoToken[]> {
  if (tokens.length === 0) return [];
  const cuenta = leerCuenta();
  const acceso = await tokenDeAcceso(cuenta);
  const resultados: ResultadoToken[] = [];
  for (let inicio = 0; inicio < tokens.length; inicio += ENVIOS_SIMULTANEOS) {
    const lote = tokens.slice(inicio, inicio + ENVIOS_SIMULTANEOS);
    resultados.push(
      ...(await Promise.all(lote.map((token) => enviarAToken(cuenta, acceso, token, mensaje)))),
    );
  }
  return resultados;
}
