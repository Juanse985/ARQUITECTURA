import { Injectable, signal } from '@angular/core';
import { HojaVidaParcial } from './gemini.service';

export interface ImportacionPendiente {
  parcial: HojaVidaParcial | null;
  archivo: File;
  modo: 'vacios' | 'sobrescribir';
  conIa: boolean;
}

/** Guarda en memoria la hoja de vida importada mientras el usuario pasa al formulario para revisarla. */
@Injectable({ providedIn: 'root' })
export class ImportacionService {
  private readonly _pendiente = signal<ImportacionPendiente | null>(null);
  readonly pendiente = this._pendiente.asReadonly();

  establecer(p: ImportacionPendiente): void {
    this._pendiente.set(p);
  }

  tomar(): ImportacionPendiente | null {
    const p = this._pendiente();
    this._pendiente.set(null);
    return p;
  }
}
