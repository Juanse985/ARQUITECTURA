import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard, usuarioGuard } from './core/guards/auth.guard';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { MainLayoutComponent } from './layout/main-layout/main-layout.component';

/** Rutas raíz. Cada feature se carga de forma diferida (lazy loading). */
export const routes: Routes = [
  {
    path: 'auth',
    component: AuthLayoutComponent,
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      {
        path: 'inicio',
        canActivate: [usuarioGuard],
        title: 'Inicio · SIGEHV',
        data: { breadcrumb: 'Inicio' },
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'hoja-vida',
        canActivate: [usuarioGuard],
        data: { breadcrumb: 'Mi hoja de vida' },
        loadChildren: () => import('./features/hoja-vida/hoja-vida.routes').then((m) => m.HOJA_VIDA_ROUTES),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        data: { breadcrumb: 'Administración' },
        loadChildren: () => import('./features/admin/admin.routes').then((m) => m.ADMIN_ROUTES),
      },
      {
        path: 'perfil',
        data: { breadcrumb: 'Mi cuenta' },
        loadChildren: () => import('./features/perfil/perfil.routes').then((m) => m.PERFIL_ROUTES),
      },
    ],
  },
  { path: '**', redirectTo: 'inicio' }, // el usuarioGuard envía al admin a /admin
];
