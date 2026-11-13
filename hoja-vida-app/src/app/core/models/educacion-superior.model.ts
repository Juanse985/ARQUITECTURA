import { AreaConocimiento } from './institucion.model';

export type ModalidadAcademica = 'TC' | 'TL' | 'TE' | 'UN' | 'ES' | 'MG' | 'DOC';

/** 2. FORMACIÓN ACADÉMICA - Educación superior (pregrado y posgrado) */
export interface EducacionSuperior {
  id?: number;
  modalidad: ModalidadAcademica;
  semestresAprobados: number;
  graduado: boolean;
  titulo: string;
  /** Institución educativa (catálogo de IES, GET /api/catalogos/instituciones). */
  institucion: string | null;
  areaConocimiento: AreaConocimiento | null;
  mesTerminacion: number | null;
  anioTerminacion: number | null;
  tarjetaProfesional: string | null;
}
