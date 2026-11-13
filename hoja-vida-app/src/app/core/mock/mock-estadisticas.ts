import { AREAS_CONOCIMIENTO, PROGRAMAS, REGIONES, TIPOS_VINCULACION } from '../constants/institucion';
import { DEPARTAMENTOS } from '../constants/divipola';
import { Conteo, Estadisticas, EstadisticaSede, FiltroEstadisticas, HojaVida, ResumenHojaVida, Sede, Usuario } from '../models';
import { aniosExperiencia, docenteAlineado, nivelMaximo } from '../utils/perfil-profesional';

/**
 * Cálculo de estadísticas del panel de administración.
 * Es la misma lógica que debe implementar el endpoint FastAPI GET /api/admin/estadisticas
 * (allí se haría con consultas SQL GROUP BY).
 */
export function filtrarHojas(hojas: HojaVida[], sedes: Sede[], f: FiltroEstadisticas): HojaVida[] {
  return hojas.filter((h) => {
    const inst = h.institucional;
    const sede = sedes.find((s) => s.id === inst?.sedeId);
    if (f.sedeId && inst?.sedeId !== f.sedeId) return false;
    if (f.region && sede?.region !== f.region) return false;
    if (f.departamento && sede?.departamento !== f.departamento) return false;
    if (f.tipoVinculacion && inst?.tipoVinculacion !== f.tipoVinculacion) return false;
    return true;
  });
}

function contar<T extends string>(valores: (T | null | undefined)[], etiqueta: (v: T) => string, orden?: T[]): Conteo<T>[] {
  const m = new Map<T, number>();
  for (const v of valores) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  const lista = [...m.entries()].map(([clave, total]) => ({ clave, etiqueta: etiqueta(clave), total }));
  if (orden) return orden.map((o) => lista.find((x) => x.clave === o) ?? { clave: o, etiqueta: etiqueta(o), total: 0 });
  return lista.sort((a, b) => b.total - a.total);
}

