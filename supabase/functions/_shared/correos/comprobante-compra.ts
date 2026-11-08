import {
  boton,
  COLORES,
  type Correo,
  encabezado,
  escapar,
  formatoFecha,
  formatoPesos,
  fuente,
  parrafo,
  plantillaBase,
  subtitulo,
  textoPlano,
  URL_APP,
} from './base.ts';

export interface ArticuloComprado {
  tipo: string;
  nombre: string;
  detalle?: string | null;
  cantidad: number;
  precioUnitarioCentavos: number;
  imagenUrl?: string | null;
}

export interface DireccionEnvio {
  nombre: string;
  direccion: string;
  ciudad: string;
  departamento: string;
  telefono: string;
}

export interface DatosComprobanteCompra {
  nombre: string;
  pedidoId: string;
  numeroPedido: string;
  fecha: Date | string;
  metodoPago: string;
  articulos: ArticuloComprado[];
  subtotalCentavos: number;
  envioCentavos: number;
  totalCentavos: number;
  envio: DireccionEnvio;
}

const PIE = [
  'Recibes este correo porque realizaste una compra en la tienda de la app de la Escuela de los Sagrados Corazones. Guarda este mensaje como soporte de tu compra.',
];
const AYUDA = '¿Tienes dudas sobre tu pedido?';
const MENSAJE =
  'Recibimos tu pedido y ya lo estamos preparando. Este es el comprobante de tu compra en la tienda.';
const ETIQUETA = 'font-weight:700;letter-spacing:2px;text-transform:uppercase;';

function cajaPedido(numero: string, fecha: string, pago: string): string {
  const celda = (etiqueta: string, valor: string) => `<td valign="top" style="padding:18px 20px;">
        <p style="margin:0;${fuente(14, COLORES.azulOscuro)}">${escapar(etiqueta)}</p>
        <p style="margin:4px 0 0;${fuente(15, COLORES.carbon, 'font-weight:700;')}">${escapar(valor)}</p>
      </td>`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0 0;background:${COLORES.azulClaro};border-radius:14px;">
  <tr>
    ${celda('Pedido', `N.º ${numero}`)}
    ${celda('Fecha', fecha)}
    ${celda('Pago', pago)}
  </tr>
</table>`;
}

function imagenArticulo(url?: string | null): string {
  if (url) {
    return `<img src="${escapar(url)}" width="68" height="88" alt="" style="display:block;border:0;width:68px;height:88px;border-radius:8px;object-fit:cover;" />`;
  }
  return `<table role="presentation" width="68" cellspacing="0" cellpadding="0">
  <tr><td style="width:68px;height:88px;background:${COLORES.azulClaro};border-radius:8px;">&nbsp;</td></tr>
</table>`;
}

function filaArticulo(articulo: ArticuloComprado): string {
  const borde = `border-bottom:1px solid ${COLORES.borde};`;
  const detalle = articulo.detalle
    ? `<p style="margin:4px 0 0;${fuente(14, COLORES.gris)}">${escapar(articulo.detalle)}</p>`
    : '';
  const precio = formatoPesos(articulo.precioUnitarioCentavos * articulo.cantidad);
  return `<tr>
    <td width="68" valign="top" style="padding:18px 16px 18px 0;${borde}">${imagenArticulo(articulo.imagenUrl)}</td>
    <td valign="top" style="padding:18px 0;${borde}">
      <p style="margin:0;${fuente(12, COLORES.rojoOscuro, 'font-weight:700;')}">${escapar(articulo.tipo)}</p>
      <p style="margin:2px 0 0;${fuente(17, COLORES.carbon, 'font-weight:700;')}">${escapar(articulo.nombre)}</p>
      ${detalle}
      <p style="margin:4px 0 0;${fuente(14, COLORES.gris)}">Cantidad: ${escapar(articulo.cantidad)}</p>
    </td>
    <td valign="top" align="right" style="padding:18px 0 18px 12px;white-space:nowrap;${borde}${fuente(16, COLORES.carbon, 'font-weight:700;')}">${escapar(precio)}</td>
  </tr>`;
}

function totales(subtotal: number, envio: number, total: number): string {
  const fila = (etiqueta: string, valor: number) => `<tr>
    <td style="padding:6px 0;${fuente(15, COLORES.gris)}">${escapar(etiqueta)}</td>
    <td align="right" style="padding:6px 0;${fuente(15, COLORES.carbon)}">${escapar(formatoPesos(valor))}</td>
  </tr>`;
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:14px 0 0;">
  ${fila('Subtotal', subtotal)}
  ${fila('Envío', envio)}
  <tr>
    <td style="padding:14px 0 0;${fuente(18, COLORES.carbon, 'font-weight:700;')}">Total pagado</td>
    <td align="right" style="padding:14px 0 0;${fuente(18, COLORES.rojo, 'font-weight:700;')}">${escapar(formatoPesos(total))}</td>
  </tr>
</table>`;
}

