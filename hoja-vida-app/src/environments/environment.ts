/**
 * Configuración de PRODUCCIÓN.
 * Cambie apiUrl por la URL pública de la API FastAPI y deje useMock en false.
 */
export const environment = {
  production: true,
  appName: 'SIGEHV',
  appFullName: 'Sistema de Gestión de Hojas de Vida',
  apiUrl: 'http://localhost:8000/api',
  /** Si es true, las peticiones HTTP son respondidas por el MockBackendInterceptor. */
  useMock: true,
  /** Clave en localStorage para el token JWT. */
  tokenKey: 'sigehv_token',
};
