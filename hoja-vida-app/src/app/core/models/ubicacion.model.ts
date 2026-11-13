/**
 * Ubicación geográfica. Para Colombia, departamento y municipio guardan el
 * código DANE; para otros países se guardan como texto libre.
 */
export interface Ubicacion {
  pais: string;
  departamento: string | null;
  municipio: string | null;
}
