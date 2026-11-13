import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { RolUsuario, UsuarioAdmin } from '../../../core/models';
import { AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { PageTitleComponent } from '../../../shared/components/page-title/page-title.component';
import { FechaCoPipe } from '../../../shared/pipes/fecha-co.pipe';

/** Gestión de usuarios: buscar, activar/desactivar y asignar el rol de administrador. */
@Component({
  selector: 'app-admin-usuarios',
  imports: [FormsModule, MatCardModule, MatTableModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, MatIconModule, MatButtonModule, MatSlideToggleModule, PageTitleComponent, FechaCoPipe],
  template: `
    <app-page-title titulo="Usuarios y roles" [subtitulo]="usuarios().length + ' cuentas · ' + admins() + ' administradores'" icono="group" />
    <mat-card appearance="outlined" class="card">
      <mat-form-field subscriptSizing="dynamic" class="buscar">
        <mat-label>Buscar por nombre o correo</mat-label>
        <input matInput [ngModel]="q()" (ngModelChange)="q.set($event); pagina.set(0)" maxlength="80" />
        <mat-icon matSuffix>search</mat-icon>
      </mat-form-field>
      <div class="tabla-wrap">
        <table mat-table [dataSource]="visibles()" aria-label="Usuarios">
          <ng-container matColumnDef="nombre"><th mat-header-cell *matHeaderCellDef>Usuario</th>
            <td mat-cell *matCellDef="let u"><b>{{ u.nombres }} {{ u.apellidos }}</b><br /><small>{{ u.email }}</small></td></ng-container>
          <ng-container matColumnDef="registro"><th mat-header-cell *matHeaderCellDef>Registro / último acceso</th>
            <td mat-cell *matCellDef="let u">{{ u.fechaRegistro | fechaCo }}<br /><small>{{ u.ultimoAcceso ? (u.ultimoAcceso | fechaCo) : 'Sin acceso' }}</small></td></ng-container>
          <ng-container matColumnDef="hv"><th mat-header-cell *matHeaderCellDef>Hoja de vida</th>
            <td mat-cell *matCellDef="let u">{{ u.tieneHojaVida ? 'Sí' : 'No' }}</td></ng-container>
          <ng-container matColumnDef="rol"><th mat-header-cell *matHeaderCellDef>Administrador</th>
            <td mat-cell *matCellDef="let u"><mat-slide-toggle [checked]="u.rol === 'ADMIN'" [disabled]="u.id === yo()" (change)="cambiar(u, $event.checked ? 'ADMIN' : 'USUARIO', u.activo)" [attr.aria-label]="'Rol administrador de ' + u.email" /></td></ng-container>
          <ng-container matColumnDef="activo"><th mat-header-cell *matHeaderCellDef>Activo</th>
            <td mat-cell *matCellDef="let u"><mat-slide-toggle [checked]="u.activo" [disabled]="u.id === yo()" (change)="cambiar(u, u.rol, $event.checked)" [attr.aria-label]="'Cuenta activa de ' + u.email" /></td></ng-container>
          <tr mat-header-row *matHeaderRowDef="columnas"></tr>
          <tr mat-row *matRowDef="let r; columns: columnas" [class.inactivo]="!r.activo"></tr>
        </table>
      </div>
      <mat-paginator [length]="filtrados().length" [pageSize]="tamano()" [pageIndex]="pagina()" [pageSizeOptions]="[10, 25, 50]" (page)="paginar($event)" />
    </mat-card>
  `,
  styles: `
    .card { padding: 12px 16px; }
    .buscar { width: 100%; max-width: 420px; margin-bottom: 12px; }
    .tabla-wrap { overflow-x: auto; border: 1px solid #cbd2d9; border-radius: 10px; }
    table { width: 100%; min-width: 720px; }
    th.mat-mdc-header-cell { background: #f3f6fb !important; color: #0b2d6b !important; font-weight: 700; }
    small { color: #7b8794; }
    tr.inactivo td { opacity: 0.55; }
  `,
})
export class AdminUsuariosComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly alert = inject(AlertService);
  private readonly auth = inject(AuthService);
  protected readonly yo = computed(() => this.auth.usuario()?.id ?? -1);
  protected readonly usuarios = signal<UsuarioAdmin[]>([]);
  protected readonly q = signal('');
  protected readonly pagina = signal(0);
  protected readonly tamano = signal(10);
  protected readonly columnas = ['nombre', 'registro', 'hv', 'rol', 'activo'];
  protected readonly admins = computed(() => this.usuarios().filter((u) => u.rol === 'ADMIN').length);
  protected readonly filtrados = computed(() => {
    const q = this.q().toLowerCase().trim();
    return this.usuarios().filter((u) => !q || `${u.nombres} ${u.apellidos} ${u.email}`.toLowerCase().includes(q));
  });
  protected readonly visibles = computed(() => this.filtrados().slice(this.pagina() * this.tamano(), (this.pagina() + 1) * this.tamano()));

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    this.admin.usuarios().subscribe((u) => this.usuarios.set(u.sort((a, b) => (a.rol === b.rol ? a.nombres.localeCompare(b.nombres) : a.rol === 'ADMIN' ? -1 : 1))));
  }

  paginar(e: PageEvent): void {
    this.tamano.set(e.pageSize);
    this.pagina.set(e.pageIndex);
  }

  async cambiar(u: UsuarioAdmin, rol: RolUsuario, activo: boolean): Promise<void> {
    const accion = rol !== u.rol ? (rol === 'ADMIN' ? 'otorgar el rol de ADMINISTRADOR a' : 'quitar el rol de administrador a') : activo ? 'activar la cuenta de' : 'desactivar la cuenta de';
    const ok = await this.alert.confirmar('Confirmar cambio', `¿Deseas ${accion} <b>${u.email.replace(/[<>&"']/g, '')}</b>?`, 'Sí, aplicar', 'warning');
    if (!ok) {
      this.cargar(); // revierte el toggle
      return;
    }
    this.admin.actualizarUsuario(u.id, { rol, activo }).subscribe({
      next: () => {
        this.alert.toast('Usuario actualizado');
        this.cargar();
      },
      error: () => this.cargar(),
    });
  }
}
