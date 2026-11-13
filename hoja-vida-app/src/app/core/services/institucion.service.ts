import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AREAS_CONOCIMIENTO, CONFIGURACION_INSTITUCIONAL_DEFECTO, PROGRAMAS, REGIONES, TIPOS_VINCULACION } from '../constants/institucion';
import { ConfiguracionInstitucional, InstitucionEducativa, Programa, Sede } from '../models';
import { contexto } from '../interceptors/http-context.tokens';
import { toCamelCase, toSnakeCase } from '../utils/case-mapper';

/**
 * Datos de la institución (nombre, logo), sedes, programas y catálogo de IES.
 * GET /api/institucion es público para poder mostrar el logo en el login.
 */
@Injectable({ providedIn: 'root' })
export class InstitucionService {
  private readonly http = inject(HttpClient);
  private readonly url = environment.apiUrl;

  private readonly _config = signal<ConfiguracionInstitucional>(CONFIGURACION_INSTITUCIONAL_DEFECTO);
  readonly config = this._config.asReadonly();
  readonly nombre = computed(() => this._config().nombre);
  readonly sigla = computed(() => this._config().sigla);
  readonly logoUrl = computed(() => this._config().logoUrl);

  private readonly _sedes = signal<Sede[]>([]);
  readonly sedes = this._sedes.asReadonly();

  readonly regiones = REGIONES;
  readonly programas: Programa[] = PROGRAMAS;
  readonly areas = AREAS_CONOCIMIENTO;
  readonly tiposVinculacion = TIPOS_VINCULACION;
  private sedes$?: Observable<Sede[]>;

  cargarConfiguracion(): Observable<ConfiguracionInstitucional> {
    return this.http.get<unknown>(`${this.url}/institucion`, { context: contexto({ sinAlerta: true, sinLoading: true }) }).pipe(
      map((r) => toCamelCase<ConfiguracionInstitucional>(r)),
      tap((c) => this._config.set(c)),
    );
  }

  actualizarConfiguracion(c: ConfiguracionInstitucional): Observable<ConfiguracionInstitucional> {
    return this.http.put<unknown>(`${this.url}/institucion`, toSnakeCase(c)).pipe(
      map((r) => toCamelCase<ConfiguracionInstitucional>(r)),
      tap((x) => this._config.set(x)),
    );
  }

  cargarSedes(forzar = false): Observable<Sede[]> {
    if (!this.sedes$ || forzar) {
      this.sedes$ = this.http.get<unknown>(`${this.url}/catalogos/sedes`, { context: contexto({ sinLoading: true }) }).pipe(
        map((r) => toCamelCase<Sede[]>(r)),
        tap((s) => this._sedes.set(s)),
        shareReplay(1),
      );
    }
    return this.sedes$;
  }

  /** Autocompletar de instituciones educativas (API -> SNIES en producción). */
  buscarInstituciones(q: string): Observable<InstitucionEducativa[]> {
    if (!q || q.trim().length < 2) return of([]);
    const params = new HttpParams().set('q', q.trim());
    return this.http
      .get<unknown>(`${this.url}/catalogos/instituciones`, { params, context: contexto({ sinLoading: true, sinAlerta: true }) })
      .pipe(map((r) => toCamelCase<InstitucionEducativa[]>(r)));
  }

  nombreSede(id: string | null | undefined): string {
    return this._sedes().find((s) => s.id === id)?.nombre ?? (id ?? '');
  }
  nombrePrograma(id: string | null | undefined): string {
    return this.programas.find((p) => p.id === id)?.nombre ?? '';
  }
  nombreRegion(id: string | null | undefined): string {
    return this.regiones.find((r) => r.id === id)?.nombre ?? '';
  }
}
