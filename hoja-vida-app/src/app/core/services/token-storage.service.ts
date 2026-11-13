import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

interface JwtPayload {
  sub: string;
  exp: number; // segundos epoch
  [k: string]: unknown;
}

/** Guarda y lee el token JWT del almacenamiento local y decodifica su expiración. */
@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private readonly key = environment.tokenKey;

  guardar(token: string): void {
    localStorage.setItem(this.key, token);
  }

  obtener(): string | null {
    return localStorage.getItem(this.key);
  }

  eliminar(): void {
    localStorage.removeItem(this.key);
  }

  decodificar(token: string | null = this.obtener()): JwtPayload | null {
    if (!token) return null;
    try {
      const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const json = decodeURIComponent(
        atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join(''),
      );
      return JSON.parse(json) as JwtPayload;
    } catch {
      return null;
    }
  }

  /** Milisegundos que faltan para que expire el token (0 si ya expiró o no existe). */
  msParaExpirar(token: string | null = this.obtener()): number {
    const p = this.decodificar(token);
    if (!p?.exp) return 0;
    return Math.max(0, p.exp * 1000 - Date.now());
  }

  esValido(token: string | null = this.obtener()): boolean {
    return this.msParaExpirar(token) > 0;
  }
}
