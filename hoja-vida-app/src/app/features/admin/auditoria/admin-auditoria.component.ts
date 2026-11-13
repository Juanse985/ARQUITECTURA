import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { RegistroAuditoria } from '../../../core/models';
import { AdminService } from '../../../core/services/admin.service';
import { PageTitleComponent } from '../../../shared/components/page-title/page-title.component';

/** Bitácora de seguridad: accesos, intentos fallidos, cambios de rol y consultas de datos personales. */
@Component({
  selector: 'app-admin-auditoria',
  imports: [DatePipe, MatCardModule, MatTableModule, MatPaginatorModule, MatIconModule, PageTitleComponent],
  template: `
    <app-page-title titulo="Auditoría" subtitulo="Registro de acciones sensibles (Ley 1581 de 2012: trazabilidad del tratamiento de datos)" icono="policy" />
    <mat-card appearance="outlined" class="card">
      <div class="tabla-wrap">
        <table mat-table [dataSource]="filas()" aria-label="Registros de auditoría">
          <ng-container matColumnDef="fecha"><th mat-header-cell *matHeaderCellDef>Fecha (UTC)</th><td mat-cell *matCellDef="let r">{{ r.fecha | date: 'dd/MM/yyyy HH:mm:ss' }}</td></ng-container>
          <ng-container matColumnDef="usuario"><th mat-header-cell *matHeaderCellDef>Usuario</th><td mat-cell *matCellDef="let r">{{ r.email || '—' }}</td></ng-container>
          <ng-container matColumnDef="accion"><th mat-header-cell *matHeaderCellDef>Acción</th><td mat-cell *matCellDef="let r"><code>{{ r.accion }}</code></td></ng-container>
          <ng-container matColumnDef="detalle"><th mat-header-cell *matHeaderCellDef>Detalle</th><td mat-cell *matCellDef="let r">{{ r.detalle }}</td></ng-container>
          <ng-container matColumnDef="resultado"><th mat-header-cell *matHeaderCellDef>Resultado</th>
            <td mat-cell *matCellDef="let r"><span class="res" [class.fallo]="r.resultado === 'FALLO'"><mat-icon>{{ r.resultado === 'OK' ? 'check_circle' : 'error' }}</mat-icon>{{ r.resultado === 'OK' ? 'Correcto' : 'Fallido' }}</span></td></ng-container>
          <tr mat-header-row *matHeaderRowDef="columnas"></tr>
          <tr mat-row *matRowDef="let r; columns: columnas"></tr>
          <tr class="mat-row" *matNoDataRow><td class="mat-cell vacio" [attr.colspan]="columnas.length">Aún no hay registros.</td></tr>
        </table>
      </div>
      <mat-paginator [length]="total()" [pageSize]="20" [pageSizeOptions]="[20, 50, 100]" (page)="cargar($event)" />
    </mat-card>
  `,
  styles: `
    .card { padding: 12px 16px; }
    .tabla-wrap { overflow-x: auto; border: 1px solid #cbd2d9; border-radius: 10px; }
    table { width: 100%; min-width: 760px; }
    th.mat-mdc-header-cell { background: #f3f6fb !important; color: #0b2d6b !important; font-weight: 700; }
    code { font-size: 0.78rem; background: #f3f6fb; padding: 2px 6px; border-radius: 6px; }
    .res { display: inline-flex; align-items: center; gap: 4px; color: #2e7d32; font-weight: 600; font-size: 0.85rem; }
    .res.fallo { color: #c62828; }
    .res mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .vacio { padding: 24px; text-align: center; color: #7b8794; }
  `,
})
export class AdminAuditoriaComponent implements OnInit {
  private readonly admin = inject(AdminService);
  protected readonly filas = signal<RegistroAuditoria[]>([]);
  protected readonly total = signal(0);
  protected readonly columnas = ['fecha', 'usuario', 'accion', 'detalle', 'resultado'];

  ngOnInit(): void {
    this.cargar();
  }

  cargar(e?: PageEvent): void {
    this.admin.auditoria((e?.pageIndex ?? 0) + 1, e?.pageSize ?? 20).subscribe((p) => {
      this.filas.set(p.items);
      this.total.set(p.total);
    });
  }
}
