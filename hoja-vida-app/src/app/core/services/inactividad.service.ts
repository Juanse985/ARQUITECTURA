import { Injectable, NgZone, inject } from '@angular/core';
import { AlertService } from './alert.service';
import { AuthService } from './auth.service';

const MINUTOS_INACTIVIDAD = 15;

/**
 * Cierra la sesión tras 15 minutos sin actividad (control de seguridad para
 * equipos compartidos, p. ej. salas de cómputo de la universidad).
 */
@Injectable({ providedIn: 'root' })
export class InactividadService {
  private readonly zone = inject(NgZone);
  private readonly auth = inject(AuthService);
  private readonly alert = inject(AlertService);
  private timer?: ReturnType<typeof setTimeout>;
  private iniciado = false;
  private readonly reiniciar = () => this.programar();

  iniciar(): void {
    if (this.iniciado) return;
    this.iniciado = true;
    this.zone.runOutsideAngular(() => {
      ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach((e) => window.addEventListener(e, this.reiniciar, { passive: true }));
    });
    this.programar();
  }

  private programar(): void {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.zone.run(() => {
        if (!this.auth.autenticado()) return;
        this.auth.logout('expirada');
        void this.alert.info('Sesión cerrada por inactividad', `Por seguridad cerramos tu sesión después de ${MINUTOS_INACTIVIDAD} minutos sin actividad.`, 'warning');
      });
    }, MINUTOS_INACTIVIDAD * 60 * 1000);
  }
}
