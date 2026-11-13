import { Component, inject, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FILAS_FORMATO } from '../../../../core/constants/app.constants';
import { AlertService } from '../../../../core/services/alert.service';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { hoy } from '../../../../core/utils/date-utils';
import { FieldErrorComponent } from '../../../../shared/components/field-error/field-error.component';
import { ErrorMessagePipe } from '../../../../shared/pipes/error-message.pipe';
import { SeccionHeaderComponent } from '../../components/seccion-header/seccion-header.component';
import { UbicacionFieldsComponent } from '../../components/ubicacion-fields/ubicacion-fields.component';
import { ExperienciaLaboralForm, HojaVidaFormFactory } from '../../services/hoja-vida-form.factory';

/** Paso 3 – EXPERIENCIA LABORAL (orden cronológico, empezando por el empleo actual o el último). */
@Component({
  selector: 'app-paso3-experiencia',
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatRadioModule, MatCheckboxModule, MatDatepickerModule,
    MatButtonModule, MatIconModule, MatCardModule, MatTooltipModule, ErrorMessagePipe, FieldErrorComponent,
    SeccionHeaderComponent, UbicacionFieldsComponent,
  ],
  templateUrl: './paso3-experiencia.component.html',
  styleUrl: './paso3-experiencia.component.scss',
})
export class Paso3ExperienciaComponent {
  readonly form = input.required<ExperienciaLaboralForm>();
  readonly porcentaje = input<number | null>(null);

  protected readonly catalogos = inject(CatalogosService);
  private readonly factory = inject(HojaVidaFormFactory);
  private readonly alert = inject(AlertService);
  protected readonly maxFecha = hoy();
  protected readonly filas = FILAS_FORMATO;

  agregar(): void {
    this.form().controls.items.push(this.factory.crearExperiencia());
    this.form().markAsDirty();
  }

  async eliminar(i: number): Promise<void> {
    const nombre = this.form().controls.items.at(i).controls.empresa.value || `la experiencia #${i + 1}`;
    if (!(await this.alert.confirmarEliminar(nombre))) return;
    this.form().controls.items.removeAt(i);
    this.form().markAsDirty();
    this.alert.toast('Experiencia eliminada. Recuerda guardar los cambios.', 'info');
  }

  /** Mueve un bloque para respetar el orden cronológico. */
  mover(i: number, delta: -1 | 1): void {
    const items = this.form().controls.items;
    const j = i + delta;
    if (j < 0 || j >= items.length) return;
    const ctrl = items.at(i);
    items.removeAt(i);
    items.insert(j, ctrl);
    this.form().markAsDirty();
  }

  /** Ordena de la más reciente a la más antigua por fecha de ingreso. */
  ordenar(): void {
    const items = this.form().controls.items;
    const ordenados = [...items.controls].sort((a, b) => {
      if (a.controls.empleoActual.value !== b.controls.empleoActual.value) return a.controls.empleoActual.value ? -1 : 1;
      return (b.controls.fechaIngreso.value?.getTime() ?? 0) - (a.controls.fechaIngreso.value?.getTime() ?? 0);
    });
    items.clear();
    ordenados.forEach((c) => items.push(c));
    this.form().markAsDirty();
    this.alert.toast('Experiencias ordenadas cronológicamente');
  }

  textoCruces(): string {
    const c = this.form().controls.items.errors?.['cruceFechas'] as [number, number][] | undefined;
    return c ? c.map(([a, b]) => `#${a} y #${b}`).join(', ') : '';
  }
}
