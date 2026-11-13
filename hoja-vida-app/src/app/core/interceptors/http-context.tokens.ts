import { HttpContext, HttpContextToken } from '@angular/common/http';

/** Si es true, el errorInterceptor NO muestra SweetAlert (el componente maneja el error). */
export const SKIP_ERROR_ALERT = new HttpContextToken<boolean>(() => false);

/** Si es true, la petición no activa el spinner global (p. ej. autoguardado de borrador). */
export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);

export const contexto = (opts: { sinAlerta?: boolean; sinLoading?: boolean }): HttpContext => {
  const ctx = new HttpContext();
  if (opts.sinAlerta) ctx.set(SKIP_ERROR_ALERT, true);
  if (opts.sinLoading) ctx.set(SKIP_LOADING, true);
  return ctx;
};
