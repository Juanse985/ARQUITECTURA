import { AREAS_CONOCIMIENTO, PROGRAMAS, SEDES_DEFECTO } from '../constants/institucion';
import { MUNICIPIOS } from '../constants/divipola';
import {
  AreaConocimiento,
  EducacionSuperior,
  ExperienciaLaboral,
  FormatoArchivo,
  HojaVida,
  Idioma,
  ModalidadAcademica,
  NivelIdioma,
  TipoVinculacion,
  Usuario,
} from '../models';

/**
 * DATOS DE PRUEBA (todos ficticios) para usar la app sin backend.
 *
 *  Usuario demo:          demo@uniminuto.edu.co   / Demo1234
 *  Administrador demo:    admin@uniminuto.edu.co  / Admin1234
 *
 * Además se generan ~180 hojas de vida sintéticas (nombres inventados) repartidas
 * en las sedes, para que el panel de administración muestre estadísticas.
 */
export interface UsuarioMock extends Usuario {
  /** hash SHA-256 (hex) de salt + contraseña. Nunca se guarda la contraseña en claro. */
  passwordHash: string;
  salt: string;
  intentosFallidos: number;
  bloqueadoHasta: number | null;
  ultimoAcceso: string | null;
}

export const CREDENCIALES_DEMO = [
  { email: 'demo@uniminuto.edu.co', password: 'Demo1234' },
  { email: 'admin@uniminuto.edu.co', password: 'Admin1234' },
];

export const USUARIOS_BASE: Omit<UsuarioMock, 'passwordHash' | 'salt'>[] = [
  {
    id: 1, rol: 'USUARIO', activo: true, nombres: 'Laura Camila', apellidos: 'Rodríguez Gómez',
    email: 'demo@uniminuto.edu.co', fechaRegistro: '2026-02-01T10:00:00', intentosFallidos: 0, bloqueadoHasta: null, ultimoAcceso: null,
  },
  {
    id: 2, rol: 'ADMIN', activo: true, nombres: 'Andrés Felipe', apellidos: 'Martínez Rojas',
    email: 'admin@uniminuto.edu.co', fechaRegistro: '2026-01-15T08:00:00', intentosFallidos: 0, bloqueadoHasta: null, ultimoAcceso: null,
  },
];

