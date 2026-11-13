import { Component, inject, input, signal } from '@angular/core';
import { Subject, debounceTime, distinctUntilChanged, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { InstitucionEducativa } from '../../../../core/models';
import { InstitucionService } from '../../../../core/services/institucion.service';
import { ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FILAS_FORMATO } from '../../../../core/constants/app.constants';
import { AlertService } from '../../../../core/services/alert.service';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { FieldErrorComponent } from '../../../../shared/components/field-error/field-error.component';
import { ErrorMessagePipe } from '../../../../shared/pipes/error-message.pipe';
import { SeccionHeaderComponent } from '../../components/seccion-header/seccion-header.component';
import { FormacionForm, HojaVidaFormFactory } from '../../services/hoja-vida-form.factory';

/** Paso 2 – FORMACIÓN ACADÉMICA (básica y media, superior e idiomas). */
@Component({
  selector: 'app-paso2-formacion',
  imports: [
    ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatRadioModule, MatButtonModule,
    MatIconModule, MatCardModule, MatTooltipModule, MatAutocompleteModule, ErrorMessagePipe, FieldErrorComponent,
    SeccionHeaderComponent,
  ],
  templateUrl: './paso2-formacion.component.html',
  styleUrl: './paso2-formacion.component.scss',
})
export class Paso2FormacionComponent {
  readonly form = input.required<FormacionForm>();
  readonly porcentaje = input<number | null>(null);

  protected readonly catalogos = inject(CatalogosService);
  private readonly factory = inject(HojaVidaFormFactory);
  private readonly alert = inject(AlertService);
  protected readonly filas = FILAS_FORMATO;
  protected readonly inst = inject(InstitucionService);

  /** Sugerencias de instituciones (GET /api/catalogos/instituciones?q=). */
  protected readonly sugerenciasIes = signal<InstitucionEducativa[]>([]);
  private readonly busquedaIes = new Subject<string>();

  constructor() {
    this.busquedaIes
      .pipe(debounceTime(250), distinctUntilChanged(), switchMap((q) => this.inst.buscarInstituciones(q)), takeUntilDestroyed())
      .subscribe((r) => this.sugerenciasIes.set(r));
  }

  buscarIes(q: string | null): void {
    this.busquedaIes.next(q ?? '');
  }

  agregarEstudio(): void {
    this.form().controls.educacionSuperior.push(this.factory.crearEducacionSuperior());
    this.form().markAsDirty();
  }

  async eliminarEstudio(i: number): Promise<void> {
    const titulo = this.form().controls.educacionSuperior.at(i).controls.titulo.value || `el estudio #${i + 1}`;
    if (!(await this.alert.confirmarEliminar(titulo))) return;
    this.form().controls.educacionSuperior.removeAt(i);
    this.form().markAsDirty();
    this.alert.toast('Estudio eliminado. Recuerda guardar los cambios.', 'info');
  }

  agregarIdioma(): void {
    this.form().controls.idiomas.push(this.factory.crearIdioma());
    this.form().markAsDirty();
  }

  async eliminarIdioma(i: number): Promise<void> {
    const nombre = this.form().controls.idiomas.at(i).controls.idioma.value || `el idioma #${i + 1}`;
    if (!(await this.alert.confirmarEliminar(nombre))) return;
    this.form().controls.idiomas.removeAt(i);
    this.form().markAsDirty();
    this.alert.toast('Idioma eliminado. Recuerda guardar los cambios.', 'info');
  }

  idiomasFiltrados(texto: string): string[] {
    const t = (texto ?? '').toLowerCase();
    return this.catalogos.idiomasSugeridos.filter((i) => i.toLowerCase().includes(t));
  }
}
