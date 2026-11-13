import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Título de página con ícono y subtítulo. */
@Component({
  selector: 'app-page-title',
  imports: [MatIconModule],
  template: `
    <header class="page-title">
      @if (icono()) {
        <span class="icono" aria-hidden="true"><mat-icon>{{ icono() }}</mat-icon></span>
      }
      <div class="textos">
        <h1>{{ titulo() }}</h1>
        @if (subtitulo()) {
          <p>{{ subtitulo() }}</p>
        }
      </div>
      <div class="acciones"><ng-content /></div>
    </header>
  `,
  styles: `
    .page-title { display: flex; align-items: center; gap: 16px; margin: 4px 0 20px; flex-wrap: wrap; }
    .icono { width: 48px; height: 48px; border-radius: 12px; background: #0b2d6b; color: #f2b705;
      display: flex; align-items: center; justify-content: center; }
    .textos { flex: 1; min-width: 200px; }
    h1 { margin: 0; font-size: 1.5rem; color: #0b2d6b; font-weight: 700; }
    p { margin: 2px 0 0; color: #3e4c59; }
    .acciones { display: flex; gap: 8px; flex-wrap: wrap; }
  `,
})
export class PageTitleComponent {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>('');
  readonly icono = input<string>('');
}
