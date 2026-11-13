import { Component, inject, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { AlertService } from '../../../../core/services/alert.service';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { hoy } from '../../../../core/utils/date-utils';
import { FieldErrorComponent } from '../../../../shared/components/field-error/field-error.component';
import { SoloNumerosDirective } from '../../../../shared/directives/solo-numeros.directive';
import { ErrorMessagePipe } from '../../../../shared/pipes/error-message.pipe';
import { SeccionHeaderComponent } from '../../components/seccion-header/seccion-header.component';
import { UbicacionFieldsComponent } from '../../components/ubicacion-fields/ubicacion-fields.component';
import { DatosPersonalesForm, InstitucionalForm } from '../../services/hoja-vida-form.factory';
import { InstitucionalFieldsComponent } from '../../components/institucional-fields/institucional-fields.component';

/** Paso 1 – DATOS PERSONALES */
@Component({
  selector: 'app-paso1-datos-personales',
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatRadioModule, MatDatepickerModule,
    MatButtonModule, MatIconModule, ErrorMessagePipe, FieldErrorComponent, SoloNumerosDirective,
    UbicacionFieldsComponent, SeccionHeaderComponent, InstitucionalFieldsComponent,
  ],
  templateUrl: './paso1-datos-personales.component.html',
  styleUrl: './paso1-datos-personales.component.scss',
})
export class Paso1DatosPersonalesComponent {
  readonly form = input.required<DatosPersonalesForm>();
  readonly institucional = input.required<InstitucionalForm>();
  readonly porcentaje = input<number | null>(null);

  protected readonly catalogos = inject(CatalogosService);
  private readonly alert = inject(AlertService);
  protected readonly maxFecha = hoy();
  protected readonly minFecha = new Date(1920, 0, 1);

  seleccionarFoto(e: Event): void {
    const inputEl = e.target as HTMLInputElement;
    const archivo = inputEl.files?.[0];
    inputEl.value = '';
    if (!archivo) return;
    if (!['image/png', 'image/jpeg'].includes(archivo.type)) {
      void this.alert.error('Formato no permitido', 'La foto debe ser una imagen PNG o JPG.');
      return;
    }
    if (archivo.size > 1024 * 1024) {
      void this.alert.error('Archivo muy grande', 'La foto no debe superar 1 MB.');
      return;
    }
    const lector = new FileReader();
    lector.onload = () => {
      this.form().controls.fotoUrl.setValue(lector.result as string);
      this.form().controls.fotoUrl.markAsDirty();
    };
    lector.readAsDataURL(archivo);
  }

  async quitarFoto(): Promise<void> {
    if (!(await this.alert.confirmarEliminar('la foto'))) return;
    this.form().controls.fotoUrl.setValue(null);
    this.form().controls.fotoUrl.markAsDirty();
  }
}