export const HOJA_VIDA_DEMO: HojaVida = {
  id: 1,
  usuarioId: 1,
  estado: 'COMPLETA',
  origen: 'FORMULARIO',
  institucional: { tipoVinculacion: 'DOCENTE', sedeId: 'CUN-SOA', programaId: 'ING-SIS', profesion: 'Ingeniera de Sistemas', areaConocimiento: 'ING' },
  datosPersonales: {
    primerApellido: 'Rodríguez', segundoApellido: 'Gómez', nombres: 'Laura Camila', tipoDocumento: 'CC', numeroDocumento: '1012345678',
    sexo: 'F', nacionalidad: 'COL', paisNacionalidad: null, libretaMilitar: { clase: null, numero: null, distritoMilitar: null },
    fechaNacimiento: '1998-04-15', lugarNacimiento: { pais: 'Colombia', departamento: '25', municipio: '25754' },
    direccionCorrespondencia: 'Calle 81 B # 72 B - 70', ubicacionCorrespondencia: { pais: 'Colombia', departamento: '11', municipio: '11001' },
    telefono: '3101234567', email: 'demo@uniminuto.edu.co', fotoUrl: null,
  },
  educacionBasica: { ultimoGrado: 11, titulo: 'Bachiller académico', mesGrado: 11, anioGrado: 2015 },
  educacionSuperior: [
    { id: 1, modalidad: 'TL', semestresAprobados: 6, graduado: true, titulo: 'Tecnología en Desarrollo de Software', institucion: 'Corporación Universitaria Minuto de Dios', areaConocimiento: 'ING', mesTerminacion: 12, anioTerminacion: 2019, tarjetaProfesional: null },
    { id: 2, modalidad: 'UN', semestresAprobados: 10, graduado: true, titulo: 'Ingeniería de Sistemas', institucion: 'Corporación Universitaria Minuto de Dios', areaConocimiento: 'ING', mesTerminacion: 6, anioTerminacion: 2023, tarjetaProfesional: '25255-123456' },
  ],
  idiomas: [
    { id: 1, idioma: 'Inglés', habla: 'B', lee: 'MB', escribe: 'B' },
    { id: 2, idioma: 'Portugués', habla: 'R', lee: 'B', escribe: 'R' },
  ],
  experienciaLaboral: [
    { id: 1, empresa: 'Alcaldía Municipal de Soacha', tipoEntidad: 'PUBLICA', pais: 'Colombia', departamento: '25', municipio: '25754',
      correoEntidad: 'contactenos@soacha.gov.co', telefonos: '6017305580', fechaIngreso: '2023-02-01', fechaRetiro: null, empleoActual: true,
      cargo: 'Técnico de sistemas', dependencia: 'Secretaría TIC', direccion: 'Calle 13 # 7 - 30' },
    { id: 2, empresa: 'Soluciones Andinas S.A.S.', tipoEntidad: 'PRIVADA', pais: 'Colombia', departamento: '11', municipio: '11001',
      correoEntidad: 'rrhh@solucionesandinas.com', telefonos: '6015550101', fechaIngreso: '2020-01-15', fechaRetiro: '2022-12-20', empleoActual: false,
      cargo: 'Desarrolladora junior', dependencia: 'Tecnología', direccion: 'Carrera 7 # 71 - 21' },
  ],
  tiempoExperiencia: {
    servidorPublico: { anios: 3, meses: 9 }, sectorPrivado: { anios: 2, meses: 11 },
    independiente: { anios: 0, meses: 6 }, total: { anios: 7, meses: 2 },
  },
  declaracion: {
    inhabilidad: 'NO', certificaVeracidad: true, ciudadDiligenciamiento: 'Bogotá D.C.', fechaDiligenciamiento: '2026-11-01',
    firmaUrl: null, autorizaTratamientoDatos: true,
  },
  observacionesRrhh: null,
  archivoOriginal: null,
  fechaCreacion: '2026-02-01T10:05:00',
  fechaActualizacion: '2026-11-01T09:30:00',
};

