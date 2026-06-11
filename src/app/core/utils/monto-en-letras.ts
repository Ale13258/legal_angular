/** Formato legal colombiano: $16.992.473,oo */
export function formatMontoLegalColombiano(amount: number): string {
  const n = Math.round(Math.max(0, Number(amount) || 0));
  const withDots = n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$${withDots},oo`;
}

const UNIDADES = [
  '',
  'UN',
  'DOS',
  'TRES',
  'CUATRO',
  'CINCO',
  'SEIS',
  'SIETE',
  'OCHO',
  'NUEVE',
];

const ESPECIALES = [
  'DIEZ',
  'ONCE',
  'DOCE',
  'TRECE',
  'CATORCE',
  'QUINCE',
  'DIECISEIS',
  'DIECISIETE',
  'DIECIOCHO',
  'DIECINUEVE',
];

const DECENAS = [
  '',
  '',
  'VEINTE',
  'TREINTA',
  'CUARENTA',
  'CINCUENTA',
  'SESENTA',
  'SETENTA',
  'OCHENTA',
  'NOVENTA',
];

const CENTENAS = [
  '',
  'CIENTO',
  'DOSCIENTOS',
  'TRESCIENTOS',
  'CUATROCIENTOS',
  'QUINIENTOS',
  'SEISCIENTOS',
  'SETECIENTOS',
  'OCHOCIENTOS',
  'NOVECIENTOS',
];

function convertLessThanThousand(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  const c = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];

  if (c > 0) parts.push(CENTENAS[c]!);

  if (rest > 0) {
    if (rest < 10) {
      parts.push(UNIDADES[rest]!);
    } else if (rest < 20) {
      parts.push(ESPECIALES[rest - 10]!);
    } else {
      const d = Math.floor(rest / 10);
      const u = rest % 10;
      if (d === 2 && u > 0) {
        parts.push(`VEINTI${UNIDADES[u]!.toLowerCase()}`.toUpperCase());
      } else {
        parts.push(u > 0 ? `${DECENAS[d]!} Y ${UNIDADES[u]!}` : DECENAS[d]!);
      }
    }
  }

  return parts.join(' ').trim();
}

function convertInteger(n: number): string {
  if (n === 0) return 'CERO';

  const millones = Math.floor(n / 1_000_000);
  const restMillones = n % 1_000_000;
  const miles = Math.floor(restMillones / 1_000);
  const rest = restMillones % 1_000;
  const parts: string[] = [];

  if (millones > 0) {
    const millonesText =
      millones === 1 ? 'UN MILLON' : `${convertLessThanThousand(millones)} MILLONES`;
    parts.push(millonesText);
  }

  if (miles > 0) {
    parts.push(miles === 1 ? 'MIL' : `${convertLessThanThousand(miles)} MIL`);
  }

  if (rest > 0) {
    parts.push(convertLessThanThousand(rest));
  }

  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

/** Monto en letras para documentos legales (sin tildes, mayúsculas). */
export function montoEnLetrasPesos(amount: number): string {
  const n = Math.round(Math.max(0, Number(amount) || 0));
  return `${convertInteger(n)} PESOS MONEDA CORRIENTE`;
}
