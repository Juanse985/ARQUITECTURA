/** Información institucional (UNIMINUTO): sedes, programas, vinculación y configuración. */

export type TipoVinculacion = 'DOCENTE' | 'ESTUDIANTE' | 'EGRESADO' | 'ADMINISTRATIVO' | 'EXTERNO';

/** Áreas de conocimiento del Ministerio de Educación Nacional (SNIES). */
export type AreaConocimiento = 'AGRO' | 'ARTES' | 'EDU' | 'SALUD' | 'SOCIALES' | 'ECO' | 'ING' | 'MAT';

export type RegionId =
  | 'BOGOTA'
  | 'ANTIOQUIA_CHOCO'
  | 'CUNDINAMARCA_BOYACA'
  | 'TOLIMA_HUILA'
  | 'SANTANDERES'
  | 'ORINOQUIA_AMAZONIA'
  | 'CENTRO_OCCIDENTE'
  | 'CARIBE'
  | 'VIRTUAL';

export interface Region {
  id: RegionId;
  nombre: string;
}

export interface Sede {
  id: string;
  nombre: string;
  region: RegionId;
  ciudad: string;
  departamento: string; // código DANE
  municipio: string; // código DANE
  lat: number | null;
  lng: number | null;
  activa: boolean;
}

export interface Programa {
  id: string;
  nombre: string;
  nivel: 'TECNOLOGICO' | 'PROFESIONAL' | 'ESPECIALIZACION' | 'MAESTRIA';
  area: AreaConocimiento;
}

export interface InstitucionEducativa {
  nombre: string;
  sigla?: string;
  ciudad?: string;
}

/** Sección propia de la app (no hace parte del Formato Único). */
export interface InformacionInstitucional {
  tipoVinculacion: TipoVinculacion;
  sedeId: string | null;
  programaId: string | null;
  profesion: string | null;
  areaConocimiento: AreaConocimiento | null;
}

/** Configuración que edita el administrador (nombre y logo de la institución). */
export interface ConfiguracionInstitucional {
  nombre: string;
  sigla: string;
  sitioWeb: string | null;
  logoUrl: string | null;
  iaHabilitada: boolean;
  modeloIa: string;
}

export type FormatoArchivo = 'PDF' | 'DOCX' | 'IMAGEN' | 'TEXTO';

/** Hoja de vida original cargada por el usuario en el formato que prefiera. */
export interface ArchivoHojaVida {
  nombre: string;
  tipoMime: string;
  tamano: number;
  formato: FormatoArchivo;
  url: string;
  fechaCarga: string;
  procesadoConIa: boolean;
}
