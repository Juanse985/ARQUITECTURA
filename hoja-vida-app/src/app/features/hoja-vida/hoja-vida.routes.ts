import { Routes } from '@angular/router';
import { unsavedChangesGuard } from '../../core/guards/unsaved-changes.guard';

export const HOJA_VIDA_ROUTES: Routes = [
  {
    path: '',
    title: 'Mi hoja de vida · SIGEHV',
    loadComponent: () => import('./detalle/hoja-vida-detalle.component').then((m) => m.HojaVidaDetalleComponent),
  },
  {
    path: 'editar',
    title: 'Diligenciar hoja de vida · SIGEHV',
    data: { breadcrumb: 'Diligenciar / editar' },
    canDeactivate: [unsavedChangesGuard],
    loadComponent: () => import('./stepper/hoja-vida-stepper.component').then((m) => m.HojaVidaStepperComponent),
  },
  {
    path: 'importar',
    title: 'Importar hoja de vida · SIGEHV',
    data: { breadcrumb: 'Importar con IA' },
    loadComponent: () => import('./importar/importar-hoja-vida.component').then((m) => m.ImportarHojaVidaComponent),
  },
  {
    path: 'formato',
    title: 'Formato oficial · SIGEHV',
    data: { breadcrumb: 'Formato oficial' },
    loadComponent: () => import('./formato-oficial/formato-oficial.component').then((m) => m.FormatoOficialComponent),
  },
];
