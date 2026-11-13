import { Component, OnInit, computed, inject, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { InstitucionService } from '../../../../core/services/institucion.service';
import { FieldErrorComponent } from '../../../../shared/components/field-error/field-error.component';
import { ErrorMessagePipe } from '../../../../shared/pipes/error-message.pipe';
import { InstitucionalForm } from '../../services/hoja-vida-form.factory';

/**
 * Vinculación con la institución (no hace parte del Formato Único).
 * Permite a UNIMINUTO saber qué tipo de profesionales tiene, en qué sede y programa.
 */
@Component({
  selector: 'app-institucional-fields',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatRadioModule, MatInputModule, MatIconModule, ErrorMessagePipe, FieldErrorComponent],
  template: `
    @let f = form();
    <section class="inst" [formGroup]="f" aria-labelledby="tit-inst">
      <h3 id="tit-inst" class="section-title"><mat-icon>school</mat-icon> Vinculación con {{ inst.sigla() }}</h3>
      <p class="ayuda">Esta información no aparece en el Formato Único; la usa la institución para sus estadísticas.</p>
      <span class="radio-label" id="lbl-vinc">Tipo de vinculación *</span>
      <mat-radio-group formControlName="tipoVinculacion" class="radio-group-row" aria-labelledby="lbl-vinc">
        @for (t of inst.tiposVinculacion; track t.valor) {
          <mat-radio-button [value]="t.valor">{{ t.etiqueta }}</mat-radio-button>
        }
      </mat-radio-group>
      <app-field-error [control]="f.controls.tipoVinculacion" />

      <div class="form-grid">
        <mat-form-field class="col-6">
          <mat-label>Sede</mat-label>
          <mat-select formControlName="sedeId" [required]="f.controls.tipoVinculacion.value !== 'EXTERNO'">
            <mat-option [value]="null">—</mat-option>
            @for (g of sedesPorRegion(); track g.region) {
              <mat-optgroup [label]="g.nombre">
                @for (s of g.sedes; track s.id) {
                  <mat-option [value]="s.id">{{ s.nombre }}</mat-option>
                }
              </mat-optgroup>
            }
          </mat-select>
          <mat-error>{{ f.controls.sedeId.errors | errorMsg }}</mat-error>
        </mat-form-field>
        <mat-form-field class="col-6">
          <mat-label>{{ f.controls.tipoVinculacion.value === 'DOCENTE' ? 'Programa donde enseña' : 'Programa académico' }}</mat-label>
          <mat-select formControlName="programaId">
            <mat-option [value]="null">—</mat-option>
            @for (p of inst.programas; track p.id) {
              <mat-option [value]="p.id">{{ p.nombre }}</mat-option>
            }
          </mat-select>
          <mat-error>{{ f.controls.programaId.errors | errorMsg }}</mat-error>
        </mat-form-field>
        <mat-form-field class="col-6">
          <mat-label>Profesión / título principal</mat-label>
          <input matInput formControlName="profesion" placeholder="Ej.: Ingeniero de Sistemas" />
          <mat-error>{{ f.controls.profesion.errors | errorMsg }}</mat-error>
        </mat-form-field>
        <mat-form-field class="col-6">
          <mat-label>Área de conocimiento (SNIES)</mat-label>
          <mat-select formControlName="areaConocimiento">
            <mat-option [value]="null">—</mat-option>
            @for (a of inst.areas; track a.valor) {
              <mat-option [value]="a.valor">{{ a.etiqueta }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
    </section>
  `,
  styles: `
    .inst { background: #f3f6fb; border: 1px solid #e3ebf7; border-radius: 12px; padding: 4px 16px 8px; margin-bottom: 16px; }
    .ayuda { margin: 0 0 8px; font-size: 0.85rem; color: #3e4c59; }
  `,
})
export class InstitucionalFieldsComponent implements OnInit {
  readonly form = input.required<InstitucionalForm>();
  protected readonly inst = inject(InstitucionService);

  protected readonly sedesPorRegion = computed(() =>
    this.inst.regiones
      .map((r) => ({ region: r.id, nombre: r.nombre, sedes: this.inst.sedes().filter((s) => s.region === r.id) }))
      .filter((g) => g.sedes.length),
  );

  ngOnInit(): void {
    this.inst.cargarSedes().subscribe();
  }
}
