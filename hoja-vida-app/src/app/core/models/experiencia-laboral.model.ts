export type TipoEntidad = 'PUBLICA' | 'PRIVADA';

/** 3. EXPERIENCIA LABORAL (empleo actual o contrato vigente + anteriores) */
export interface ExperienciaLaboral {
  id?: number;
  empresa: string;
  tipoEntidad: TipoEntidad;
  pais: string;
  departamento: string | null;
  municipio: string | null;
  correoEntidad: string | null;
  telefonos: string | null;
  fechaIngreso: string; // yyyy-MM-dd
  fechaRetiro: string | null; // yyyy-MM-dd
  empleoActual: boolean;
  cargo: string;
  dependencia: string | null;
  direccion: string | null;
}
