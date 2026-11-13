import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Estadisticas, FiltroEstadisticas, HojaVida, Pagina, RegistroAuditoria, ResumenHojaVida, RolUsuario, Sede, UsuarioAdmin } from '../models';
import { toCamelCase, toSnakeCase } from '../utils/case-mapper';

/** Endpoints del rol ADMIN (/api/admin/*). La API vuelve a validar el rol en cada petición. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/admin`;

  private params(f: FiltroEstadisticas, extra: Record<string, string | number | null | undefined> = {}): HttpParams {
    let p = new HttpParams();
    const todo = { region: f.region, departamento: f.departamento, sede_id: f.sedeId, tipo_vinculacion: f.tipoVinculacion, ...extra };
    for (const [k, v] of Object.entries(todo)) if (v !== null && v !== undefined && v !== '') p = p.set(k, String(v));
    return p;
  }

  estadisticas(f: FiltroEstadisticas): Observable<Estadisticas> {
    return this.http.get<unknown>(`${this.url}/estadisticas`, { params: this.params(f) }).pipe(map((r) => toCamelCase<Estadisticas>(r)));
  }

  hojasVida(f: FiltroEstadisticas, q: string, estado: string | null, pagina: number, tamano: number): Observable<Pagina<ResumenHojaVida>> {
    return this.http
      .get<unknown>(`${this.url}/hojas-vida`, { params: this.params(f, { q, estado, pagina, tamano }) })
      .pipe(map((r) => toCamelCase<Pagina<ResumenHojaVida>>(r)));
  }

  hojaVida(id: number): Observable<HojaVida> {
    return this.http.get<unknown>(`${this.url}/hojas-vida/${id}`).pipe(map((r) => toCamelCase<HojaVida>(r)));
  }

  usuarios(): Observable<UsuarioAdmin[]> {
    return this.http.get<unknown>(`${this.url}/usuarios`).pipe(map((r) => toCamelCase<UsuarioAdmin[]>(r)));
  }

  actualizarUsuario(id: number, cambios: { rol: RolUsuario; activo: boolean }): Observable<unknown> {
    return this.http.put(`${this.url}/usuarios/${id}`, toSnakeCase(cambios));
  }

  sedes(): Observable<Sede[]> {
    return this.http.get<unknown>(`${this.url}/sedes`).pipe(map((r) => toCamelCase<Sede[]>(r)));
  }
  crearSede(s: Sede): Observable<Sede> {
    return this.http.post<unknown>(`${this.url}/sedes`, toSnakeCase(s)).pipe(map((r) => toCamelCase<Sede>(r)));
  }
  actualizarSede(s: Sede): Observable<Sede> {
    return this.http.put<unknown>(`${this.url}/sedes/${s.id}`, toSnakeCase(s)).pipe(map((r) => toCamelCase<Sede>(r)));
  }
  eliminarSede(id: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/sedes/${id}`);
  }

  auditoria(pagina: number, tamano: number): Observable<Pagina<RegistroAuditoria>> {
    const params = new HttpParams().set('pagina', pagina).set('tamano', tamano);
    return this.http.get<unknown>(`${this.url}/auditoria`, { params }).pipe(map((r) => toCamelCase<Pagina<RegistroAuditoria>>(r)));
  }
}
