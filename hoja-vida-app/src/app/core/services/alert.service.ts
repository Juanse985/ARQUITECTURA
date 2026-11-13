import { Injectable } from '@angular/core';
import Swal, { SweetAlertIcon, SweetAlertOptions } from 'sweetalert2';

/** Escapa texto del usuario antes de insertarlo en HTML (previene XSS). */
export function escaparHtml(texto: string): string {
  return texto.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/**
 * Envoltorio de SweetAlert2 con los colores institucionales.
 * Todas las confirmaciones y mensajes de acción pasan por aquí.
 */
@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly base: SweetAlertOptions = {
    customClass: {
      popup: 'sigehv-swal',
      confirmButton: 'sigehv-btn-confirm',
      cancelButton: 'sigehv-btn-cancel',
    },
    buttonsStyling: true,
    reverseButtons: true,
    focusCancel: false,
  };

  exito(titulo: string, texto = ''): Promise<unknown> {
    return Swal.fire({ ...this.base, icon: 'success', title: titulo, text: texto, confirmButtonText: 'Aceptar', timer: 2500, timerProgressBar: true });
  }

  error(titulo: string, texto = ''): Promise<unknown> {
    return Swal.fire({ ...this.base, icon: 'error', title: titulo, html: texto, confirmButtonText: 'Entendido' });
  }

  info(titulo: string, texto = '', icon: SweetAlertIcon = 'info'): Promise<unknown> {
    return Swal.fire({ ...this.base, icon, title: titulo, html: texto, confirmButtonText: 'Aceptar' });
  }

  /** Confirmación genérica. Resuelve true si el usuario confirma. */
  async confirmar(
    titulo: string,
    texto: string,
    confirmText = 'Sí, continuar',
    icon: SweetAlertIcon = 'question',
  ): Promise<boolean> {
    const r = await Swal.fire({
      ...this.base,
      icon,
      title: titulo,
      html: texto,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: 'Cancelar',
    });
    return r.isConfirmed;
  }

  /** Confirmación de eliminación (botón rojo). */
  async confirmarEliminar(elemento = 'este registro'): Promise<boolean> {
    const r = await Swal.fire({
      ...this.base,
      icon: 'warning',
      title: '¿Estás seguro?',
      html: `Se eliminará <b>${escaparHtml(elemento)}</b>.<br>Esta acción no se puede deshacer.`,
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      customClass: { ...(this.base.customClass as object), confirmButton: 'sigehv-btn-danger' },
    });
    return r.isConfirmed;
  }

  confirmarGuardar(texto = '¿Deseas guardar los cambios de tu hoja de vida?'): Promise<boolean> {
    return this.confirmar('Guardar', texto, 'Sí, guardar', 'question');
  }

  confirmarDescartar(): Promise<boolean> {
    return this.confirmar(
      'Cambios sin guardar',
      'Tienes cambios sin guardar. Si sales ahora se perderán.<br>¿Deseas descartarlos?',
      'Descartar y salir',
      'warning',
    );
  }

  /** Notificación breve en la esquina. */
  toast(titulo: string, icon: SweetAlertIcon = 'success'): void {
    void Swal.fire({
      toast: true,
      position: 'top-end',
      icon,
      title: titulo,
      showConfirmButton: false,
      timer: 2500,
      timerProgressBar: true,
    });
  }
}
