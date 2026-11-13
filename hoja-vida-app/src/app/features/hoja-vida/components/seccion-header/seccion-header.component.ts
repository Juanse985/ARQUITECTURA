import { Component, input } from '@angular/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';

/** Encabezado numerado de cada sección del formato con indicador de completitud. */
@Component({
  selector: 'app-seccion-header',
  imports: [MatProgressBarModule],
  template: `
    <div class="cab">
      <span class="num" aria-hidden="true">{{ numero() }}</span>
      <div class="txt">
        <h2>{{ titulo() }}</h2>
        @if (descripcion()) {
          <p>{{ descripcion() }}</p>
        }
      </div>
      @if (porcentaje() !== null) {
        <div class="avance">
          <span>{{ porcentaje() }}% completo</span>
          <mat-progress-bar mode="determinate" [value]="porcentaje()" [attr.aria-label]="'Completitud de ' + titulo()" />
        </div>
      }
    </div>
  `,
  styles: `
    .cab { display: flex; align-items: center; gap: 14px; margin: 4px 0 16px; flex-wrap: wrap; }
    .num { width: 38px; height: 38px; border-radius: 10px; background: #0b2d6b; color: #f2b705;
      display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 1.1rem; }
    .txt { flex: 1; min-width: 200px; }
    h2 { margin: 0; color: #0b2d6b; font-size: 1.15rem; text-transform: uppercase; letter-spacing: 0.5px; }
    p { margin: 2px 0 0; color: #3e4c59; font-size: 0.88rem; }
    .avance { width: 180px; font-size: 0.78rem; color: #3e4c59; display: flex; flex-direction: column; gap: 4px; }
  `,
})
export class SeccionHeaderComponent {
  readonly numero = input.required<number | string>();
  readonly titulo = input.required<string>();
  readonly descripcion = input<string>('');
  readonly porcentaje = input<number | null>(null);
}
