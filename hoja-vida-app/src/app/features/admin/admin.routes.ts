import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

/** Rutas del rol ADMIN (protegidas con adminGuard en app.routes.ts). */
export const ADMIN_ROUTES: Routes = [
  { path: '', title: 'Administración · SIGEHV', loadComponent: () => import('./panel/admin-panel.component').then((m) => m.AdminPanelComponent) },
  {
    path: 'hojas-vida',
    title: 'Hojas de vida · Administración',
    data: { breadcrumb: 'Hojas de vida' },
    loadComponent: () => import('./hojas-vida/admin-hojas-vida.component').then((m) => m.AdminHojasVidaComponent),
  },
  {
    path: 'hojas-vida/:id',
    title: 'Hoja de vida · Administración',
    data: { breadcrumb: 'Detalle' },
    loadComponent: () => import('./hoja-vida-ver/admin-hoja-vida-ver.component').then((m) => m.AdminHojaVidaVerComponent),
  },
  { path: 'usuarios', title: 'Usuarios · Administración', data: { breadcrumb: 'Usuarios y roles' }, loadComponent: () => import('./usuarios/admin-usuarios.component').then((m) => m.AdminUsuariosComponent) },
  { path: 'sedes', title: 'Sedes · Administración', data: { breadcrumb: 'Sedes' }, loadComponent: () => import('./sedes/admin-sedes.component').then((m) => m.AdminSedesComponent) },
  { path: 'configuracion', title: 'Configuración · Administración', data: { breadcrumb: 'Institución e IA' }, canDeactivate: [unsavedChangesGuard], loadComponent: () => import('./configuracion/admin-configuracion.component').then((m) => m.AdminConfiguracionComponent) },
  { path: 'auditoria', title: 'Auditoría · Administración', data: { breadcrumb: 'Auditoría' }, loadComponent: () => import('./auditoria/admin-auditoria.component').then((m) => m.AdminAuditoriaComponent) },
];
