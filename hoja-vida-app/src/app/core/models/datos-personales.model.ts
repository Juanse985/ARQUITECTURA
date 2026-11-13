import { Ubicacion } from './ubicacion.model';

export type TipoDocumento = 'CC' | 'CE' | 'PAS';
export type Sexo = 'F' | 'M';
export type Nacionalidad = 'COL' | 'EXT';
export type ClaseLibreta = 'PRIMERA' | 'SEGUNDA';

export interface LibretaMilitar {
  clase: ClaseLibreta | null;
  numero: string | null;
  distritoMilitar: string | null;
}

/** 1. DATOS PERSONALES */
export interface DatosPersonales {
  primerApellido: string;
  segundoApellido: string | null;
  nombres: string;
  tipoDocumento: TipoDocumento;
  numeroDocumento: string;
  sexo: Sexo;
  nacionalidad: Nacionalidad;
  paisNacionalidad: string | null;
  libretaMilitar: LibretaMilitar;
  fechaNacimiento: string; // yyyy-MM-dd
  lugarNacimiento: Ubicacion;
  direccionCorrespondencia: string;
  ubicacionCorrespondencia: Ubicacion;
  telefono: string;
  email: string;
  fotoUrl: string | null;
}
