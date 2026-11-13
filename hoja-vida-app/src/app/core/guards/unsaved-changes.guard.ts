import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { AlertService } from '../services/alert.service';

/** Contrato que implementan los componentes con formularios editables. */
export interface TieneCambiosSinGuardar {
  tieneCambiosSinGuardar(): boolean;
}

/** Pregunta con SweetAlert2 antes de abandonar una página con cambios sin guardar. */
export const unsavedChangesGuard: CanDeactivateFn<TieneCambiosSinGuardar> = (componente) => {
  if (!componente?.tieneCambiosSinGuardar?.()) return true;
  return inject(AlertService).confirmarDescartar();
};
