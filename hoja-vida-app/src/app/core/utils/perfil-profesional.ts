import { AREAS_CONOCIMIENTO, NIVELES_FORMACION, NIVEL_POR_MODALIDAD, PROGRAMAS } from '../constants/institucion';
import { HojaVida } from '../models';

/** Nivel de formación más alto alcanzado (solo títulos con "Graduado = Sí"). */
export function nivelMaximo(hv: HojaVida): string {
  let nivel = hv.educacionBasica?.ultimoGrado === 11 ? 0 : -1;
  for (const e of hv.educacionSuperior ?? []) {
    if (e.graduado) nivel = Math.max(nivel, NIVEL_POR_MODALIDAD[e.modalidad] ?? 0);
  }
  return nivel < 0 ? 'Básica' : NIVELES_FORMACION[nivel];
}

/** Años de experiencia (tiempo total de la sección 4). */
export function aniosExperiencia(hv: HojaVida): number {
  const t = hv.tiempoExperiencia?.total;
  return t ? t.anios + t.meses / 12 : 0;
}

/**
 * ¿La hoja de vida del DOCENTE está enfocada en la carrera donde enseña?
 * Se considera alineada si algún título obtenido (o el área declarada) pertenece
 * a la misma área de conocimiento SNIES del programa.
 * Devuelve null si no es docente o no tiene programa.
 */
export function docenteAlineado(hv: HojaVida): boolean | null {
  const inst = hv.institucional;
  if (inst?.tipoVinculacion !== 'DOCENTE' || !inst.programaId) return null;
  const programa = PROGRAMAS.find((p) => p.id === inst.programaId);
  if (!programa) return null;
  const areas = new Set((hv.educacionSuperior ?? []).filter((e) => e.graduado && e.areaConocimiento).map((e) => e.areaConocimiento));
  if (inst.areaConocimiento) areas.add(inst.areaConocimiento);
  return areas.has(programa.area);
}

export function etiquetaArea(area: string | null | undefined): string {
  return AREAS_CONOCIMIENTO.find((a) => a.valor === area)?.etiqueta ?? 'Sin área';
}
