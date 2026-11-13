/**
 * Catálogos institucionales de UNIMINUTO.
 *
 * - Sedes y regiones: tomadas del portal uniminuto.edu (bibliotecas por sede y
 *   cobertura Centro Occidente, nov. 2026). Las coordenadas son las del centro
 *   de cada ciudad (aproximadas). El administrador puede crear/editar sedes.
 * - Programas: catálogo de EJEMPLO para el prototipo; reemplácelo por la oferta
 *   oficial vigente (o sírvalo desde la API).
 * - Áreas de conocimiento: clasificación del SNIES (Ministerio de Educación).
 * - Instituciones: lista base de IES colombianas; en producción la API puede
 *   sincronizarla con el SNIES (GET /api/catalogos/instituciones?q=).
 */
import { AreaConocimiento, ConfiguracionInstitucional, InstitucionEducativa, Programa, Region, Sede, TipoVinculacion } from '../models/institucion.model';
import { OpcionCatalogo } from '../models/catalogo.model';

export const CONFIGURACION_INSTITUCIONAL_DEFECTO: ConfiguracionInstitucional = {
  nombre: 'Corporación Universitaria Minuto de Dios',
  sigla: 'UNIMINUTO',
  sitioWeb: 'https://www.uniminuto.edu',
  logoUrl: null, // lo carga el administrador (archivo autorizado)
  iaHabilitada: true,
  modeloIa: 'gemini-3.8-flash',
};

export const REGIONES: Region[] = [
  { id: 'BOGOTA', nombre: 'Bogotá' },
  { id: 'ANTIOQUIA_CHOCO', nombre: 'Antioquia - Chocó' },
  { id: 'CUNDINAMARCA_BOYACA', nombre: 'Cundinamarca - Boyacá' },
  { id: 'TOLIMA_HUILA', nombre: 'Tolima - Huila' },
  { id: 'SANTANDERES', nombre: 'Santanderes' },
  { id: 'ORINOQUIA_AMAZONIA', nombre: 'Orinoquía - Amazonía' },
  { id: 'CENTRO_OCCIDENTE', nombre: 'Centro Occidente' },
  { id: 'CARIBE', nombre: 'Caribe' },
  { id: 'VIRTUAL', nombre: 'UNIMINUTO Virtual' },
];

