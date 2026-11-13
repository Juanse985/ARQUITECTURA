import { Injectable, signal } from '@angular/core';
import { FiltroEstadisticas } from '../../../core/models';

/** Filtros compartidos entre el panel, el mapa y el listado de hojas de vida. */
@Injectable({ providedIn: 'root' })
export class AdminFiltroService {
  readonly filtro = signal<FiltroEstadisticas>({ region: null, departamento: null, sedeId: null, tipoVinculacion: null });

  actualizar(cambios: Partial<FiltroEstadisticas>): void {
    this.filtro.update((f) => ({ ...f, ...cambios }));
  }

  limpiar(): void {
    this.filtro.set({ region: null, departamento: null, sedeId: null, tipoVinculacion: null });
  }
}
