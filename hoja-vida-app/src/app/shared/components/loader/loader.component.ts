import { Component, inject } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { LoadingService } from '../../../core/services/loading.service';

/** Spinner global que se muestra mientras hay peticiones HTTP en curso. */
@Component({
  selector: 'app-loader',
  imports: [MatProgressSpinnerModule],
  template: `
    @if (loading.cargando()) {
      <div class="overlay" role="status" aria-live="polite">
        <mat-spinner diameter="56" strokeWidth="5"></mat-spinner>
        <span class="sr-only">Cargando...</span>
      </div>
    }
  `,
  styles: `
    .overlay {
      position: fixed; inset: 0; z-index: 2000;
      display: flex; align-items: center; justify-content: center;
      background: rgba(243, 246, 251, 0.55);
      backdrop-filter: blur(1px);
    }
  `,
})
export class LoaderComponent {
  protected readonly loading = inject(LoadingService);
}