export const SEDES_DEFECTO: Sede[] = [
  { id: 'BOG-PRE', nombre: 'Bogotá Presencial (Minuto de Dios)', region: 'BOGOTA', ciudad: 'Bogotá D.C.', departamento: '11', municipio: '11001', lat: 4.696, lng: -74.087, activa: true },
  { id: 'BOG-SCA', nombre: 'Bogotá San Camilo', region: 'BOGOTA', ciudad: 'Bogotá D.C.', departamento: '11', municipio: '11001', lat: 4.588, lng: -74.084, activa: true },
  { id: 'ANT-BEL', nombre: 'Bello', region: 'ANTIOQUIA_CHOCO', ciudad: 'Bello', departamento: '05', municipio: '05088', lat: 6.337, lng: -75.558, activa: true },
  { id: 'ANT-ABS', nombre: 'Aburrá Sur (Itagüí)', region: 'ANTIOQUIA_CHOCO', ciudad: 'Itagüí', departamento: '05', municipio: '05360', lat: 6.184, lng: -75.599, activa: true },
  { id: 'ANT-URA', nombre: 'Urabá (Apartadó)', region: 'ANTIOQUIA_CHOCO', ciudad: 'Apartadó', departamento: '05', municipio: '05045', lat: 7.883, lng: -76.626, activa: true },
  { id: 'CUN-SOA', nombre: 'Soacha', region: 'CUNDINAMARCA_BOYACA', ciudad: 'Soacha', departamento: '25', municipio: '25754', lat: 4.579, lng: -74.217, activa: true },
  { id: 'CUN-GIR', nombre: 'Girardot', region: 'CUNDINAMARCA_BOYACA', ciudad: 'Girardot', departamento: '25', municipio: '25307', lat: 4.303, lng: -74.804, activa: true },
  { id: 'CUN-MAD', nombre: 'Madrid', region: 'CUNDINAMARCA_BOYACA', ciudad: 'Madrid', departamento: '25', municipio: '25430', lat: 4.733, lng: -74.264, activa: true },
  { id: 'CUN-ZIP', nombre: 'Zipaquirá', region: 'CUNDINAMARCA_BOYACA', ciudad: 'Zipaquirá', departamento: '25', municipio: '25899', lat: 5.022, lng: -74.004, activa: true },
  { id: 'TOL-IBA', nombre: 'Ibagué (Sede Quinta)', region: 'TOLIMA_HUILA', ciudad: 'Ibagué', departamento: '73', municipio: '73001', lat: 4.438, lng: -75.232, activa: true },
  { id: 'TOL-LER', nombre: 'Lérida', region: 'TOLIMA_HUILA', ciudad: 'Lérida', departamento: '73', municipio: '73408', lat: 4.862, lng: -74.91, activa: true },
  { id: 'HUI-NEI', nombre: 'Neiva', region: 'TOLIMA_HUILA', ciudad: 'Neiva', departamento: '41', municipio: '41001', lat: 2.927, lng: -75.282, activa: true },
  { id: 'SAN-BUC', nombre: 'Bucaramanga', region: 'SANTANDERES', ciudad: 'Bucaramanga', departamento: '68', municipio: '68001', lat: 7.119, lng: -73.123, activa: true },
  { id: 'NSA-CUC', nombre: 'Cúcuta', region: 'SANTANDERES', ciudad: 'Cúcuta', departamento: '54', municipio: '54001', lat: 7.894, lng: -72.508, activa: true },
  { id: 'MET-VIL', nombre: 'Villavicencio', region: 'ORINOQUIA_AMAZONIA', ciudad: 'Villavicencio', departamento: '50', municipio: '50001', lat: 4.142, lng: -73.627, activa: true },
  { id: 'VAL-CAL', nombre: 'Cali', region: 'CENTRO_OCCIDENTE', ciudad: 'Cali', departamento: '76', municipio: '76001', lat: 3.452, lng: -76.532, activa: true },
  { id: 'VAL-BUG', nombre: 'Buga', region: 'CENTRO_OCCIDENTE', ciudad: 'Buga', departamento: '76', municipio: '76111', lat: 3.901, lng: -76.297, activa: true },
  { id: 'VAL-BUE', nombre: 'Buenaventura', region: 'CENTRO_OCCIDENTE', ciudad: 'Buenaventura', departamento: '76', municipio: '76109', lat: 3.882, lng: -77.031, activa: true },
  { id: 'NAR-PAS', nombre: 'Pasto', region: 'CENTRO_OCCIDENTE', ciudad: 'Pasto', departamento: '52', municipio: '52001', lat: 1.214, lng: -77.281, activa: true },
  { id: 'RIS-PER', nombre: 'Pereira', region: 'CENTRO_OCCIDENTE', ciudad: 'Pereira', departamento: '66', municipio: '66001', lat: 4.813, lng: -75.696, activa: true },
  { id: 'CAL-CHI', nombre: 'Chinchiná', region: 'CENTRO_OCCIDENTE', ciudad: 'Chinchiná', departamento: '17', municipio: '17174', lat: 4.983, lng: -75.607, activa: true },
  { id: 'ATL-BAQ', nombre: 'Barranquilla', region: 'CARIBE', ciudad: 'Barranquilla', departamento: '08', municipio: '08001', lat: 10.964, lng: -74.796, activa: true },
  { id: 'BOL-CTG', nombre: 'Cartagena', region: 'CARIBE', ciudad: 'Cartagena', departamento: '13', municipio: '13001', lat: 10.391, lng: -75.479, activa: true },
  { id: 'MAG-SMR', nombre: 'Santa Marta', region: 'CARIBE', ciudad: 'Santa Marta', departamento: '47', municipio: '47001', lat: 11.241, lng: -74.199, activa: true },
  { id: 'VIRTUAL', nombre: 'UNIMINUTO Virtual', region: 'VIRTUAL', ciudad: 'Virtual (nacional)', departamento: '11', municipio: '11001', lat: null, lng: null, activa: true },
];

