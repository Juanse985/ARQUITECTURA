import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { HojaVida } from '../../../../core/models';
import { CompletitudSeccion } from '../../../../core/utils/completitud';
import { FormatoOficialViewComponent } from '../../components/formato-oficial-view/formato-oficial-view.component';
import { SeccionHeaderComponent } from '../../components/seccion-header/seccion-header.component';

/** Paso 7 – RESUMEN Y VISTA PREVIA del formato oficial antes de guardar. */
@Component({
  selector: 'app-paso7-resumen',
  imports: [MatButtonModule, MatIconModule, MatProgressBarModule, FormatoOficialViewComponent, SeccionHeaderComponent],
  template: `
    <app-seccion-header numero="7" titulo="Resumen y vista previa" descripcion="Revise la información tal como se verá en el formato oficial." />

    <div class="resumen no-print">
      @for (s of completitud(); track s.seccion) {
        <button type="button" class="sec" (click)="irAPaso.emit(s.paso)" [attr.aria-label]="'Ir a ' + s.titulo + ', ' + s.porcentaje + '% completo'">
          <span class="t">{{ s.numero }}. {{ s.titulo }}</span>
          <mat-progress-bar mode="determinate" [value]="s.porcentaje" />
          <span class="p" [class.ok]="s.porcentaje === 100">
            <mat-icon>{{ s.porcentaje === 100 ? 'check_circle' : 'pending' }}</mat-icon>{{ s.porcentaje }}%
          </span>
        </button>
      }
    </div>

    @if (invalidas().length) {
      <div class="alerta no-print" role="alert">
        <mat-icon>error_outline</mat-icon>
        <span>Hay campos obligatorios sin diligenciar en: <b>{{ invalidas().join(', ') }}</b>. Puede guardar como borrador.</span>
      </div>
    }

    <div class="acciones no-print">
      <button mat-stroked-button type="button" (click)="imprimir.emit()"><mat-icon>print</mat-icon> Imprimir vista previa</button>
      <button mat-flat-button type="button" (click)="guardar.emit()"><mat-icon>save</mat-icon> Guardar hoja de vida</button>
    </div>

    <div class="preview">
      @if (vistaPrevia(); as hv) {
        <app-formato-oficial-view [hv]="hv" />
      }
    </div>
  `,
  styles: `
    .resumen { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin-bottom: 14px; }
    .sec { all: unset; cursor: pointer; display: flex; flex-direction: column; gap: 6px; padding: 10px 12px;
      border: 1px solid #cbd2d9; border-radius: 10px; background: #fff; }
    .sec:hover, .sec:focus-visible { border-color: #0b2d6b; box-shadow: 0 2px 8px rgba(6,26,64,.1); }
    .t { font-weight: 600; color: #0b2d6b; font-size: .88rem; }
    .p { display: flex; align-items: center; gap: 4px; font-size: .8rem; color: #d99e00; font-weight: 700; }
    .p.ok { color: #2e7d32; }
    .p mat-icon { font-size: 16px; width: 16px; height: 16px; }
    .alerta { display: flex; gap: 8px; align-items: center; padding: 10px 14px; border-radius: 10px; background: #fdecea; color: #c62828; margin-bottom: 12px; }
    .acciones { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; margin-bottom: 16px; }
    .preview { background: #dfe6f0; padding: 20px 8px; border-radius: 12px; overflow-x: auto; }
    @media print { .preview { background: none; padding: 0; } }
  `,
})
export class Paso7ResumenComponent {
  readonly vistaPrevia = input<HojaVida | null>(null);
  readonly completitud = input<CompletitudSeccion[]>([]);
  readonly invalidas = input<string[]>([]);
  readonly guardar = output<void>();
  readonly imprimir = output<void>();
  readonly irAPaso = output<number>();
}
