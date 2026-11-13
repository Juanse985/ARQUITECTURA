import { Component, inject, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { hoy } from '../../../../core/utils/date-utils';
import { FieldErrorComponent } from '../../../../shared/components/field-error/field-error.component';
import { SignaturePadComponent } from '../../../../shared/components/signature-pad/signature-pad.component';
import { ErrorMessagePipe } from '../../../../shared/pipes/error-message.pipe';
import { SeccionHeaderComponent } from '../../components/seccion-header/seccion-header.component';
import { DeclaracionForm } from '../../services/hoja-vida-form.factory';

/** Paso 5 – FIRMA DEL SERVIDOR PÚBLICO O CONTRATISTA (declaración bajo juramento). */
@Component({
  selector: 'app-paso5-declaracion',
  imports: [
    ReactiveFormsModule, MatRadioModule, MatCheckboxModule, MatFormFieldModule, MatInputModule, MatDatepickerModule,
    MatIconModule, ErrorMessagePipe, FieldErrorComponent, SignaturePadComponent, SeccionHeaderComponent,
  ],
  template: `
    @let f = form();
    <app-seccion-header numero="5" titulo="Firma del servidor público o contratista" [porcentaje]="porcentaje()" />

    <div [formGroup]="f">
      <div class="juramento">
        <p><b>Manifiesto bajo la gravedad del juramento que:</b></p>
        <mat-radio-group formControlName="inhabilidad" class="radio-group-row" aria-labelledby="txt-inhab">
          @for (o of catalogos.opcionesInhabilidad; track o.valor) {
            <mat-radio-button [value]="o.valor">{{ o.etiqueta }}</mat-radio-button>
          }
        </mat-radio-group>
        <p id="txt-inhab" class="texto">{{ catalogos.textos.inhabilidad }} *</p>
        <app-field-error [control]="f.controls.inhabilidad" />
        @if (f.controls.inhabilidad.value === 'SI') {
          <p class="advertencia" role="status">
            <mat-icon>info</mat-icon> Indicó que SÍ se encuentra dentro de causales de inhabilidad o incompatibilidad.
          </p>
        }
      </div>

      <mat-checkbox formControlName="certificaVeracidad" class="check">{{ catalogos.textos.certificacion }} *</mat-checkbox>
      <app-field-error [control]="f.controls.certificaVeracidad" />

      <div class="form-grid">
        <mat-form-field class="col-6">
          <mat-label>Ciudad de diligenciamiento</mat-label>
          <input matInput formControlName="ciudadDiligenciamiento" required />
          <mat-error>{{ f.controls.ciudadDiligenciamiento.errors | errorMsg }}</mat-error>
        </mat-form-field>
        <mat-form-field class="col-6">
          <mat-label>Fecha de diligenciamiento</mat-label>
          <input matInput [matDatepicker]="pDil" formControlName="fechaDiligenciamiento" placeholder="dd/mm/aaaa" [max]="maxFecha" required />
          <mat-datepicker-toggle matIconSuffix [for]="pDil" />
          <mat-datepicker #pDil />
          <mat-hint>dd/mm/aaaa</mat-hint>
          <mat-error>{{ f.controls.fechaDiligenciamiento.errors | errorMsg }}</mat-error>
        </mat-form-field>
      </div>

      <h3 class="section-title">Firma (opcional)</h3>
      <app-signature-pad formControlName="firmaUrl" />

      <h3 class="section-title">Tratamiento de datos personales</h3>
      <mat-checkbox formControlName="autorizaTratamientoDatos" class="check">{{ catalogos.textos.tratamientoDatos }} *</mat-checkbox>
      <app-field-error [control]="f.controls.autorizaTratamientoDatos" />
    </div>
  `,
  styles: `
    .juramento { background: #f3f6fb; border: 1px solid #cbd2d9; border-radius: 12px; padding: 12px 16px; margin-bottom: 16px; }
    .texto { margin: 0; color: #1f2933; text-align: justify; }
    .advertencia { display: flex; gap: 6px; align-items: center; color: #7a5a00; background: #fdf3d1; padding: 8px 10px; border-radius: 8px; }
    .check { display: block; margin: 8px 0; }
    ::ng-deep .check label { white-space: normal; line-height: 1.4; }
  `,
})
export class Paso5DeclaracionComponent {
  readonly form = input.required<DeclaracionForm>();
  readonly porcentaje = input<number | null>(null);
  protected readonly catalogos = inject(CatalogosService);
  protected readonly maxFecha = hoy();
}
