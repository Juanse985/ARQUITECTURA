import { Component, DestroyRef, OnInit, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { distinctUntilChanged, pairwise, startWith, switchMap } from 'rxjs';
import { Departamento, Municipio } from '../../../../core/models';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { ErrorMessagePipe } from '../../../../shared/pipes/error-message.pipe';

export type UbicacionGroup = FormGroup<{
  pais: FormControl<string>;
  departamento: FormControl<string | null>;
  municipio: FormControl<string | null>;
}>;

/**
 * Selects dependientes en cascada País -> Departamento -> Municipio.
 * Para Colombia usa la DIVIPOLA del DANE; para otros países, texto libre.
 */
@Component({
  selector: 'app-ubicacion-fields',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatSelectModule, MatInputModule, ErrorMessagePipe],
  template: `
    <div class="form-grid" [formGroup]="grupo()">
      <mat-form-field class="col-4">
        <mat-label>{{ prefijo() }}País</mat-label>
        <mat-select formControlName="pais" required>
          @for (p of catalogos.paises; track p) {
            <mat-option [value]="p">{{ p }}</mat-option>
          }
        </mat-select>
        <mat-error>{{ grupo().controls.pais.errors | errorMsg }}</mat-error>
      </mat-form-field>

      @if (esColombia()) {
        <mat-form-field class="col-4">
          <mat-label>{{ prefijo() }}Departamento</mat-label>
          <mat-select formControlName="departamento" required>
            @for (d of departamentos(); track d.codigo) {
              <mat-option [value]="d.codigo">{{ d.nombre }}</mat-option>
            }
          </mat-select>
          <mat-error>{{ grupo().controls.departamento.errors | errorMsg }}</mat-error>
        </mat-form-field>
        <mat-form-field class="col-4">
          <mat-label>{{ prefijo() }}Municipio</mat-label>
          <mat-select formControlName="municipio" required>
            @for (m of municipios(); track m.codigo) {
              <mat-option [value]="m.codigo">{{ m.nombre }}</mat-option>
            } @empty {
              <mat-option disabled>Seleccione primero un departamento</mat-option>
            }
          </mat-select>
          <mat-error>{{ grupo().controls.municipio.errors | errorMsg }}</mat-error>
        </mat-form-field>
      } @else {
        <mat-form-field class="col-4">
          <mat-label>{{ prefijo() }}Estado / provincia</mat-label>
          <input matInput formControlName="departamento" />
        </mat-form-field>
        <mat-form-field class="col-4">
          <mat-label>{{ prefijo() }}Ciudad / municipio</mat-label>
          <input matInput formControlName="municipio" required />
          <mat-error>{{ grupo().controls.municipio.errors | errorMsg }}</mat-error>
        </mat-form-field>
      }
    </div>
  `,
})
export class UbicacionFieldsComponent implements OnInit {
  readonly grupo = input.required<UbicacionGroup>();
  readonly prefijo = input<string>('');

  protected readonly catalogos = inject(CatalogosService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly departamentos = signal<Departamento[]>([]);
  protected readonly municipios = signal<Municipio[]>([]);
  protected readonly esColombia = signal(true);

  ngOnInit(): void {
    const g = this.grupo();
    this.catalogos.getDepartamentos().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((d) => this.departamentos.set(d));

    // Cambio de país: limpia departamento y municipio.
    g.controls.pais.valueChanges
      .pipe(startWith(g.controls.pais.value), distinctUntilChanged(), pairwise(), takeUntilDestroyed(this.destroyRef))
      .subscribe(([antes, ahora]) => {
        if (antes !== ahora) g.patchValue({ departamento: null, municipio: null });
      });
    g.controls.pais.valueChanges
      .pipe(startWith(g.controls.pais.value), takeUntilDestroyed(this.destroyRef))
      .subscribe((p) => this.esColombia.set(p === this.catalogos.paisColombia));

    // Cambio de departamento: recarga municipios (cascada).
    g.controls.departamento.valueChanges
      .pipe(
        startWith(g.controls.departamento.value),
        distinctUntilChanged(),
        switchMap((dep) => this.catalogos.getMunicipios(this.esColombia() ? dep : null)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((m) => {
        this.municipios.set(m);
        const actual = g.controls.municipio.value;
        if (this.esColombia() && actual && m.length && !m.some((x) => x.codigo === actual)) {
          g.controls.municipio.setValue(null);
        }
      });
  }
}
