import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ArchivoResponse,
  DatosPersonales,
  Declaracion,
  EducacionBasica,
  EducacionSuperior,
  ExperienciaLaboral,
  HojaVida,
  HojaVidaPayload,
  Idioma,
  InformacionInstitucional,
  TiempoExperiencia,
} from '../models';
import { contexto } from '../interceptors/http-context.tokens';
import { toCamelCase, toSnakeCase } from '../utils/case-mapper';
import { calcularCompletitud, completitudTotal } from '../utils/completitud';

/** Subrecursos de tipo objeto único (GET/POST/PUT/DELETE sobre la sección). */
export type SeccionUnica = 'datos-personales' | 'educacion-basica' | 'tiempo-experiencia' | 'declaracion' | 'institucional';
/** Subrecursos de tipo lista (GET lista, POST item, PUT/DELETE item). */
export type SeccionLista = 'educacion-superior' | 'idiomas' | 'experiencia';

type TipoSeccionUnica = {
  institucional: InformacionInstitucional;
  'datos-personales': DatosPersonales;
  'educacion-basica': EducacionBasica;
  'tiempo-experiencia': TiempoExperiencia;
  declaracion: Declaracion;
};
type TipoSeccionLista = {
  'educacion-superior': EducacionSuperior;
  idiomas: Idioma;
  experiencia: ExperienciaLaboral;
};

/**
 * CRUD de la hoja de vida del usuario autenticado contra la API REST.
 * Convierte camelCase <-> snake_case en el borde HTTP y mantiene en un
 * signal la hoja de vida actual para que los componentes la consuman.
 */
@Injectable({ providedIn: 'root' })
export class HojaVidaService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/hoja-vida`;

  private readonly _hojaVida = signal<HojaVida | null>(null);
  readonly hojaVida = this._hojaVida.asReadonly();
  readonly completitud = computed(() => calcularCompletitud(this._hojaVida()));
  readonly porcentajeTotal = computed(() => completitudTotal(this.completitud()));

  // ---------------------------------------------------------------- Hoja de vida
  /** GET /api/hoja-vida -> hoja de vida del usuario o null si aún no la ha creado (404). */
  obtener(): Observable<HojaVida | null> {
    return this.http.get<unknown>(this.url, { context: contexto({ sinAlerta: true }) }).pipe(
      map((r) => toCamelCase<HojaVida>(r)),
      tap((hv) => this._hojaVida.set(hv)),
      catchError((e: HttpErrorResponse) => {
        if (e.status === 404) {
          this._hojaVida.set(null);
          return of(null);
        }
        return throwError(() => e);
      }),
    );
  }

  crear(payload: HojaVidaPayload, silencioso = false): Observable<HojaVida> {
    return this.http
      .post<unknown>(this.url, toSnakeCase(payload), { context: contexto({ sinLoading: silencioso }) })
      .pipe(map((r) => toCamelCase<HojaVida>(r)), tap((hv) => this._hojaVida.set(hv)));
  }

  actualizar(id: number, payload: HojaVidaPayload, silencioso = false): Observable<HojaVida> {
    return this.http
      .put<unknown>(`${this.url}/${id}`, toSnakeCase(payload), { context: contexto({ sinLoading: silencioso }) })
      .pipe(map((r) => toCamelCase<HojaVida>(r)), tap((hv) => this._hojaVida.set(hv)));
  }

  /** Crea o actualiza según exista o no la hoja de vida. */
  guardar(payload: HojaVidaPayload, silencioso = false): Observable<HojaVida> {
    const actual = this._hojaVida();
    return actual ? this.actualizar(actual.id, payload, silencioso) : this.crear(payload, silencioso);
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`).pipe(tap(() => this._hojaVida.set(null)));
  }

  // ---------------------------------------------------------------- Secciones únicas
  obtenerSeccion<K extends SeccionUnica>(id: number, seccion: K): Observable<TipoSeccionUnica[K]> {
    return this.http.get<unknown>(`${this.url}/${id}/${seccion}`).pipe(map((r) => toCamelCase<TipoSeccionUnica[K]>(r)));
  }

  guardarSeccion<K extends SeccionUnica>(id: number, seccion: K, datos: TipoSeccionUnica[K]): Observable<TipoSeccionUnica[K]> {
    return this.http
      .put<unknown>(`${this.url}/${id}/${seccion}`, toSnakeCase(datos))
      .pipe(map((r) => toCamelCase<TipoSeccionUnica[K]>(r)), tap(() => this.refrescar()));
  }

  eliminarSeccion(id: number, seccion: SeccionUnica): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}/${seccion}`).pipe(tap(() => this.refrescar()));
  }

  // ---------------------------------------------------------------- Secciones lista
  listar<K extends SeccionLista>(id: number, seccion: K): Observable<TipoSeccionLista[K][]> {
    return this.http.get<unknown>(`${this.url}/${id}/${seccion}`).pipe(map((r) => toCamelCase<TipoSeccionLista[K][]>(r)));
  }

  agregarItem<K extends SeccionLista>(id: number, seccion: K, item: TipoSeccionLista[K]): Observable<TipoSeccionLista[K]> {
    return this.http
      .post<unknown>(`${this.url}/${id}/${seccion}`, toSnakeCase(item))
      .pipe(map((r) => toCamelCase<TipoSeccionLista[K]>(r)), tap(() => this.refrescar()));
  }

  actualizarItem<K extends SeccionLista>(id: number, seccion: K, itemId: number, item: TipoSeccionLista[K]): Observable<TipoSeccionLista[K]> {
    return this.http
      .put<unknown>(`${this.url}/${id}/${seccion}/${itemId}`, toSnakeCase(item))
      .pipe(map((r) => toCamelCase<TipoSeccionLista[K]>(r)), tap(() => this.refrescar()));
  }

  eliminarItem(id: number, seccion: SeccionLista, itemId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}/${seccion}/${itemId}`).pipe(tap(() => this.refrescar()));
  }

  // ---------------------------------------------------------------- Archivos (multipart)
  subirFoto(id: number, archivo: Blob, nombre = 'foto.png'): Observable<ArchivoResponse> {
    const fd = new FormData();
    fd.append('archivo', archivo, nombre);
    return this.http.post<ArchivoResponse>(`${this.url}/${id}/foto`, fd);
  }

  subirFirma(id: number, archivo: Blob, nombre = 'firma.png'): Observable<ArchivoResponse> {
    const fd = new FormData();
    fd.append('archivo', archivo, nombre);
    return this.http.post<ArchivoResponse>(`${this.url}/${id}/firma`, fd);
  }

  /** Hoja de vida original en el formato que el usuario prefiera (PDF, DOCX, imagen, texto). */
  subirArchivoOriginal(id: number, archivo: File, procesadoConIa: boolean): Observable<ArchivoResponse> {
    const fd = new FormData();
    fd.append('archivo', archivo, archivo.name);
    fd.append('procesado_con_ia', String(procesadoConIa));
    return this.http.post<ArchivoResponse>(`${this.url}/${id}/archivo-original`, fd).pipe(tap(() => this.refrescar()));
  }

  eliminarArchivoOriginal(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}/archivo-original`).pipe(tap(() => this.refrescar()));
  }

  /** Limpia el estado local (al cerrar sesión). */
  limpiar(): void {
    this._hojaVida.set(null);
  }

  private refrescar(): void {
    this.obtener().subscribe();
  }
}
