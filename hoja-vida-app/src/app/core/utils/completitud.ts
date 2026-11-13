import { HojaVida, SeccionHojaVida } from '../models';

export interface CompletitudSeccion {
  seccion: SeccionHojaVida;
  titulo: string;
  numero: number;
  porcentaje: number;
  paso: number; // índice del paso en el stepper
}

const lleno = (v: unknown): boolean =>
  v !== null && v !== undefined && !(typeof v === 'string' && v.trim() === '');

const pct = (checks: boolean[]): number =>
  checks.length ? Math.round((checks.filter(Boolean).length / checks.length) * 100) : 0;

/** Calcula el porcentaje de completitud de cada sección del formato. */
export function calcularCompletitud(hv: HojaVida | null): CompletitudSeccion[] {
  const dp = hv?.datosPersonales;
  const eb = hv?.educacionBasica;
  const dec = hv?.declaracion;

  const datos = pct([
    lleno(dp?.primerApellido), lleno(dp?.nombres), lleno(dp?.tipoDocumento), lleno(dp?.numeroDocumento),
    lleno(dp?.sexo), lleno(dp?.nacionalidad), lleno(dp?.fechaNacimiento), lleno(dp?.lugarNacimiento?.pais),
    lleno(dp?.direccionCorrespondencia), lleno(dp?.telefono), lleno(dp?.email),
    lleno(hv?.institucional?.tipoVinculacion),
  ]);

  const formacion = pct([
    lleno(eb?.ultimoGrado),
    lleno(eb?.titulo),
    (hv?.educacionSuperior?.length ?? 0) > 0,
  ]);

  const experiencia = (hv?.experienciaLaboral?.length ?? 0) > 0 ? 100 : 0;
  const tiempo = hv?.tiempoExperiencia ? 100 : 0;

  const declaracion = pct([
    lleno(dec?.inhabilidad), dec?.certificaVeracidad === true, lleno(dec?.ciudadDiligenciamiento),
    lleno(dec?.fechaDiligenciamiento), dec?.autorizaTratamientoDatos === true,
  ]);

  return [
    { seccion: 'datosPersonales', numero: 1, titulo: 'Datos personales', porcentaje: datos, paso: 0 },
    { seccion: 'formacionAcademica', numero: 2, titulo: 'Formación académica', porcentaje: formacion, paso: 1 },
    { seccion: 'experienciaLaboral', numero: 3, titulo: 'Experiencia laboral', porcentaje: experiencia, paso: 2 },
    { seccion: 'tiempoExperiencia', numero: 4, titulo: 'Tiempo total de experiencia', porcentaje: tiempo, paso: 3 },
    { seccion: 'declaracion', numero: 5, titulo: 'Declaración y firma', porcentaje: declaracion, paso: 4 },
  ];
}

export function completitudTotal(secciones: CompletitudSeccion[]): number {
  if (!secciones.length) return 0;
  return Math.round(secciones.reduce((s, x) => s + x.porcentaje, 0) / secciones.length);
}
