import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DEPARTAMENTOS, MUNICIPIOS } from '../../../core/constants/divipola';
import { Sede } from '../../../core/models';
import { AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';
import { InstitucionService } from '../../../core/services/institucion.service';
import { PageTitleComponent } from '../../../shared/components/page-title/page-title.component';
import { ErrorMessagePipe } from '../../../shared/pipes/error-message.pipe';

/** CRUD de sedes (aparecen en el mapa, en los filtros y en el formulario del usuario). */
@Component({
  selector: 'app-admin-sedes',
  imports: [ReactiveFormsModule, MatCardModule, MatTableModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatSlideToggleModule, MatButtonModule, MatIconModule, MatTooltipModule, PageTitleComponent, ErrorMessagePipe],
  template: `
    <app-page-title titulo="Sedes" [subtitulo]="sedes().length + ' sedes registradas'" icono="location_city">
      <button mat-flat-button type="button" (click)="nueva()"><mat-icon>add</mat-icon> Nueva sede</button>
    </app-page-title>

    @if (editando()) {
      <mat-card appearance="outlined" class="card">
        <h2>{{ esNueva() ? 'Nueva sede' : 'Editar sede' }}</h2>
        <form [formGroup]="form" (ngSubmit)="guardar()" class="form-grid" novalidate>
          <mat-form-field class="col-3"><mat-label>Código</mat-label><input matInput formControlName="id" [readonly]="!esNueva()" placeholder="Ej.: BOY-TUN" required />
            <mat-hint>Mayúsculas, números y guiones</mat-hint><mat-error>{{ form.controls.id.errors | errorMsg }}</mat-error></mat-form-field>
          <mat-form-field class="col-6"><mat-label>Nombre</mat-label><input matInput formControlName="nombre" required /><mat-error>{{ form.controls.nombre.errors | errorMsg }}</mat-error></mat-form-field>
          <mat-form-field class="col-3"><mat-label>Región</mat-label>
            <mat-select formControlName="region" required>@for (r of inst.regiones; track r.id) { <mat-option [value]="r.id">{{ r.nombre }}</mat-option> }</mat-select></mat-form-field>
          <mat-form-field class="col-4"><mat-label>Departamento</mat-label>
            <mat-select formControlName="departamento" (selectionChange)="form.controls.municipio.setValue('')" required>@for (d of deptos; track d.codigo) { <mat-option [value]="d.codigo">{{ d.nombre }}</mat-option> }</mat-select></mat-form-field>
          <mat-form-field class="col-4"><mat-label>Municipio</mat-label>
            <mat-select formControlName="municipio" required>@for (m of municipios(); track m.codigo) { <mat-option [value]="m.codigo">{{ m.nombre }}</mat-option> }</mat-select></mat-form-field>
          <mat-form-field class="col-4"><mat-label>Ciudad (texto)</mat-label><input matInput formControlName="ciudad" required /></mat-form-field>
          <mat-form-field class="col-3"><mat-label>Latitud</mat-label><input matInput type="number" step="0.001" formControlName="lat" /><mat-error>{{ form.controls.lat.errors | errorMsg }}</mat-error></mat-form-field>
          <mat-form-field class="col-3"><mat-label>Longitud</mat-label><input matInput type="number" step="0.001" formControlName="lng" /><mat-error>{{ form.controls.lng.errors | errorMsg }}</mat-error></mat-form-field>
          <div class="col-3 toggle"><mat-slide-toggle formControlName="activa">Sede activa</mat-slide-toggle></div>
          <div class="col-12 acciones">
            <button mat-button type="button" (click)="editando.set(false)">Cancelar</button>
            <button mat-flat-button type="submit"><mat-icon>save</mat-icon> Guardar</button>
          </div>
        </form>
      </mat-card>
    }

    <mat-card appearance="outlined" class="card">
      <div class="tabla-wrap">
        <table mat-table [dataSource]="sedes()" aria-label="Sedes">
          <ng-container matColumnDef="id"><th mat-header-cell *matHeaderCellDef>Código</th><td mat-cell *matCellDef="let s">{{ s.id }}</td></ng-container>
          <ng-container matColumnDef="nombre"><th mat-header-cell *matHeaderCellDef>Sede</th><td mat-cell *matCellDef="let s"><b>{{ s.nombre }}</b><br /><small>{{ s.ciudad }}</small></td></ng-container>
          <ng-container matColumnDef="region"><th mat-header-cell *matHeaderCellDef>Región</th><td mat-cell *matCellDef="let s">{{ inst.nombreRegion(s.region) }}</td></ng-container>
          <ng-container matColumnDef="coord"><th mat-header-cell *matHeaderCellDef>Ubicación</th><td mat-cell *matCellDef="let s">{{ s.lat ?? '—' }}, {{ s.lng ?? '—' }}</td></ng-container>
          <ng-container matColumnDef="activa"><th mat-header-cell *matHeaderCellDef>Estado</th><td mat-cell *matCellDef="let s"><span class="chip" [class.chip-accent]="!s.activa">{{ s.activa ? 'Activa' : 'Inactiva' }}</span></td></ng-container>
          <ng-container matColumnDef="acciones"><th mat-header-cell *matHeaderCellDef><span class="sr-only">Acciones</span></th>
            <td mat-cell *matCellDef="let s">
              <button mat-icon-button (click)="editar(s)" matTooltip="Editar" [attr.aria-label]="'Editar ' + s.nombre"><mat-icon>edit</mat-icon></button>
              <button mat-icon-button class="borrar" (click)="eliminar(s)" matTooltip="Eliminar" [attr.aria-label]="'Eliminar ' + s.nombre"><mat-icon>delete</mat-icon></button>
            </td></ng-container>
          <tr mat-header-row *matHeaderRowDef="columnas"></tr>
          <tr mat-row *matRowDef="let r; columns: columnas"></tr>
        </table>
      </div>
    </mat-card>
  `,
  styles: `
    .card { padding: 14px 18px; margin-bottom: 16px; }
    h2 { margin: 0 0 12px; font-size: 1.05rem; color: #0b2d6b; }
    .tabla-wrap { overflow-x: auto; border: 1px solid #cbd2d9; border-radius: 10px; }
    table { width: 100%; min-width: 720px; }
    th.mat-mdc-header-cell { background: #f3f6fb !important; color: #0b2d6b !important; font-weight: 700; }
    small { color: #7b8794; }
    .borrar { color: #c62828; }
    .toggle { display: flex; align-items: center; min-height: 56px; }
    .acciones { display: flex; justify-content: flex-end; gap: 8px; }
  `,
})
export class AdminSedesComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly alert = inject(AlertService);
  private readonly fb = inject(FormBuilder);
  protected readonly inst = inject(InstitucionService);
  protected readonly sedes = signal<Sede[]>([]);
  protected readonly editando = signal(false);
  protected readonly esNueva = signal(false);
  protected readonly deptos = DEPARTAMENTOS;
  protected readonly columnas = ['id', 'nombre', 'region', 'coord', 'activa', 'acciones'];

  protected readonly form = this.fb.nonNullable.group({
    id: ['', [Validators.required, Validators.pattern(/^[A-Z0-9-]{2,12}$/)]],
    nombre: ['', [Validators.required, Validators.maxLength(80)]],
    region: ['BOGOTA', Validators.required],
    departamento: ['', Validators.required],
    municipio: ['', Validators.required],
    ciudad: ['', [Validators.required, Validators.maxLength(60)]],
    lat: this.fb.control<number | null>(null, [Validators.min(-4.3), Validators.max(13.5)]),
    lng: this.fb.control<number | null>(null, [Validators.min(-82), Validators.max(-66.8)]),
    activa: [true],
  });

  municipios() {
    const d = this.form.controls.departamento.value;
    return MUNICIPIOS.filter((m) => m.departamento === d);
  }

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.admin.sedes().subscribe((s) => this.sedes.set(s));
    this.inst.cargarSedes(true).subscribe();
  }

  nueva(): void {
    this.form.reset();
    this.esNueva.set(true);
    this.editando.set(true);
  }

  editar(s: Sede): void {
    this.form.reset(s as never);
    this.esNueva.set(false);
    this.editando.set(true);
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!(await this.alert.confirmarGuardar('¿Deseas guardar la sede?'))) return;
    const s = this.form.getRawValue() as unknown as Sede;
    const obs = this.esNueva() ? this.admin.crearSede(s) : this.admin.actualizarSede(s);
    obs.subscribe(() => {
      this.alert.toast('Sede guardada');
      this.editando.set(false);
      this.cargar();
    });
  }

  async eliminar(s: Sede): Promise<void> {
    if (!(await this.alert.confirmarEliminar(`la sede ${s.nombre}`))) return;
    this.admin.eliminarSede(s.id).subscribe(() => {
      this.alert.toast('Sede eliminada');
      this.cargar();
    });
  }
}
