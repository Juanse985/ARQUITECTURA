import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { EMPTY, catchError, throwError } from 'rxjs';
import { ApiError } from '../models';
import { AlertService, escaparHtml } from '../services/alert.service';
import { AuthService } from '../services/auth.service';
import { SKIP_ERROR_ALERT } from './http-context.tokens';

/** Extrae un mensaje legible del formato de error de FastAPI ({detail: ...}). */
export function mensajeDeError(e: HttpErrorResponse): string {
  const body = e.error as ApiError | string | null;
  if (body && typeof body === 'object' && 'detail' in body) {
    const d = body.detail;
    if (typeof d === 'string') return escaparHtml(d);
    if (Array.isArray(d)) {
      // Errores de validación 422 de Pydantic
      return d.map((x) => `• ${escaparHtml(x.loc.filter((p) => p !== 'body').join('.'))}: ${escaparHtml(x.msg)}`).join('<br>');
    }
  }
  if (typeof body === 'string' && body) return escaparHtml(body.slice(0, 300));
  switch (e.status) {
    case 0: return 'No fue posible conectarse con el servidor. Verifica tu conexión o que la API esté en ejecución.';
    case 400: return 'La solicitud no es válida.';
    case 403: return 'No tienes permisos para realizar esta acción.';
    case 404: return 'El recurso solicitado no existe.';
    case 409: return 'El registro ya existe.';
    case 413: return 'El archivo es demasiado grande.';
    case 415: return 'Tipo de archivo no permitido.';
    case 429: return 'Demasiados intentos. Espera unos minutos.';
    case 422: return 'Los datos enviados no son válidos.';
    case 500: return 'Ocurrió un error interno en el servidor.';
    default: return 'Ocurrió un error inesperado.';
  }
}

/** Manejo centralizado de errores HTTP con SweetAlert2. 401 -> cierra la sesión. */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const alert = inject(AlertService);
  const auth = inject(AuthService);
  return next(req).pipe(
    catchError((e: HttpErrorResponse) => {
      const esLogin = /\/auth\/login$/.test(req.url);
      if (e.status === 401 && !esLogin) {
        // Petición que quedó en curso justo después de cerrar sesión: se ignora.
        if (!auth.autenticado()) return EMPTY;
        auth.logout('expirada');
        void alert.info('Sesión finalizada', 'Tu sesión ha expirado. Inicia sesión nuevamente.', 'warning');
      } else if (!req.context.get(SKIP_ERROR_ALERT)) {
        void alert.error(e.status ? `Error ${e.status}` : 'Sin conexión', mensajeDeError(e));
      }
      return throwError(() => e);
    }),
  );
};
