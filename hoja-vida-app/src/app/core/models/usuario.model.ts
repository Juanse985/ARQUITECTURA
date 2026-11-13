export type RolUsuario = 'USUARIO' | 'ADMIN';

export interface Usuario {
  id: number;
  rol: RolUsuario;
  activo: boolean;
  nombres: string;
  apellidos: string;
  email: string;
  fechaRegistro: string; // ISO 8601
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegistroRequest {
  nombres: string;
  apellidos: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  tokenType: 'bearer';
  expiresIn: number; // segundos
  usuario: Usuario;
}

export interface ActualizarPerfilRequest {
  nombres: string;
  apellidos: string;
  email: string;
}

export interface CambiarPasswordRequest {
  passwordActual: string;
  passwordNueva: string;
}
