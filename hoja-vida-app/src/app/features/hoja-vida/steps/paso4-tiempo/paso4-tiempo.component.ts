import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTableModule } from '@angular/material/table';
import { merge, startWith } from 'rxjs';
import { ExperienciaLaboral, TiempoExperiencia } from '../../../../core/models';
import { ExperienciaCalculoService } from '../../../../core/services/experiencia-calculo.service';
import { toIsoDate } from '../../../../core/utils/date-utils';
import { SoloNumerosDirective } from '../../../../shared/directives/solo-numeros.directive';
import { ErrorMessagePipe } from '../../../../shared/pipes/error-message.pipe';
import { SeccionHeaderComponent } from '../../components/seccion-header/seccion-header.component';
import { ExperienciaLaboralForm, TiempoForm } from '../../services/hoja-vida-form.factory';

interface FilaTiempo {
  clave: keyof TiempoExperiencia;
  ocupacion: string;
  editable: boolean;
}

/**
 * Paso 4 – TIEMPO TOTAL DE EXPERIENCIA.
 * Servidor público y sector privado se calculan desde el Paso 3;
 * trabajador independiente se diligencia a mano.
 */
@Component({
  selector: 'app-paso4-tiempo',
  imports: [ReactiveFormsModule, MatTableModule, MatFormFieldModule, MatInputModule, MatIconModule, ErrorMessagePipe, SoloNumerosDirective, SeccionHeaderComponent],
  templateUrl: './paso4-tiempo.component.html',
  styleUrl: './paso4-tiempo.component.scss',
})
export class Paso4TiempoComponent implements OnInit {
  readonly form = input.required<TiempoForm>();
  readonly experiencia = input.required<ExperienciaLaboralForm>();

  private readonly calculo = inject(ExperienciaCalculoService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly tiempo = signal<TiempoExperiencia | null>(null);
  protected readonly columnas = ['ocupacion', 'anios', 'meses'];
  protected readonly filas: FilaTiempo[] = [
    { clave: 'servidorPublico', ocupacion: 'Servidor público', editable: false },
    { clave: 'sectorPrivado', ocupacion: 'Empleado del sector privado', editable: false },
    { clave: 'independiente', ocupacion: 'Trabajador independiente', editable: true },
    { clave: 'total', ocupacion: 'Total tiempo de experiencia', editable: false },
  ];

  ngOnInit(): void {
    merge(this.experiencia().valueChanges, this.form().valueChanges)
      .pipe(startWith(null), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.recalcular());
  }

  valor(clave: keyof TiempoExperiencia, campo: 'anios' | 'meses'): number {
    return this.tiempo()?.[clave]?.[campo] ?? 0;
  }

  private recalcular(): void {
    const exps = this.experiencia()
      .getRawValue()
      .items.map(
        (e) =>
          ({
            tipoEntidad: e.tipoEntidad,
            fechaIngreso: toIsoDate(e.fechaIngreso) ?? '',
            fechaRetiro: toIsoDate(e.fechaRetiro),
            empleoActual: e.empleoActual,
          }) as ExperienciaLaboral,
      );
    this.tiempo.set(this.calculo.calcular(exps, this.form().getRawValue().independiente));
  }
}
