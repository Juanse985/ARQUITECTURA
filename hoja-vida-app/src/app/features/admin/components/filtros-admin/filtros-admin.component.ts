import { Component, OnInit, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { DEPARTAMENTOS } from '../../../../core/constants/divipola';
import { InstitucionService } from '../../../../core/services/institucion.service';
import { AdminFiltroService } from '../../services/admin-filtro.service';

/** Barra de filtros (una sola fila, encima de los gráficos): región, departamento, sede y tipo. */
@Component({
  selector: 'app-filtros-admin',
  imports: [MatFormFieldModule, MatSelectModule, MatButtonModule, MatIconModule],
  template: `
    @let f = filtros.filtro();
    <div class="filtros" role="search" aria-label="Filtros de estadísticas">
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Región</mat-label>
        <mat-select [value]="f.region" (selectionChange)="filtros.actualizar({ region: $event.value, sedeId: null, departamento: null })">
          <mat-option [value]="null">Todas</mat-option>
          @for (r of inst.regiones; track r.id) { <mat-option [value]="r.id">{{ r.nombre }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Departamento</mat-label>
        <mat-select [value]="f.departamento" (selectionChange)="filtros.actualizar({ departamento: $event.value, sedeId: null })">
          <mat-option [value]="null">Todos</mat-option>
          @for (d of departamentos(); track d.codigo) { <mat-option [value]="d.codigo">{{ d.nombre }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Sede</mat-label>
        <mat-select [value]="f.sedeId" (selectionChange)="filtros.actualizar({ sedeId: $event.value })">
          <mat-option [value]="null">Todas</mat-option>
          @for (s of sedes(); track s.id) { <mat-option [value]="s.id">{{ s.nombre }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <mat-form-field subscriptSizing="dynamic">
        <mat-label>Vinculación</mat-label>
        <mat-select [value]="f.tipoVinculacion" (selectionChange)="filtros.actualizar({ tipoVinculacion: $event.value })">
          <mat-option [value]="null">Todas</mat-option>
          @for (t of inst.tiposVinculacion; track t.valor) { <mat-option [value]="t.valor">{{ t.etiqueta }}</mat-option> }
        </mat-select>
      </mat-form-field>
      <button mat-button type="button" (click)="filtros.limpiar()" [disabled]="!activos()"><mat-icon>filter_alt_off</mat-icon> Limpiar</button>
    </div>
  `,
  styles: `
    .filtros { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 16px; }
    mat-form-field { width: 200px; }
    @media (max-width: 600px) { mat-form-field { width: 100%; } }
  `,
})
export class FiltrosAdminComponent implements OnInit {
  protected readonly filtros = inject(AdminFiltroService);
  protected readonly inst = inject(InstitucionService);

  protected readonly departamentos = computed(() => {
    const region = this.filtros.filtro().region;
    const codigos = new Set(this.inst.sedes().filter((s) => !region || s.region === region).map((s) => s.departamento));
    return DEPARTAMENTOS.filter((d) => codigos.has(d.codigo));
  });
  protected readonly sedes = computed(() => {
    const f = this.filtros.filtro();
    return this.inst.sedes().filter((s) => (!f.region || s.region === f.region) && (!f.departamento || s.departamento === f.departamento));
  });
  protected readonly activos = computed(() => Object.values(this.filtros.filtro()).some((v) => !!v));

  ngOnInit(): void {
    this.inst.cargarSedes().subscribe();
  }
}
