import { Component, computed, inject, input } from '@angular/core';
import { FILAS_FORMATO } from '../../../../core/constants/app.constants';
import { EducacionSuperior, ExperienciaLaboral, HojaVida, Idioma, NivelIdioma } from '../../../../core/models';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { InstitucionService } from '../../../../core/services/institucion.service';
import { parseIsoDate } from '../../../../core/utils/date-utils';
import { LogoPlaceholderComponent } from '../../../../shared/components/logo-placeholder/logo-placeholder.component';

interface FechaPartes {
  dia: string;
  mes: string;
  anio: string;
}

/**
 * Presentación del FORMATO ÚNICO DE HOJA DE VIDA – PERSONA NATURAL.
 * Imita la distribución del formato oficial (secciones 1 a 6, casillas y
 * tablas) y está optimizado para imprimir en tamaño carta (@media print).
 */
@Component({
  selector: 'app-formato-oficial-view',
  imports: [LogoPlaceholderComponent],
  templateUrl: './formato-oficial-view.component.html',
  styleUrl: './formato-oficial-view.component.scss',
})
export class FormatoOficialViewComponent {
  readonly hv = input.required<HojaVida>();
  protected readonly c = inject(CatalogosService);
  protected readonly inst = inject(InstitucionService);
  protected readonly niveles: NivelIdioma[] = ['R', 'B', 'MB'];
  protected readonly grados = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

  protected readonly dp = computed(() => this.hv().datosPersonales);
  protected readonly lugarNac = computed(() => this.c.ubicacionLegible(this.dp()?.lugarNacimiento));
  protected readonly ubicCorr = computed(() => this.c.ubicacionLegible(this.dp()?.ubicacionCorrespondencia));
  protected readonly fechaNac = computed(() => this.partes(this.dp()?.fechaNacimiento));

  /** Rellena con filas vacías hasta el mínimo del formato impreso. */
  protected readonly estudios = computed<(EducacionSuperior | null)[]>(() =>
    this.rellenar(this.hv().educacionSuperior, FILAS_FORMATO.educacionSuperior),
  );
  protected readonly idiomas = computed<(Idioma | null)[]>(() => this.rellenar(this.hv().idiomas, FILAS_FORMATO.idiomas));
  protected readonly experiencias = computed<(ExperienciaLaboral | null)[]>(() =>
    this.rellenar(this.hv().experienciaLaboral, FILAS_FORMATO.experiencia),
  );

  protected readonly filasTiempo = computed(() => {
    const t = this.hv().tiempoExperiencia;
    return [
      { ocupacion: 'Servidor público', d: t?.servidorPublico },
      { ocupacion: 'Empleado del sector privado', d: t?.sectorPrivado },
      { ocupacion: 'Trabajador independiente', d: t?.independiente },
      { ocupacion: 'Total tiempo experiencia', d: t?.total, total: true },
    ];
  });

  protected readonly fechaDil = computed(() => this.partes(this.hv().declaracion?.fechaDiligenciamiento));

  partes(iso: string | null | undefined): FechaPartes {
    const d = parseIsoDate(iso);
    if (!d) return { dia: '', mes: '', anio: '' };
    return { dia: String(d.getDate()).padStart(2, '0'), mes: String(d.getMonth() + 1).padStart(2, '0'), anio: String(d.getFullYear()) };
  }

  ubic(e: ExperienciaLaboral | null) {
    return this.c.ubicacionLegible(e ? { pais: e.pais, departamento: e.departamento, municipio: e.municipio } : null);
  }

  x(condicion: boolean | null | undefined): string {
    return condicion ? 'X' : '';
  }

  private rellenar<T>(lista: T[] | null | undefined, minimo: number): (T | null)[] {
    const l: (T | null)[] = [...(lista ?? [])];
    while (l.length < minimo) l.push(null);
    return l;
  }
}