export function calcularEstadisticas(todas: HojaVida[], usuarios: Usuario[], sedes: Sede[], f: FiltroEstadisticas): Estadisticas {
  const hojas = filtrarHojas(todas, sedes, f);
  const docentes = hojas.filter((h) => h.institucional?.tipoVinculacion === 'DOCENTE');
  const alineados = docentes.filter((h) => docenteAlineado(h) === true);
  const anios = hojas.map(aniosExperiencia);

  const porSede: EstadisticaSede[] = sedes.map((s) => {
    const hs = hojas.filter((h) => h.institucional?.sedeId === s.id);
    const ds = hs.filter((h) => h.institucional?.tipoVinculacion === 'DOCENTE');
    return {
      sedeId: s.id, nombre: s.nombre, region: s.region, departamento: s.departamento, ciudad: s.ciudad, lat: s.lat, lng: s.lng,
      totalHv: hs.length, docentes: ds.length, docentesAlineados: ds.filter((h) => docenteAlineado(h) === true).length,
      estudiantes: hs.filter((h) => h.institucional?.tipoVinculacion === 'ESTUDIANTE').length,
    };
  });

  const nombreDepto = (c: string) => DEPARTAMENTOS.find((d) => d.codigo === c)?.nombre ?? c;
  const sedeDe = (h: HojaVida) => sedes.find((s) => s.id === h.institucional?.sedeId);

  const meses = new Map<string, number>();
  for (const h of hojas) {
    const k = h.fechaCreacion.slice(0, 7);
    meses.set(k, (meses.get(k) ?? 0) + 1);
  }

  const idiomas = hojas.flatMap((h) => h.idiomas.map((i) => i.idioma));
  const profesiones = hojas.map((h) => h.institucional?.profesion ?? null);

  return {
    totalUsuarios: usuarios.filter((u) => u.rol === 'USUARIO').length,
    totalHv: hojas.length,
    completas: hojas.filter((h) => h.estado === 'COMPLETA').length,
    borradores: hojas.filter((h) => h.estado === 'BORRADOR').length,
    importadasIa: hojas.filter((h) => h.origen === 'IMPORTADA_IA').length,
    conArchivoOriginal: hojas.filter((h) => h.archivoOriginal).length,
    experienciaPromedioAnios: anios.length ? Math.round((anios.reduce((a, b) => a + b, 0) / anios.length) * 10) / 10 : 0,
    docentes: docentes.length,
    docentesAlineados: alineados.length,
    porTipoVinculacion: contar(hojas.map((h) => h.institucional?.tipoVinculacion), (v) => TIPOS_VINCULACION.find((t) => t.valor === v)?.etiqueta ?? v, TIPOS_VINCULACION.map((t) => t.valor)),
    porNivelFormacion: contar(hojas.map(nivelMaximo), (v) => v, ['Básica', 'Bachiller', 'Técnico', 'Tecnólogo', 'Profesional', 'Especialista', 'Magíster', 'Doctor']),
    porAreaConocimiento: contar(hojas.map((h) => h.institucional?.areaConocimiento), (v) => AREAS_CONOCIMIENTO.find((a) => a.valor === v)?.etiqueta ?? v),
    topProfesiones: contar(profesiones, (v) => v).slice(0, 10),
    idiomas: contar(idiomas, (v) => v).slice(0, 8),
    porFormatoArchivo: contar(hojas.map((h) => h.archivoOriginal?.formato ?? 'FORMULARIO'), (v) => (v === 'FORMULARIO' ? 'Solo formulario' : v === 'IMAGEN' ? 'Imagen (JPG/PNG)' : v)),
    rangosExperiencia: contar(
      anios.map((a) => (a < 1 ? '< 1 año' : a < 3 ? '1 a 3 años' : a < 5 ? '3 a 5 años' : a < 10 ? '5 a 10 años' : '10 años o más')),
      (v) => v, ['< 1 año', '1 a 3 años', '3 a 5 años', '5 a 10 años', '10 años o más'],
    ),
    porSede,
    porDepartamento: contar(hojas.map((h) => sedeDe(h)?.departamento ?? null), nombreDepto),
    porRegion: contar(hojas.map((h) => sedeDe(h)?.region ?? null), (v) => REGIONES.find((r) => r.id === v)?.nombre ?? v),
    alineacionPorPrograma: PROGRAMAS.map((p) => {
      const ds = docentes.filter((h) => h.institucional?.programaId === p.id);
      return { programaId: p.id, programa: p.nombre, docentes: ds.length, alineados: ds.filter((h) => docenteAlineado(h) === true).length };
    }).filter((x) => x.docentes > 0).sort((a, b) => b.docentes - a.docentes),
    registrosPorMes: [...meses.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([clave, total]) => ({ clave, etiqueta: clave, total })),
  };
}

export function resumenHoja(h: HojaVida, u: Usuario | undefined): ResumenHojaVida {
  const dp = h.datosPersonales;
  return {
    id: h.id,
    usuarioId: h.usuarioId,
    nombreCompleto: dp ? `${dp.nombres} ${dp.primerApellido} ${dp.segundoApellido ?? ''}`.trim() : `${u?.nombres ?? ''} ${u?.apellidos ?? ''}`.trim(),
    documento: dp ? `${dp.tipoDocumento} ${dp.numeroDocumento}` : '',
    email: dp?.email ?? u?.email ?? '',
    tipoVinculacion: h.institucional?.tipoVinculacion ?? null,
    sedeId: h.institucional?.sedeId ?? null,
    programaId: h.institucional?.programaId ?? null,
    profesion: h.institucional?.profesion ?? null,
    nivelMaximo: nivelMaximo(h),
    experienciaAnios: Math.round(aniosExperiencia(h) * 10) / 10,
    estado: h.estado,
    origen: h.origen,
    formatoArchivo: h.archivoOriginal?.formato ?? null,
    alineado: docenteAlineado(h),
    fechaActualizacion: h.fechaActualizacion,
  };
}
