import { Component, computed, input, signal } from '@angular/core';
import { Conteo } from '../../../../core/models';

/**
 * Barras horizontales de una sola serie (sin librerías).
 * Marcas finas (≤ 18 px) con extremo redondeado, valor al final de la barra en
 * color de texto, tooltip al pasar el mouse y vista de tabla accesible.
 */
@Component({
  selector: 'app-bar-chart',
  template: `
    <figure class="chart" [attr.aria-label]="titulo()">
      <figcaption>
        <span class="titulo">{{ titulo() }}</span>
        @if (subtitulo()) { <span class="sub">{{ subtitulo() }}</span> }
        <button type="button" class="toggle" (click)="tabla.set(!tabla())" [attr.aria-pressed]="tabla()">
          {{ tabla() ? 'Ver gráfico' : 'Ver tabla' }}
        </button>
      </figcaption>
      @if (!tabla()) {
        <div class="filas" role="list">
          @for (d of datos(); track d.clave) {
            <div class="fila" role="listitem" [attr.aria-label]="d.etiqueta + ': ' + d.total" (mouseenter)="hover.set(d.clave)" (mouseleave)="hover.set(null)" [class.atenuada]="hover() && hover() !== d.clave">
              <span class="etq" [title]="d.etiqueta">{{ d.etiqueta }}</span>
              <span class="pista">
                <span class="barra" [style.width.%]="max() ? (d.total / max()) * 100 : 0" [style.background]="color()"></span>
                <span class="valor">{{ d.total }}@if (mostrarPct()) { <small> · {{ pct(d.total) }}%</small> }</span>
              </span>
            </div>
          } @empty {
            <p class="vacio">Sin datos para los filtros seleccionados.</p>
          }
        </div>
      } @else {
        <table class="t">
          <thead><tr><th scope="col">Categoría</th><th scope="col">Total</th><th scope="col">%</th></tr></thead>
          <tbody>
            @for (d of datos(); track d.clave) {
              <tr><td>{{ d.etiqueta }}</td><td>{{ d.total }}</td><td>{{ pct(d.total) }}%</td></tr>
            }
          </tbody>
        </table>
      }
    </figure>
  `,
  styles: `
    .chart { margin: 0; }
    figcaption { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; margin-bottom: 10px; }
    .titulo { font-weight: 700; color: #0b2d6b; }
    .sub { color: #7b8794; font-size: 0.8rem; }
    .toggle { margin-left: auto; border: none; background: none; color: #163f8a; cursor: pointer; font-size: 0.78rem; text-decoration: underline; }
    .filas { display: flex; flex-direction: column; gap: 6px; }
    .fila { display: grid; grid-template-columns: minmax(90px, 38%) 1fr; align-items: center; gap: 8px; transition: opacity .15s; }
    .fila.atenuada { opacity: 0.45; }
    .etq { font-size: 0.8rem; color: #3e4c59; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pista { display: flex; align-items: center; gap: 6px; min-height: 18px; }
    .barra { height: 14px; border-radius: 0 4px 4px 0; min-width: 2px; transition: width .4s; }
    .valor { font-size: 0.8rem; font-weight: 700; color: #1f2933; white-space: nowrap; }
    .valor small { color: #7b8794; font-weight: 500; }
    .vacio { color: #7b8794; font-style: italic; font-size: 0.85rem; }
    .t { width: 100%; border-collapse: collapse; font-size: 0.82rem; }
    .t th, .t td { text-align: left; padding: 4px 6px; border-bottom: 1px solid #e4e7eb; }
  `,
})
export class BarChartComponent {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>('');
  readonly datos = input<Conteo<string>[]>([]);
  readonly color = input<string>('#3a6bc4');
  readonly mostrarPct = input(true);
  protected readonly tabla = signal(false);
  protected readonly hover = signal<string | null>(null);
  protected readonly max = computed(() => Math.max(0, ...this.datos().map((d) => d.total)));
  private readonly suma = computed(() => this.datos().reduce((a, d) => a + d.total, 0));

  pct(n: number): number {
    return this.suma() ? Math.round((n / this.suma()) * 100) : 0;
  }
}
