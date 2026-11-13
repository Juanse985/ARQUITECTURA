import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ActualizarPerfilRequest,
  AuthResponse,
  CambiarPasswordRequest,
  LoginRequest,
  MensajeResponse,
  RegistroRequest,
  Usuario,
} from '../models';
import { toCamelCase, toSnakeCase } from '../utils/case-mapper';
import { TokenStorageService } from './token-storage.service';

/**
 * Autenticación con JWT.
 * - Guarda el token y el usuario actual (signal).
 * - Programa el cierre de sesión automático cuando el token expira.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokens = inject(TokenStorageService);
  private readonly url = `${environment.apiUrl}/auth`;
  private timerExpiracion?: ReturnType<typeof setTimeout>;

  private readonly _usuario = signal<Usuario | null>(null);
  readonly usuario = this._usuario.asReadonly();
  readonly autenticado = computed(() => this._usuario() !== null);
  readonly esAdmin = computed(() => this._usuario()?.rol === 'ADMIN');
  readonly nombreCorto = computed(() => {
    const u = this._usuario();
    return u ? `${u.nombres.split(' ')[0]} ${u.apellidos.split(' ')[0]}` : '';
  });

  /** Se ejecuta al iniciar la app: restaura la sesión si el token sigue vigente. */
  restaurarSesion(): Observable<Usuario | null> | null {
    if (!this.tokens.esValido()) {
      this.tokens.eliminar();
      return null;
    }
    this.programarExpiracion();
    return this.me();
  }

  login(datos: LoginRequest): Observable<Usuario> {
    return this.http.post<unknown>(`${this.url}/login`, toSnakeCase(datos)).pipe(
      map((r) => toCamelCase<AuthResponse>(r)),
      tap((r) => this.iniciarSesion(r)),
      map((r) => r.usuario),
    );
  }

  registrar(datos: RegistroRequest): Observable<Usuario> {
    return this.http.post<unknown>(`${this.url}/register`, toSnakeCase(datos)).pipe(
      map((r) => toCamelCase<AuthResponse>(r)),
      tap((r) => this.iniciarSesion(r)),
      map((r) => r.usuario),
    );
  }

  me(): Observable<Usuario> {
    return this.http.get<unknown>(`${this.url}/me`).pipe(
      map((r) => toCamelCase<Usuario>(r)),
      tap((u) => this._usuario.set(u)),
    );
  }

  actualizarPerfil(datos: ActualizarPerfilRequest): Observable<Usuario> {
    return this.http.put<unknown>(`${this.url}/me`, toSnakeCase(datos)).pipe(
      map((r) => toCamelCase<Usuario>(r)),
      tap((u) => this._usuario.set(u)),
    );
  }

  cambiarPassword(datos: CambiarPasswordRequest): Observable<MensajeResponse> {
    return this.http.put<MensajeResponse>(`${this.url}/me/password`, toSnakeCase(datos));
  }

  recuperarPassword(email: string): Observable<MensajeResponse> {
    return this.http.post<MensajeResponse>(`${this.url}/forgot-password`, { email });
  }

  /** Cierra sesión localmente y redirige al login. */
  logout(motivo?: 'expirada'): void {
    clearTimeout(this.timerExpiracion);
    this.tokens.eliminar();
    this._usuario.set(null);
    void this.router.navigate(['/auth/login'], motivo ? { queryParams: { sesion: motivo } } : {});
  }

  private iniciarSesion(r: AuthResponse): void {
    this.tokens.guardar(r.accessToken);
    this._usuario.set(r.usuario);
    this.programarExpiracion();
  }

  private programarExpiracion(): void {
    clearTimeout(this.timerExpiracion);
    const ms = this.tokens.msParaExpirar();
    // setTimeout admite como máximo ~24.8 días
    this.timerExpiracion = setTimeout(() => this.logout('expirada'), Math.min(ms, 2_000_000_000));
  }
}
