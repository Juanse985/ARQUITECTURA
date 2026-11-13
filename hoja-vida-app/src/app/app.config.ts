import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeEsCo from '@angular/common/locales/es-CO';
import {
  ApplicationConfig,
  LOCALE_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
} from '@angular/core';
import { DateAdapter, MAT_DATE_FORMATS, MAT_DATE_LOCALE } from '@angular/material/core';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';

import { routes } from './app.routes';
import { CO_DATE_FORMATS, CoDateAdapter } from './core/config/co-date-adapter';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { loadingInterceptor } from './core/interceptors/loading.interceptor';
import { mockBackendInterceptor } from './core/mock/mock-backend.interceptor';
import { AuthService } from './core/services/auth.service';
import { InstitucionService } from './core/services/institucion.service';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { MatStepperIntl } from '@angular/material/stepper';
import { StepperIntlEs } from './core/config/intl-es';

registerLocaleData(localeEsCo, 'es-CO');

/** Restaura la sesión (si hay token vigente) antes de que arranque el router. */
function restaurarSesion(): Promise<unknown> {
  const institucion = inject(InstitucionService);
  const obs = inject(AuthService).restaurarSesion();
  return Promise.all([
    firstValueFrom(institucion.cargarConfiguracion().pipe(catchError(() => of(null)))),
    obs ? firstValueFrom(obs.pipe(catchError(() => of(null)))) : Promise.resolve(),
  ]);
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    provideAnimationsAsync(),
    // Orden: loading -> auth -> error -> mock (el mock actúa como "servidor").
    provideHttpClient(withInterceptors([loadingInterceptor, authInterceptor, errorInterceptor, mockBackendInterceptor])),
    provideAppInitializer(restaurarSesion),
    { provide: LOCALE_ID, useValue: 'es-CO' },
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },
    { provide: DateAdapter, useClass: CoDateAdapter },
    { provide: MAT_DATE_FORMATS, useValue: CO_DATE_FORMATS },
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: 'outline', subscriptSizing: 'dynamic' } },
    { provide: MatStepperIntl, useClass: StepperIntlEs },
    { provide: MatPaginatorIntl, useFactory: () => Object.assign(new MatPaginatorIntl(), { itemsPerPageLabel: 'Registros por página' }) },
  ],
};
