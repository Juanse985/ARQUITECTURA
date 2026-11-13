import { Injectable, computed, signal } from '@angular/core';

/** Contador de peticiones HTTP en curso para mostrar el spinner global. */
@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly pendientes = signal(0);
  readonly cargando = computed(() => this.pendientes() > 0);

  iniciar(): void {
    this.pendientes.update((n) => n + 1);
  }

  finalizar(): void {
    this.pendientes.update((n) => Math.max(0, n - 1));
  }
}
