import { Injectable } from '@angular/core';
import { Duracion, ExperienciaLaboral, TiempoExperiencia } from '../models';
import { hoy, mesesEntre, parseIsoDate } from '../utils/date-utils';

/**
 * Calcula el TIEMPO TOTAL DE EXPERIENCIA (sección 4 del formato) a partir
 * de la experiencia laboral (sección 3):
 *   - Entidad pública  -> Servidor público
 *   - Entidad privada  -> Empleado del sector privado
 *   - Trabajador independiente -> lo diligencia el usuario
 */
@Injectable({ providedIn: 'root' })
export class ExperienciaCalculoService {
  static aDuracion(totalMeses: number): Duracion {
    const m = Math.max(0, Math.round(totalMeses));
    return { anios: Math.floor(m / 12), meses: m % 12 };
  }

  static aMeses(d: Duracion | null | undefined): number {
    if (!d) return 0;
    return (Number(d.anios) || 0) * 12 + (Number(d.meses) || 0);
  }

  mesesExperiencia(e: Pick<ExperienciaLaboral, 'fechaIngreso' | 'fechaRetiro' | 'empleoActual'>): number {
    const ini = parseIsoDate(e.fechaIngreso);
    const fin = e.empleoActual ? hoy() : parseIsoDate(e.fechaRetiro);
    if (!ini || !fin) return 0;
    return mesesEntre(ini, fin);
  }

  calcular(experiencias: ExperienciaLaboral[], independiente: Duracion): TiempoExperiencia {
    let publico = 0;
    let privado = 0;
    for (const e of experiencias) {
      const m = this.mesesExperiencia(e);
      if (e.tipoEntidad === 'PUBLICA') publico += m;
      else if (e.tipoEntidad === 'PRIVADA') privado += m;
    }
    const indep = ExperienciaCalculoService.aMeses(independiente);
    return {
      servidorPublico: ExperienciaCalculoService.aDuracion(publico),
      sectorPrivado: ExperienciaCalculoService.aDuracion(privado),
      independiente: ExperienciaCalculoService.aDuracion(indep),
      total: ExperienciaCalculoService.aDuracion(publico + privado + indep),
    };
  }
}
