import { Component, computed, input, output, signal } from '@angular/core';
import { DEPARTAMENTOS_SVG, MAPA_VIEWBOX, proyectar } from '../../../../core/constants/colombia-mapa';
import { Conteo, EstadisticaSede } from '../../../../core/models';

interface Tooltip {
  x: number;
  y: number;
  titulo: string;
  lineas: string[];
}

/** Rampa secuencial de un solo tono (azul institucional), de claro a oscuro. */
const RAMPA = ['#eef2f9', '#c9d7ee', '#9bb4de', '#6a8ec9', '#3a6bc4', '#163f8a'];

/**
 * Mapa de Colombia (SVG, sin servicios externos) con:
 * - departamentos coloreados por número de hojas de vida (coroplético),
 * - un círculo por sede de UNIMINUTO (tamaño = hojas de vida),
 * - tooltip al pasar el mouse y clic para filtrar por departamento o sede.
 */
@Component({
  selector: 'app-mapa-colombia',
  template: `
    <div class="mapa">
      <svg [attr.viewBox]="'0 0 ' + vb.ancho + ' ' + vb.alto" role="img" aria-label="Mapa de Colombia con las sedes de la institución" (mouseleave)="tip.set(null)">
        <g class="deptos">
          @for (d of deptos; track d.codigo) {
            <path
              [attr.d]="d.d"
              [attr.fill]="colorDepto(d.codigo)"
              [class.sel]="departamento() === d.codigo"
              [class.atenuado]="departamento() && departamento() !== d.codigo"
              tabindex="0"
              role="button"
              [attr.aria-label]="d.nombre + ': ' + totalDepto(d.codigo) + ' hojas de vida'"
              (mousemove)="mostrar($event, d.nombre, [totalDepto(d.codigo) + ' hojas de vida'])"
              (click)="departamentoClic.emit(departamento() === d.codigo ? null : d.codigo)"
              (keydown.enter)="departamentoClic.emit(departamento() === d.codigo ? null : d.codigo)"
            />
          }
        </g>
        <g class="sedes">
          @for (s of puntos(); track s.sedeId) {
            <circle
              [attr.cx]="s.x" [attr.cy]="s.y" [attr.r]="s.r"
              [class.sel]="sedeId() === s.sedeId"
              tabindex="0"
              role="button"
              [attr.aria-label]="'Sede ' + s.nombre + ': ' + s.totalHv + ' hojas de vida'"
              (mousemove)="mostrar($event, 'Sede ' + s.nombre, [s.totalHv + ' hojas de vida', s.docentes + ' docentes (' + s.docentesAlineados + ' alineados)', s.estudiantes + ' estudiantes'])"
              (click)="sedeClic.emit(sedeId() === s.sedeId ? null : s.sedeId); $event.stopPropagation()"
              (keydown.enter)="sedeClic.emit(sedeId() === s.sedeId ? null : s.sedeId)"
            />
          }
        </g>
      </svg>
      @if (tip(); as t) {
        <div class="tip" [style.left.px]="t.x" [style.top.px]="t.y" role="tooltip">
          <b>{{ t.titulo }}</b>
          @for (l of t.lineas; track l) { <span>{{ l }}</span> }
        </div>
      }
      <div class="leyenda" aria-hidden="true">
        <span>Hojas de vida por departamento</span>
        <div class="rampa">
          @for (c of rampa; track c) { <i [style.background]="c"></i> }
        </div>
        <div class="rango"><small>0</small><small>{{ maxDepto() }}</small></div>
        <span class="punto"><i></i> Sede (tamaño = hojas de vida)</span>
      </div>
      @if (virtual(); as v) {
        <p class="virtual">+ {{ v.nombre }}: <b>{{ v.totalHv }}</b> hojas de vida (sin ubicación en el mapa)</p>
      }
    </div>
  `,
  styles: `
    .mapa { position: relative; }
    svg { width: 100%; height: auto; max-height: 640px; display: block; }
    .deptos path { stroke: #ffffff; stroke-width: 1; cursor: pointer; transition: opacity .15s; outline: none; }
    .deptos path:hover, .deptos path:focus-visible { stroke: #061a40; stroke-width: 1.5; }
    .deptos path.sel { stroke: #061a40; stroke-width: 2; }
    .deptos path.atenuado { opacity: 0.5; }
    .sedes circle { fill: #b07800; fill-opacity: 0.88; stroke: #ffffff; stroke-width: 2; cursor: pointer; outline: none; }
    .sedes circle:hover, .sedes circle:focus-visible, .sedes circle.sel { fill: #f2b705; stroke: #061a40; }
    .tip { position: absolute; transform: translate(12px, -50%); background: #061a40; color: #fff; padding: 8px 10px; border-radius: 8px;
      font-size: 0.78rem; display: flex; flex-direction: column; gap: 2px; pointer-events: none; z-index: 5; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,.2); }
    .leyenda { position: absolute; left: 8px; bottom: 8px; background: rgba(255,255,255,.92); border-radius: 8px; padding: 8px 10px; font-size: 0.72rem; color: #3e4c59; }
    .rampa { display: flex; margin: 4px 0 2px; } .rampa i { width: 22px; height: 10px; }
    .rango { display: flex; justify-content: space-between; }
    .punto { display: flex; align-items: center; gap: 6px; margin-top: 6px; }
    .punto i { width: 12px; height: 12px; border-radius: 50%; background: #b07800; border: 2px solid #fff; box-shadow: 0 0 0 1px #cbd2d9; }
    .virtual { margin: 6px 0 0; font-size: 0.82rem; color: #3e4c59; }
    @media (max-width: 700px) { .leyenda { position: static; margin-top: 8px; display: inline-block; } }
  `,
})
export class MapaColombiaComponent {
  readonly sedes = input<EstadisticaSede[]>([]);
  readonly porDepartamento = input<Conteo[]>([]);
  readonly departamento = input<string | null>(null);
  readonly sedeId = input<string | null>(null);
  readonly departamentoClic = output<string | null>();
  readonly sedeClic = output<string | null>();

