import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Component, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AlertService } from '../../core/services/alert.service';
import { AuthService } from '../../core/services/auth.service';
import { HojaVidaService } from '../../core/services/hoja-vida.service';
import { InactividadService } from '../../core/services/inactividad.service';
import { InstitucionService } from '../../core/services/institucion.service';
import { AppFooterComponent } from '../../shared/components/app-footer/app-footer.component';
import { BreadcrumbComponent } from '../../shared/components/breadcrumb/breadcrumb.component';
import { LogoPlaceholderComponent } from '../../shared/components/logo-placeholder/logo-placeholder.component';

interface ItemMenu {
  ruta: string;
  etiqueta: string;
  icono: string;
  exacto?: boolean;
}

/** Layout privado: toolbar azul + sidenav responsive + breadcrumbs + footer. */
@Component({
  selector: 'app-main-layout',
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatSidenavModule, MatListModule,
    MatIconModule, MatButtonModule, MatMenuModule, MatDividerModule, MatTooltipModule,
    BreadcrumbComponent, AppFooterComponent, LogoPlaceholderComponent,
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.scss',
})
export class MainLayoutComponent {
  private readonly bp = inject(BreakpointObserver);
  private readonly router = inject(Router);
  private readonly alert = inject(AlertService);
  private readonly hojaVida = inject(HojaVidaService);
  protected readonly auth = inject(AuthService);
  protected readonly app = environment;
  protected readonly inst = inject(InstitucionService);
  private readonly sidenav = viewChild.required<MatSidenav>('sidenav');

  protected readonly esMovil = toSignal(
    this.bp.observe([Breakpoints.XSmall, Breakpoints.Small]).pipe(map((r) => r.matches)),
    { initialValue: false },
  );
  protected readonly iniciales = computed(() => {
    const u = this.auth.usuario();
    return u ? `${u.nombres[0] ?? ''}${u.apellidos[0] ?? ''}`.toUpperCase() : '';
  });

  protected readonly menu: ItemMenu[] = [
    { ruta: '/inicio', etiqueta: 'Inicio', icono: 'dashboard', exacto: true },
    { ruta: '/hoja-vida', etiqueta: 'Mi hoja de vida', icono: 'badge', exacto: true },
    { ruta: '/hoja-vida/editar', etiqueta: 'Diligenciar / editar', icono: 'edit_note' },
    { ruta: '/hoja-vida/importar', etiqueta: 'Importar HV con IA', icono: 'auto_awesome' },
    { ruta: '/hoja-vida/formato', etiqueta: 'Formato oficial', icono: 'print' },
    { ruta: '/perfil', etiqueta: 'Mi cuenta', icono: 'manage_accounts' },
  ];

  protected readonly menuAdmin: ItemMenu[] = [
    { ruta: '/admin', etiqueta: 'Panel y estadísticas', icono: 'insights', exacto: true },
    { ruta: '/admin/hojas-vida', etiqueta: 'Hojas de vida', icono: 'folder_shared' },
    { ruta: '/admin/usuarios', etiqueta: 'Usuarios y roles', icono: 'group' },
    { ruta: '/admin/sedes', etiqueta: 'Sedes', icono: 'location_city' },
    { ruta: '/admin/configuracion', etiqueta: 'Institución e IA', icono: 'settings' },
    { ruta: '/admin/auditoria', etiqueta: 'Auditoría', icono: 'policy' },
  ];

  constructor() {
    inject(InactividadService).iniciar();
  }

  cerrarMenuSiMovil(): void {
    if (this.esMovil()) void this.sidenav().close();
  }

  async cerrarSesion(): Promise<void> {
    const ok = await this.alert.confirmar('Cerrar sesión', '¿Deseas cerrar tu sesión?', 'Sí, cerrar sesión', 'question');
    if (!ok) return;
    // Navega primero para que el guard de cambios sin guardar pueda intervenir.
    const salio = await this.router.navigate([this.auth.esAdmin() ? '/admin' : '/inicio']);
    if (salio === false) return;
    this.hojaVida.limpiar();
    this.auth.logout();
    this.alert.toast('Sesión cerrada correctamente');
  }
}
