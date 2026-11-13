import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

export const PERFIL_ROUTES: Routes = [
  {
    path: '',
    title: 'Mi cuenta · SIGEHV',
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./perfil.component').then((m) => m.PerfilComponent),
  },
];
