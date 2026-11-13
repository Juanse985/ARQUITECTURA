import { DatosPersonales } from './datos-personales.model';
import { EducacionBasica } from './educacion-basica.model';
import { EducacionSuperior } from './educacion-superior.model';
import { Idioma } from './idioma.model';
import { ExperienciaLaboral } from './experiencia-laboral.model';
import { TiempoExperiencia } from './tiempo-experiencia.model';
import { Declaracion, ObservacionesRrhh } from './declaracion.model';
import { ArchivoHojaVida, InformacionInstitucional } from './institucion.model';

export type EstadoHojaVida = 'BORRADOR' | 'COMPLETA';
export type OrigenHojaVida = 'FORMULARIO' | 'IMPORTADA_IA';

/** Agregado raíz: la hoja de vida de un usuario (Formato Único Persona Natural). */
export interface HojaVida {
  id: number;
  usuarioId: number;
  estado: EstadoHojaVida;
  origen: OrigenHojaVida;
  institucional: InformacionInstitucional | null;
  datosPersonales: DatosPersonales | null;
  educacionBasica: EducacionBasica | null;
  educacionSuperior: EducacionSuperior[];
  idiomas: Idioma[];
  experienciaLaboral: ExperienciaLaboral[];
  tiempoExperiencia: TiempoExperiencia | null;
  declaracion: Declaracion | null;
  observacionesRrhh: ObservacionesRrhh | null;
  archivoOriginal: ArchivoHojaVida | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/** Cuerpo para crear/actualizar la hoja de vida completa. */
export type HojaVidaPayload = Omit<HojaVida, 'id' | 'usuarioId' | 'fechaCreacion' | 'fechaActualizacion' | 'observacionesRrhh' | 'archivoOriginal'>;

/** Clave de cada sección (se usa para completitud y navegación). */
export type SeccionHojaVida =
  | 'datosPersonales'
  | 'formacionAcademica'
  | 'experienciaLaboral'
  | 'tiempoExperiencia'
  | 'declaracion';
