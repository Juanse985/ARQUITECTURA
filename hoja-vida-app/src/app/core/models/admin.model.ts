import { AreaConocimiento, FormatoArchivo, RegionId, TipoVinculacion } from './institucion.model';
import { EstadoHojaVida, OrigenHojaVida } from './hoja-vida.model';
import { RolUsuario } from './usuario.model';

/** Filtros del panel de administración (sede, región, departamento, tipo de vinculación). */
export interface FiltroEstadisticas {
  region?: RegionId | null;
  departamento?: string | null;
  sedeId?: string | null;
  tipoVinculacion?: TipoVinculacion | null;
}

export interface Conteo<T = string> {
  clave: T;
  etiqueta: string;
  total: number;
}

export interface EstadisticaSede {
  sedeId: string;
  nombre: string;
  region: RegionId;
  departamento: string;
  ciudad: string;
  lat: number | null;
  lng: number | null;
  totalHv: number;
  docentes: number;
  docentesAlineados: number;
  estudiantes: number;
}

export interface AlineacionPrograma {
  programaId: string;
  programa: string;
  docentes: number;
  alineados: number;
}

export interface Estadisticas {
  totalUsuarios: number;
  totalHv: number;
  completas: number;
  borradores: number;
  importadasIa: number;
  conArchivoOriginal: number;
  experienciaPromedioAnios: number;
  docentes: number;
  docentesAlineados: number;
  porTipoVinculacion: Conteo<TipoVinculacion>[];
  porNivelFormacion: Conteo[];
  porAreaConocimiento: Conteo<AreaConocimiento>[];
  topProfesiones: Conteo[];
  idiomas: Conteo[];
  porFormatoArchivo: Conteo<FormatoArchivo | 'FORMULARIO'>[];
  rangosExperiencia: Conteo[];
  porSede: EstadisticaSede[];
  porDepartamento: Conteo[];
  porRegion: Conteo<RegionId>[];
  alineacionPorPrograma: AlineacionPrograma[];
  registrosPorMes: Conteo[];
}

/** Fila del listado de hojas de vida para el administrador (datos mínimos). */
export interface ResumenHojaVida {
  id: number;
  usuarioId: number;
  nombreCompleto: string;
  documento: string;
  email: string;
  tipoVinculacion: TipoVinculacion | null;
  sedeId: string | null;
  programaId: string | null;
  profesion: string | null;
  nivelMaximo: string;
  experienciaAnios: number;
  estado: EstadoHojaVida;
  origen: OrigenHojaVida;
  formatoArchivo: FormatoArchivo | null;
  alineado: boolean | null;
  fechaActualizacion: string;
}

export interface Pagina<T> {
  items: T[];
  total: number;
  pagina: number;
  tamano: number;
}

export interface UsuarioAdmin {
  id: number;
  nombres: string;
  apellidos: string;
  email: string;
  rol: RolUsuario;
  activo: boolean;
  fechaRegistro: string;
  ultimoAcceso: string | null;
  tieneHojaVida: boolean;
}

export interface RegistroAuditoria {
  id: number;
  fecha: string;
  usuarioId: number | null;
  email: string | null;
  accion: string;
  detalle: string;
  resultado: 'OK' | 'FALLO';
}
