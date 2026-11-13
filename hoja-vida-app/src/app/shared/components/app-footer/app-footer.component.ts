import { Component, inject } from '@angular/core';
import { InstitucionService } from '../../../core/services/institucion.service';
import { LogoPlaceholderComponent } from '../logo-placeholder/logo-placeholder.component';
import { environment } from '../../../../environments/environment';

/** Pie de página institucional. */
@Component({
  selector: 'app-footer',
  imports: [LogoPlaceholderComponent],
  template: `
    <footer class="app-footer" role="contentinfo">
      <div class="franja"></div>
      <div class="contenido">
        <app-logo-placeholder variante="completo" />
        <div class="texto">
          <strong>{{ app.appName }}</strong> · {{ app.appFullName }}<br />
          <small>{{ inst.nombre() }} ({{ inst.sigla() }}) · Proyecto académico · Ingeniería de Sistemas</small>
        </div>
        <div class="legal">
          <small>Formato Único de Hoja de Vida – Persona Natural (Leyes 190 de 1995, 489 y 443 de 1998)</small><br />
          <small>Tratamiento de datos personales según la Ley 1581 de 2012 · © {{ anio }}</small>
        </div>
      </div>
    </footer>
  `,
  styles: `
    .app-footer { background: #162645; color: #dfe6f3; margin-top: 32px; }
    .franja { height: 4px; background: linear-gradient(90deg, #f2b705, #f8d466); }
    .contenido { max-width: 1200px; margin: 0 auto; padding: 18px 24px; display: flex; gap: 16px;
      justify-content: space-between; align-items: center; flex-wrap: wrap; font-size: 0.85rem; line-height: 1.5; }
    strong { color: #f2b705; }
    .texto { flex: 1; min-width: 220px; }
    .legal { text-align: right; }
    @media (max-width: 600px) { .legal { text-align: left; } }
  `,
})
export class AppFooterComponent {
  protected readonly app = environment;
  protected readonly inst = inject(InstitucionService);
  protected readonly anio = new Date().getFullYear();
}
