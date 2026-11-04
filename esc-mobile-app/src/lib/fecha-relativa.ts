const MINUTO_MS = 60_000;
const HORA_MS = 60 * MINUTO_MS;
const DIA_MS = 24 * HORA_MS;
const SEMANA_MS = 7 * DIA_MS;

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

export function fechaRelativa(fechaIso: string, ahora = Date.now()) {
  const fecha = new Date(fechaIso);
  const diferencia = Math.max(0, ahora - fecha.getTime());

  if (diferencia < MINUTO_MS) return 'ahora';
  if (diferencia < HORA_MS) return `${Math.floor(diferencia / MINUTO_MS)} min`;
  if (diferencia < DIA_MS) return `${Math.floor(diferencia / HORA_MS)} h`;
  if (diferencia < SEMANA_MS) return `${Math.floor(diferencia / DIA_MS)} d`;

  const dia = fecha.getDate();
  const mes = MESES[fecha.getMonth()];
  const mismoAnio = fecha.getFullYear() === new Date(ahora).getFullYear();
  return mismoAnio ? `${dia} ${mes}` : `${dia} ${mes} ${fecha.getFullYear()}`;
}

export function fechaCompleta(fechaIso: string) {
  const fecha = new Date(fechaIso);
  const hora = fecha.getHours();
  const minutos = String(fecha.getMinutes()).padStart(2, '0');
  const sufijo = hora < 12 ? 'a. m.' : 'p. m.';
  const hora12 = hora % 12 === 0 ? 12 : hora % 12;
  return `${fecha.getDate()} ${MESES[fecha.getMonth()]} ${fecha.getFullYear()}, ${hora12}:${minutos} ${sufijo}`;
}
