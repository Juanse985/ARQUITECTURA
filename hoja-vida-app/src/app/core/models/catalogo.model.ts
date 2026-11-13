/** Opción genérica de catálogo (valor que se guarda + etiqueta que se muestra). */
export interface OpcionCatalogo<T = string> {
  valor: T;
  etiqueta: string;
  descripcion?: string;
}

export interface Departamento {
  codigo: string;
  nombre: string;
}

export interface Municipio {
  codigo: string;
  nombre: string;
  departamento: string;
}