function cajaDireccion(envio: DireccionEnvio): string {
  const lineas = [
    envio.nombre,
    envio.direccion,
    `${envio.ciudad}, ${envio.departamento} · ${envio.telefono}`,
  ]
    .map((linea) => escapar(linea))
    .join('<br />');
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:28px 0 0;">
  <tr>
    <td style="border:1px solid ${COLORES.borde};border-radius:14px;padding:20px 22px;">
      <p style="margin:0 0 8px;${fuente(13, COLORES.gris, ETIQUETA)}">Dirección de envío</p>
      <p style="margin:0;${fuente(16, COLORES.carbon)}">${lineas}</p>
    </td>
  </tr>
</table>`;
}

export function comprobanteCompra(datos: DatosComprobanteCompra): Correo {
  const fecha = formatoFecha(datos.fecha);
  const enlace = `${URL_APP}pedidos/${encodeURIComponent(datos.pedidoId)}`;
  const asunto = `Confirmamos tu compra · Pedido N.º ${datos.numeroPedido}`;

  const html = plantillaBase({
    titulo: asunto,
    vistaPrevia: 'Gracias por tu compra en la tienda. Te avisaremos cuando tu pedido vaya en camino.',
    contenido: [
      encabezado('Pago aprobado', `¡Gracias por tu compra, ${datos.nombre}!`),
      parrafo(MENSAJE),
      cajaPedido(datos.numeroPedido, fecha, datos.metodoPago),
      subtitulo('Resumen del pedido'),
      `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:12px 0 0;border-collapse:collapse;border-top:1px solid ${COLORES.borde};">${datos.articulos.map(filaArticulo).join('')}</table>`,
      totales(datos.subtotalCentavos, datos.envioCentavos, datos.totalCentavos),
      cajaDireccion(datos.envio),
      boton('Ver mi pedido', enlace),
    ].join(''),
    pie: PIE,
    ayuda: AYUDA,
  });

  const texto = textoPlano(
    [
      `¡Gracias por tu compra, ${datos.nombre}!`,
      '',
      MENSAJE,
      '',
      `Pedido: N.º ${datos.numeroPedido}`,
      `Fecha: ${fecha}`,
      `Pago: ${datos.metodoPago}`,
      '',
      'Resumen del pedido',
      ...datos.articulos.map(
        (articulo) =>
          `- ${articulo.tipo}: ${articulo.nombre} x${articulo.cantidad} · ${formatoPesos(articulo.precioUnitarioCentavos * articulo.cantidad)}`,
      ),
      '',
      `Subtotal: ${formatoPesos(datos.subtotalCentavos)}`,
      `Envío: ${formatoPesos(datos.envioCentavos)}`,
      `Total pagado: ${formatoPesos(datos.totalCentavos)}`,
      '',
      'Dirección de envío',
      datos.envio.nombre,
      datos.envio.direccion,
      `${datos.envio.ciudad}, ${datos.envio.departamento} · ${datos.envio.telefono}`,
      '',
      `Ver mi pedido: ${enlace}`,
    ],
    PIE,
    AYUDA,
  );

  return { asunto, html, texto };
}
