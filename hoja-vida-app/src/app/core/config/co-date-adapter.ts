import { Injectable } from '@angular/core';
import { MatDateFormats, NativeDateAdapter } from '@angular/material/core';

/**
 * Adaptador de fechas con formato colombiano dd/mm/aaaa.
 * El NativeDateAdapter de Material interpreta el texto con Date.parse (formato
 * de EE. UU.), por eso se sobrescriben parse() y format().
 */
@Injectable()
export class CoDateAdapter extends NativeDateAdapter {
  override parse(value: unknown): Date | null {
    if (typeof value === 'string') {
      const m = /^\s*(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})\s*$/.exec(value);
      if (m) {
        const d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
        // Rechaza fechas imposibles como 31/02/2024
        return d.getDate() === Number(m[1]) ? d : this.invalid();
      }
      return value.trim() ? this.invalid() : null;
    }
    return super.parse(value);
  }

  override format(date: Date, displayFormat: object): string {
    if ((displayFormat as { dateInput?: boolean }).dateInput) {
      return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }
    return super.format(date, displayFormat);
  }

  override getFirstDayOfWeek(): number {
    return 1; // lunes
  }
}

export const CO_DATE_FORMATS: MatDateFormats = {
  parse: { dateInput: { dateInput: true } },
  display: {
    dateInput: { dateInput: true },
    monthYearLabel: { year: 'numeric', month: 'short' },
    dateA11yLabel: { year: 'numeric', month: 'long', day: 'numeric' },
    monthYearA11yLabel: { year: 'numeric', month: 'long' },
  },
};
