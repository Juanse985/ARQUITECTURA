/**
 * Configuración de DESARROLLO (ng serve).
 * Mientras no exista el backend en Python, useMock = true.
 * Para conectar FastAPI: useMock = false y apiUrl = 'http://localhost:8000/api'.
 */
export const environment = {
  production: false,
  appName: 'SIGEHV',
  appFullName: 'Sistema de Gestión de Hojas de Vida',
  apiUrl: 'http://localhost:8000/api',
  useMock: true,
  tokenKey: 'sigehv_token',
};
