import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { TokenStorageService } from '../services/token-storage.service';

/** Agrega el encabezado Authorization: Bearer <token> a las peticiones hacia la API. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(TokenStorageService).obtener();
  const esApi = req.url.startsWith(environment.apiUrl);
  const esPublica = /\/auth\/(login|register|forgot-password)$/.test(req.url);
  if (!token || !esApi || esPublica) return next(req);
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};