export const AREAS_CONOCIMIENTO: OpcionCatalogo<AreaConocimiento>[] = [
  { valor: 'AGRO', etiqueta: 'Agronomía, veterinaria y afines' },
  { valor: 'ARTES', etiqueta: 'Bellas artes' },
  { valor: 'EDU', etiqueta: 'Ciencias de la educación' },
  { valor: 'SALUD', etiqueta: 'Ciencias de la salud' },
  { valor: 'SOCIALES', etiqueta: 'Ciencias sociales y humanas' },
  { valor: 'ECO', etiqueta: 'Economía, administración, contaduría y afines' },
  { valor: 'ING', etiqueta: 'Ingeniería, arquitectura, urbanismo y afines' },
  { valor: 'MAT', etiqueta: 'Matemáticas y ciencias naturales' },
];

export const TIPOS_VINCULACION: OpcionCatalogo<TipoVinculacion>[] = [
  { valor: 'DOCENTE', etiqueta: 'Docente / profesor' },
  { valor: 'ESTUDIANTE', etiqueta: 'Estudiante' },
  { valor: 'EGRESADO', etiqueta: 'Egresado' },
  { valor: 'ADMINISTRATIVO', etiqueta: 'Administrativo' },
  { valor: 'EXTERNO', etiqueta: 'Aspirante externo' },
];

/** Catálogo de EJEMPLO (prototipo). */
export const PROGRAMAS: Programa[] = [
  { id: 'ING-SIS', nombre: 'Ingeniería de Sistemas', nivel: 'PROFESIONAL', area: 'ING' },
  { id: 'ING-CIV', nombre: 'Ingeniería Civil', nivel: 'PROFESIONAL', area: 'ING' },
  { id: 'ING-IND', nombre: 'Ingeniería Industrial', nivel: 'PROFESIONAL', area: 'ING' },
  { id: 'ING-AGR', nombre: 'Ingeniería Agroecológica', nivel: 'PROFESIONAL', area: 'AGRO' },
  { id: 'TEC-SOF', nombre: 'Tecnología en Desarrollo de Software', nivel: 'TECNOLOGICO', area: 'ING' },
  { id: 'TEC-LOG', nombre: 'Tecnología en Logística', nivel: 'TECNOLOGICO', area: 'ECO' },
  { id: 'ADM-EMP', nombre: 'Administración de Empresas', nivel: 'PROFESIONAL', area: 'ECO' },
  { id: 'ADM-SST', nombre: 'Administración en Seguridad y Salud en el Trabajo', nivel: 'PROFESIONAL', area: 'ECO' },
  { id: 'CON-PUB', nombre: 'Contaduría Pública', nivel: 'PROFESIONAL', area: 'ECO' },
  { id: 'ECO-ECO', nombre: 'Economía', nivel: 'PROFESIONAL', area: 'ECO' },
  { id: 'PSI-PSI', nombre: 'Psicología', nivel: 'PROFESIONAL', area: 'SOCIALES' },
  { id: 'TSO-TSO', nombre: 'Trabajo Social', nivel: 'PROFESIONAL', area: 'SOCIALES' },
  { id: 'COM-SOC', nombre: 'Comunicación Social - Periodismo', nivel: 'PROFESIONAL', area: 'SOCIALES' },
  { id: 'DER-DER', nombre: 'Derecho', nivel: 'PROFESIONAL', area: 'SOCIALES' },
  { id: 'LIC-INF', nombre: 'Licenciatura en Educación Infantil', nivel: 'PROFESIONAL', area: 'EDU' },
  { id: 'LIC-EFI', nombre: 'Licenciatura en Educación Física, Recreación y Deportes', nivel: 'PROFESIONAL', area: 'EDU' },
  { id: 'LIC-HUM', nombre: 'Licenciatura en Humanidades y Lengua Castellana', nivel: 'PROFESIONAL', area: 'EDU' },
  { id: 'LIC-ING', nombre: 'Licenciatura en Lenguas Extranjeras con énfasis en Inglés', nivel: 'PROFESIONAL', area: 'EDU' },
  { id: 'ENF-ENF', nombre: 'Enfermería', nivel: 'PROFESIONAL', area: 'SALUD' },
  { id: 'ART-MUS', nombre: 'Estudios Musicales', nivel: 'PROFESIONAL', area: 'ARTES' },
  { id: 'ESP-GPR', nombre: 'Especialización en Gerencia de Proyectos', nivel: 'ESPECIALIZACION', area: 'ECO' },
  { id: 'MAE-EDU', nombre: 'Maestría en Educación', nivel: 'MAESTRIA', area: 'EDU' },
];

