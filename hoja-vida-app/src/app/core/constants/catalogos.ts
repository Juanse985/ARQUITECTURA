/**
 * Catálogos del Formato Único de Hoja de Vida - Persona Natural
 * (Ley 190 de 1995, Leyes 489 y 443 de 1998).
 * Nunca se escriben opciones directamente en el HTML: los componentes
 * leen estas constantes a través de CatalogosService.
 */
import { OpcionCatalogo } from '../models/catalogo.model';
import { ClaseLibreta, Nacionalidad, Sexo, TipoDocumento } from '../models/datos-personales.model';
import { ModalidadAcademica } from '../models/educacion-superior.model';
import { NivelIdioma } from '../models/idioma.model';
import { TipoEntidad } from '../models/experiencia-laboral.model';

export const PAIS_COLOMBIA = 'Colombia';

export const TIPOS_DOCUMENTO: OpcionCatalogo<TipoDocumento>[] = [
  { valor: 'CC', etiqueta: 'C.C.', descripcion: 'Cédula de ciudadanía' },
  { valor: 'CE', etiqueta: 'C.E.', descripcion: 'Cédula de extranjería' },
  { valor: 'PAS', etiqueta: 'PAS', descripcion: 'Pasaporte' },
];

export const SEXOS: OpcionCatalogo<Sexo>[] = [
  { valor: 'F', etiqueta: 'F', descripcion: 'Femenino' },
  { valor: 'M', etiqueta: 'M', descripcion: 'Masculino' },
];

export const NACIONALIDADES: OpcionCatalogo<Nacionalidad>[] = [
  { valor: 'COL', etiqueta: 'Colombiano' },
  { valor: 'EXT', etiqueta: 'Extranjero' },
];

export const CLASES_LIBRETA: OpcionCatalogo<ClaseLibreta>[] = [
  { valor: 'PRIMERA', etiqueta: 'Primera clase' },
  { valor: 'SEGUNDA', etiqueta: 'Segunda clase' },
];

export interface GrupoGrados {
  nombre: string;
  grados: OpcionCatalogo<number>[];
}

/** Educación básica y media: último grado aprobado (1º a 11º). */
export const GRUPOS_GRADOS: GrupoGrados[] = [
  {
    nombre: 'Primaria',
    grados: [1, 2, 3, 4, 5].map((g) => ({ valor: g, etiqueta: `${g}º` })),
  },
  {
    nombre: 'Secundaria',
    grados: [6, 7, 8, 9].map((g) => ({ valor: g, etiqueta: `${g}º` })),
  },
  {
    nombre: 'Media',
    grados: [10, 11].map((g) => ({ valor: g, etiqueta: `${g}º` })),
  },
];

export const MODALIDADES_ACADEMICAS: OpcionCatalogo<ModalidadAcademica>[] = [
  { valor: 'TC', etiqueta: 'TC', descripcion: 'Técnica' },
  { valor: 'TL', etiqueta: 'TL', descripcion: 'Tecnológica' },
  { valor: 'TE', etiqueta: 'TE', descripcion: 'Tecnológica especializada' },
  { valor: 'UN', etiqueta: 'UN', descripcion: 'Universitaria' },
  { valor: 'ES', etiqueta: 'ES', descripcion: 'Especialización' },
  { valor: 'MG', etiqueta: 'MG', descripcion: 'Maestría o magíster' },
  { valor: 'DOC', etiqueta: 'DOC', descripcion: 'Doctorado o PhD' },
];

export const NIVELES_IDIOMA: OpcionCatalogo<NivelIdioma>[] = [
  { valor: 'R', etiqueta: 'R', descripcion: 'Regular' },
  { valor: 'B', etiqueta: 'B', descripcion: 'Bien' },
  { valor: 'MB', etiqueta: 'MB', descripcion: 'Muy bien' },
];

export const TIPOS_ENTIDAD: OpcionCatalogo<TipoEntidad>[] = [
  { valor: 'PUBLICA', etiqueta: 'Pública' },
  { valor: 'PRIVADA', etiqueta: 'Privada' },
];

export const OPCIONES_SI_NO: OpcionCatalogo<boolean>[] = [
  { valor: true, etiqueta: 'Sí' },
  { valor: false, etiqueta: 'No' },
];

export const OPCIONES_INHABILIDAD: OpcionCatalogo<'SI' | 'NO'>[] = [
  { valor: 'SI', etiqueta: 'Sí' },
  { valor: 'NO', etiqueta: 'No' },
];

export const MESES: OpcionCatalogo<number>[] = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
].map((m, i) => ({ valor: i + 1, etiqueta: m }));

export const IDIOMAS_SUGERIDOS: string[] = [
  'Inglés', 'Francés', 'Portugués', 'Alemán', 'Italiano', 'Mandarín',
  'Japonés', 'Coreano', 'Ruso', 'Árabe', 'Lengua de señas colombiana', 'Wayuunaiki',
];

export const PAISES: string[] = [
  'Colombia', 'Alemania', 'Argentina', 'Bolivia', 'Brasil', 'Canadá', 'Chile', 'China',
  'Costa Rica', 'Cuba', 'Ecuador', 'El Salvador', 'España', 'Estados Unidos', 'Francia',
  'Guatemala', 'Honduras', 'Italia', 'Japón', 'México', 'Nicaragua', 'Panamá', 'Paraguay',
  'Perú', 'Portugal', 'Puerto Rico', 'Reino Unido', 'República Dominicana', 'Uruguay',
  'Venezuela', 'Otro',
];

/** Texto oficial de la declaración bajo la gravedad del juramento. */
export const TEXTO_DECLARACION_INHABILIDAD =
  'Me encuentro dentro de las causales de inhabilidad e incompatibilidad del orden constitucional o legal ' +
  'para ejercer cargos empleos públicos o para celebrar contratos de prestación de servicios con la ' +
  'administración pública.';

export const TEXTO_CERTIFICACION =
  'Para todos los efectos legales, certifico que los datos por mí anotados en el presente formato único ' +
  'de hoja de vida, son veraces (artículo 5º de la Ley 190 de 1995).';

export const TEXTO_TRATAMIENTO_DATOS =
  'Autorizo de manera libre, previa, expresa e informada el tratamiento de mis datos personales ' +
  'conforme a la Ley 1581 de 2012 y sus decretos reglamentarios.';

export const TEXTO_CERTIFICACION_RRHH =
  'Certifico que la información aquí suministrada ha sido constatada frente a los documentos que han ' +
  'sido presentados como soporte.';
