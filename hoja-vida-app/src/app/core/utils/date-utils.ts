/** Utilidades de fecha. El modelo guarda fechas ISO 'yyyy-MM-dd'; los formularios usan Date. */

export function toIsoDate(fecha: Date | string | null | undefined): string | null {
  if (!fecha) return null;
  const d = typeof fecha === 'string' ? parseIsoDate(fecha) : fecha;
  if (!d || isNaN(d.getTime())) return null;
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Interpreta 'yyyy-MM-dd' como fecha local (evita el desfase de zona horaria). */
export function parseIsoDate(valor: string | null | undefined): Date | null {
  if (!valor) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Formatea a dd/mm/aaaa (formato colombiano). */
export function formatoColombiano(valor: Date | string | null | undefined): string {
  const d = typeof valor === 'string' ? parseIsoDate(valor) : valor;
  if (!d) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function hoy(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Diferencia en meses completos entre dos fechas (inclusive del mes de inicio). */
export function mesesEntre(inicio: Date, fin: Date): number {
  if (fin < inicio) return 0;
  let meses = (fin.getFullYear() - inicio.getFullYear()) * 12 + (fin.getMonth() - inicio.getMonth());
  if (fin.getDate() >= inicio.getDate()) {
    // mes completo cumplido
  } else {
    meses -= 1;
  }
  return Math.max(0, meses);
}

/** Diferencia en días entre dos fechas. */
export function diasEntre(inicio: Date, fin: Date): number {
  const MS_DIA = 24 * 60 * 60 * 1000;
  return Math.round((fin.getTime() - inicio.getTime()) / MS_DIA);
}

export function edad(fechaNacimiento: Date, referencia: Date = hoy()): number {
  let e = referencia.getFullYear() - fechaNacimiento.getFullYear();
  const m = referencia.getMonth() - fechaNacimiento.getMonth();
  if (m < 0 || (m === 0 && referencia.getDate() < fechaNacimiento.getDate())) e--;
  return e;
}