/** Lista base de IES colombianas (se complementa desde la API). */
export const INSTITUCIONES_EDUCATIVAS: InstitucionEducativa[] = [
  { nombre: 'Corporación Universitaria Minuto de Dios', sigla: 'UNIMINUTO' },
  { nombre: 'Servicio Nacional de Aprendizaje', sigla: 'SENA' },
  { nombre: 'Universidad Nacional de Colombia', sigla: 'UNAL' },
  { nombre: 'Universidad de los Andes', sigla: 'Uniandes' },
  { nombre: 'Pontificia Universidad Javeriana', sigla: 'PUJ' },
  { nombre: 'Universidad de Antioquia', sigla: 'UdeA' },
  { nombre: 'Universidad del Valle', sigla: 'Univalle' },
  { nombre: 'Universidad Industrial de Santander', sigla: 'UIS' },
  { nombre: 'Universidad Pedagógica Nacional', sigla: 'UPN' },
  { nombre: 'Universidad Distrital Francisco José de Caldas', sigla: 'UDFJC' },
  { nombre: 'Universidad del Rosario' },
  { nombre: 'Universidad Externado de Colombia' },
  { nombre: 'Universidad de La Sabana' },
  { nombre: 'Universidad EAFIT' },
  { nombre: 'Universidad Pontificia Bolivariana', sigla: 'UPB' },
  { nombre: 'Universidad del Norte' },
  { nombre: 'Universidad Tecnológica de Pereira', sigla: 'UTP' },
  { nombre: 'Universidad de Caldas' },
  { nombre: 'Universidad del Cauca' },
  { nombre: 'Universidad de Nariño' },
  { nombre: 'Universidad del Tolima' },
  { nombre: 'Universidad Surcolombiana' },
  { nombre: 'Universidad de Cartagena' },
  { nombre: 'Universidad del Atlántico' },
  { nombre: 'Universidad del Magdalena' },
  { nombre: 'Universidad Francisco de Paula Santander', sigla: 'UFPS' },
  { nombre: 'Universidad de los Llanos', sigla: 'Unillanos' },
  { nombre: 'Universidad Pedagógica y Tecnológica de Colombia', sigla: 'UPTC' },
  { nombre: 'Universidad Militar Nueva Granada', sigla: 'UMNG' },
  { nombre: 'Universidad Santo Tomás' },
  { nombre: 'Universidad de La Salle' },
  { nombre: 'Universidad Católica de Colombia' },
  { nombre: 'Universidad Cooperativa de Colombia', sigla: 'UCC' },
  { nombre: 'Universidad Antonio Nariño', sigla: 'UAN' },
  { nombre: 'Universidad ECCI' },
  { nombre: 'Universidad Piloto de Colombia' },
  { nombre: 'Fundación Universitaria del Área Andina', sigla: 'Areandina' },
  { nombre: 'Institución Universitaria Politécnico Grancolombiano' },
  { nombre: 'Universidad Nacional Abierta y a Distancia', sigla: 'UNAD' },
  { nombre: 'Universidad Libre' },
  { nombre: 'Universidad Central' },
  { nombre: 'Escuela Colombiana de Ingeniería Julio Garavito' },
  { nombre: 'Universidad Autónoma de Occidente', sigla: 'UAO' },
  { nombre: 'Universidad Icesi' },
  { nombre: 'Universidad de Manizales' },
  { nombre: 'Universidad de Ibagué' },
  { nombre: 'Corporación Unificada Nacional de Educación Superior', sigla: 'CUN' },
  { nombre: 'Universidad EAN' },
  { nombre: 'Institución educativa extranjera' },
];

/** Orden de los niveles de formación para calcular el nivel máximo alcanzado. */
export const NIVELES_FORMACION = ['Bachiller', 'Técnico', 'Tecnólogo', 'Profesional', 'Especialista', 'Magíster', 'Doctor'] as const;
export const NIVEL_POR_MODALIDAD: Record<string, number> = { TC: 1, TL: 2, TE: 2, UN: 3, ES: 4, MG: 5, DOC: 6 };