// ----------------------------------------------------------------------------- Generador sintético
/** PRNG determinista (mulberry32) para que los datos de prueba sean siempre los mismos. */
function prng(semilla: number) {
  let a = semilla;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMBRES_F = ['María José', 'Ana Sofía', 'Daniela', 'Valentina', 'Paula Andrea', 'Diana Marcela', 'Luisa Fernanda', 'Natalia', 'Carolina', 'Juliana', 'Sandra Milena', 'Angélica', 'Lina María', 'Camila', 'Yuliana'];
const NOMBRES_M = ['Juan David', 'Carlos Andrés', 'Santiago', 'Sebastián', 'Jorge Iván', 'Luis Fernando', 'Diego Alejandro', 'Óscar Javier', 'Julián', 'Mateo', 'Andrés Felipe', 'Camilo', 'Edwin', 'Fabián', 'Nicolás'];
const APELLIDOS = ['Gómez', 'Rodríguez', 'Martínez', 'García', 'López', 'Hernández', 'Ramírez', 'Torres', 'Díaz', 'Moreno', 'Vargas', 'Castro', 'Ruiz', 'Ortiz', 'Rojas', 'Suárez', 'Parra', 'Cárdenas', 'Pineda', 'Salazar', 'Mejía', 'Restrepo', 'Ospina', 'Cifuentes'];
const IDIOMAS = ['Inglés', 'Francés', 'Portugués', 'Alemán', 'Italiano'];
const EMPRESAS_PUB = ['Alcaldía Municipal', 'Gobernación', 'Secretaría de Educación', 'Hospital Departamental', 'ICBF', 'SENA'];
const EMPRESAS_PRIV = ['Grupo Andino S.A.S.', 'Comercializadora del Valle', 'Tecnologías Integrales Ltda.', 'Fundación Social Esperanza', 'Constructora Horizonte', 'Colegio San José', 'Clínica Santa Lucía', 'Consultores Asociados'];

/** Títulos por área de conocimiento (para generar perfiles coherentes). */
const TITULOS: Record<AreaConocimiento, string[]> = {
  AGRO: ['Ingeniería Agronómica', 'Medicina Veterinaria', 'Ingeniería Agroecológica'],
  ARTES: ['Estudios Musicales', 'Diseño Gráfico', 'Artes Visuales'],
  EDU: ['Licenciatura en Educación Infantil', 'Licenciatura en Matemáticas', 'Licenciatura en Lengua Castellana', 'Licenciatura en Educación Física'],
  SALUD: ['Enfermería', 'Fisioterapia', 'Nutrición y Dietética'],
  SOCIALES: ['Psicología', 'Trabajo Social', 'Comunicación Social', 'Derecho', 'Sociología'],
  ECO: ['Administración de Empresas', 'Contaduría Pública', 'Economía', 'Administración Financiera'],
  ING: ['Ingeniería de Sistemas', 'Ingeniería Civil', 'Ingeniería Industrial', 'Ingeniería Electrónica'],
  MAT: ['Matemáticas', 'Biología', 'Química'],
};
const POSGRADOS: Record<AreaConocimiento, string> = {
  AGRO: 'Desarrollo Rural', ARTES: 'Gestión Cultural', EDU: 'Educación', SALUD: 'Salud Pública', SOCIALES: 'Psicología Social',
  ECO: 'Gerencia de Proyectos', ING: 'Ingeniería de Software', MAT: 'Ciencias Básicas',
};

function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function generarDatosSinteticos(cantidad = 180, idInicial = 100): { usuarios: Omit<UsuarioMock, 'passwordHash' | 'salt'>[]; hojas: HojaVida[] } {
  const r = prng(20261112);
  const pick = <T>(l: readonly T[]): T => l[Math.floor(r() * l.length)];
  const entre = (a: number, b: number) => a + Math.floor(r() * (b - a + 1));
  const sedes = SEDES_DEFECTO;
  // Peso por sede: Bogotá y Cundinamarca concentran más población.
  const pesos = sedes.map((s) => (s.region === 'BOGOTA' ? 5 : s.region === 'CUNDINAMARCA_BOYACA' ? 3 : s.region === 'VIRTUAL' ? 3 : 1.5));
  const sumaPesos = pesos.reduce((a, b) => a + b, 0);
  const sedeAleatoria = () => {
    let x = r() * sumaPesos;
    for (let i = 0; i < sedes.length; i++) { x -= pesos[i]; if (x <= 0) return sedes[i]; }
    return sedes[0];
  };
  const usuarios: Omit<UsuarioMock, 'passwordHash' | 'salt'>[] = [];
  const hojas: HojaVida[] = [];
  const hoy = new Date(2026, 10, 11);

  for (let i = 0; i < cantidad; i++) {
    const id = idInicial + i;
    const sexo = r() < 0.55 ? 'F' : 'M';
    const nombres = sexo === 'F' ? pick(NOMBRES_F) : pick(NOMBRES_M);
    const ap1 = pick(APELLIDOS);
    const ap2 = pick(APELLIDOS);
    const x = r();
    const tipo: TipoVinculacion = x < 0.35 ? 'DOCENTE' : x < 0.75 ? 'ESTUDIANTE' : x < 0.88 ? 'EGRESADO' : x < 0.95 ? 'ADMINISTRATIVO' : 'EXTERNO';
    const sede = sedeAleatoria();
    const programa = pick(PROGRAMAS);
    // Docentes: 72 % con formación en el área de su programa.
    const area: AreaConocimiento =
      tipo === 'DOCENTE' ? (r() < 0.72 ? programa.area : pick(AREAS_CONOCIMIENTO).valor) : tipo === 'ESTUDIANTE' ? programa.area : pick(AREAS_CONOCIMIENTO).valor;
    const tituloBase = pick(TITULOS[area]);
    const edad = tipo === 'ESTUDIANTE' ? entre(18, 30) : entre(24, 60);
    const nacimiento = new Date(hoy.getFullYear() - edad, entre(0, 11), entre(1, 28));
    const muni = sede.municipio;
    const email = `${nombres.split(' ')[0].toLowerCase()}.${ap1.toLowerCase()}${id}@correo-demo.co`
      .normalize('NFD').replace(/[̀-ͯ]/g, '');

    const estudios: EducacionSuperior[] = [];
    const egreso = Math.min(hoy.getFullYear() - 1, nacimiento.getFullYear() + entre(22, 27));
    if (tipo === 'ESTUDIANTE') {
      const mod: ModalidadAcademica = programa.nivel === 'TECNOLOGICO' ? 'TL' : 'UN';
      estudios.push({ id: id * 10 + 1, modalidad: mod, semestresAprobados: entre(1, 8), graduado: false, titulo: programa.nombre, institucion: 'Corporación Universitaria Minuto de Dios', areaConocimiento: programa.area, mesTerminacion: null, anioTerminacion: null, tarjetaProfesional: null });
    } else {
      if (r() < 0.25) estudios.push({ id: id * 10 + 1, modalidad: 'TL', semestresAprobados: 6, graduado: true, titulo: `Tecnología en ${tituloBase.split(' ').slice(-1)[0]}`, institucion: pick(['Servicio Nacional de Aprendizaje', 'Corporación Universitaria Minuto de Dios']), areaConocimiento: area, mesTerminacion: entre(1, 12), anioTerminacion: egreso - 3, tarjetaProfesional: null });
      estudios.push({ id: id * 10 + 2, modalidad: 'UN', semestresAprobados: 10, graduado: true, titulo: tituloBase, institucion: pick(['Corporación Universitaria Minuto de Dios', 'Universidad Nacional de Colombia', 'Universidad Pedagógica Nacional', 'Universidad del Valle', 'Universidad de Antioquia', 'Universidad Santo Tomás', 'Universidad Cooperativa de Colombia']), areaConocimiento: area, mesTerminacion: entre(1, 12), anioTerminacion: egreso, tarjetaProfesional: r() < 0.5 ? `${entre(10000, 99999)}-${entre(100000, 999999)}` : null });
      const p = r();
      const niveles: ModalidadAcademica[] = tipo === 'DOCENTE' ? (p < 0.35 ? ['ES'] : p < 0.85 ? ['ES', 'MG'] : ['ES', 'MG', 'DOC']) : p < 0.3 ? ['ES'] : [];
      niveles.forEach((m, k) => {
        const nombre = m === 'ES' ? 'Especialización en' : m === 'MG' ? 'Maestría en' : 'Doctorado en';
        estudios.push({ id: id * 10 + 3 + k, modalidad: m, semestresAprobados: m === 'ES' ? 2 : 4, graduado: true, titulo: `${nombre} ${POSGRADOS[area]}`, institucion: pick(['Corporación Universitaria Minuto de Dios', 'Universidad de los Andes', 'Pontificia Universidad Javeriana', 'Universidad de La Salle', 'Universidad Externado de Colombia']), areaConocimiento: area, mesTerminacion: entre(1, 12), anioTerminacion: Math.min(hoy.getFullYear(), egreso + 2 + k * 3), tarjetaProfesional: null });
      });
    }

    const idiomas: Idioma[] = [];
    const nIdiomas = r() < 0.55 ? 1 : r() < 0.2 ? 2 : 0;
    const niv: NivelIdioma[] = ['R', 'B', 'MB'];
    for (let k = 0; k < nIdiomas; k++) idiomas.push({ id: id * 10 + k, idioma: k === 0 ? 'Inglés' : pick(IDIOMAS.slice(1)), habla: pick(niv), lee: pick(niv), escribe: pick(niv) });

    const exps: ExperienciaLaboral[] = [];
    let publico = 0;
    let privado = 0;
    const nExp = tipo === 'ESTUDIANTE' ? (r() < 0.5 ? 1 : 0) : entre(1, 3);
    let fin = new Date(hoy);
    for (let k = 0; k < nExp; k++) {
      const meses = entre(8, 60);
      const ini = new Date(fin.getFullYear(), fin.getMonth() - meses, 1);
      const pub = r() < 0.35;
      if (pub) publico += meses; else privado += meses;
      exps.push({
        id: id * 10 + k, empresa: pub ? `${pick(EMPRESAS_PUB)} de ${sede.ciudad}` : pick(EMPRESAS_PRIV), tipoEntidad: pub ? 'PUBLICA' : 'PRIVADA',
        pais: 'Colombia', departamento: sede.departamento, municipio: muni, correoEntidad: null, telefonos: null,
        fechaIngreso: iso(ini), fechaRetiro: k === 0 ? null : iso(fin), empleoActual: k === 0,
        cargo: tipo === 'DOCENTE' && k === 0 ? 'Docente' : pick(['Analista', 'Auxiliar administrativo', 'Coordinador', 'Profesional de apoyo', 'Asesor', 'Docente de cátedra']),
        dependencia: null, direccion: null,
      });
      fin = new Date(ini.getFullYear(), ini.getMonth() - entre(1, 6), 1);
    }
    const indep = r() < 0.2 ? entre(3, 36) : 0;
    const dur = (m: number) => ({ anios: Math.floor(m / 12), meses: m % 12 });

    const importada = r() < 0.32;
    const formatos: FormatoArchivo[] = ['PDF', 'PDF', 'PDF', 'DOCX', 'DOCX', 'IMAGEN'];
    const formato = importada || r() < 0.15 ? pick(formatos) : null;
    const registro = new Date(2025, 11 + entre(0, 11), entre(1, 28));
    const completa = r() < 0.7;
    const mun = MUNICIPIOS.find((m) => m.codigo === muni);

    usuarios.push({ id, rol: 'USUARIO', activo: r() > 0.03, nombres, apellidos: `${ap1} ${ap2}`, email, fechaRegistro: registro.toISOString().slice(0, 19), intentosFallidos: 0, bloqueadoHasta: null, ultimoAcceso: null });
    hojas.push({
      id, usuarioId: id, estado: completa ? 'COMPLETA' : 'BORRADOR', origen: importada ? 'IMPORTADA_IA' : 'FORMULARIO',
      institucional: { tipoVinculacion: tipo, sedeId: sede.id, programaId: tipo === 'ADMINISTRATIVO' || tipo === 'EXTERNO' ? null : programa.id, profesion: tipo === 'ESTUDIANTE' ? null : tituloBase, areaConocimiento: area },
      datosPersonales: {
        primerApellido: ap1, segundoApellido: ap2, nombres, tipoDocumento: 'CC', numeroDocumento: String(entre(10000000, 1099999999)),
        sexo, nacionalidad: 'COL', paisNacionalidad: null, libretaMilitar: { clase: null, numero: null, distritoMilitar: null },
        fechaNacimiento: iso(nacimiento), lugarNacimiento: { pais: 'Colombia', departamento: sede.departamento, municipio: muni },
        direccionCorrespondencia: `Calle ${entre(1, 150)} # ${entre(1, 99)} - ${entre(1, 99)}`,
        ubicacionCorrespondencia: { pais: 'Colombia', departamento: mun?.departamento ?? sede.departamento, municipio: muni },
        telefono: `3${entre(100000000, 299999999)}`, email, fotoUrl: null,
      },
      educacionBasica: { ultimoGrado: 11, titulo: 'Bachiller académico', mesGrado: 11, anioGrado: nacimiento.getFullYear() + 17 },
      educacionSuperior: estudios,
      idiomas,
      experienciaLaboral: exps,
      tiempoExperiencia: { servidorPublico: dur(publico), sectorPrivado: dur(privado), independiente: dur(indep), total: dur(publico + privado + indep) },
      declaracion: completa ? { inhabilidad: 'NO', certificaVeracidad: true, ciudadDiligenciamiento: sede.ciudad, fechaDiligenciamiento: iso(registro), firmaUrl: null, autorizaTratamientoDatos: true } : null,
      observacionesRrhh: null,
      archivoOriginal: formato ? { nombre: `hv_${ap1.toLowerCase()}.${formato === 'IMAGEN' ? 'jpg' : formato.toLowerCase()}`, tipoMime: formato === 'PDF' ? 'application/pdf' : formato === 'DOCX' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'image/jpeg', tamano: entre(80, 900) * 1024, formato, url: '', fechaCarga: registro.toISOString().slice(0, 19), procesadoConIa: importada } : null,
      fechaCreacion: registro.toISOString().slice(0, 19),
      fechaActualizacion: registro.toISOString().slice(0, 19),
    });
  }
  return { usuarios, hojas };
}