  protected readonly vb = MAPA_VIEWBOX;
  protected readonly deptos = DEPARTAMENTOS_SVG;
  protected readonly rampa = RAMPA;
  protected readonly tip = signal<Tooltip | null>(null);

  private readonly mapaDeptos = computed(() => new Map(this.porDepartamento().map((d) => [d.clave, d.total])));
  protected readonly maxDepto = computed(() => Math.max(0, ...this.porDepartamento().map((d) => d.total)));

  protected readonly puntos = computed(() => {
    const max = Math.max(1, ...this.sedes().map((s) => s.totalHv));
    return this.sedes()
      .filter((s) => s.lat !== null && s.lng !== null)
      .map((s) => ({ ...s, ...proyectar(s.lng!, s.lat!), r: 4 + Math.sqrt(s.totalHv / max) * 12 }))
      .sort((a, b) => b.r - a.r); // los pequeños quedan encima
  });

  protected readonly virtual = computed(() => this.sedes().find((s) => s.lat === null && s.totalHv > 0) ?? null);

  totalDepto(codigo: string): number {
    return this.mapaDeptos().get(codigo) ?? 0;
  }

  colorDepto(codigo: string): string {
    const n = this.totalDepto(codigo);
    if (!n) return '#f5f7fa';
    const i = Math.min(RAMPA.length - 1, 1 + Math.floor((n / Math.max(1, this.maxDepto())) * (RAMPA.length - 2) + 0.5));
    return RAMPA[i];
  }

  mostrar(e: MouseEvent, titulo: string, lineas: string[]): void {
    const cont = (e.currentTarget as Element).closest('.mapa')!.getBoundingClientRect();
    this.tip.set({ x: e.clientX - cont.left, y: e.clientY - cont.top, titulo, lineas });
  }
}
