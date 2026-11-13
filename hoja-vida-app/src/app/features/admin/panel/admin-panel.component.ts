import { Component, computed, effect, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { Estadisticas } from '../../../core/models';
import { AdminService } from '../../../core/services/admin.service';
import { InstitucionService } from '../../../core/services/institucion.service';
import { PageTitleComponent } from '../../../shared/components/page-title/page-title.component';
import { BarChartComponent } from '../components/bar-chart/bar-chart.component';
import { FiltrosAdminComponent } from '../components/filtros-admin/filtros-admin.component';
import { MapaColombiaComponent } from '../components/mapa-colombia/mapa-colombia.component';
import { AdminFiltroService } from '../services/admin-filtro.service';

/** Panel del administrador: indicadores, mapa de sedes y estadísticas filtrables. */
@Component({
  selector: 'app-admin-panel',
  imports: [RouterLink, DecimalPipe, MatCardModule, MatIconModule, MatButtonModule, MatTableModule, PageTitleComponent, BarChartComponent, MapaColombiaComponent, FiltrosAdminComponent],
  templateUrl: './admin-panel.component.html',
  styleUrl: './admin-panel.component.scss',
})
export class AdminPanelComponent {
  private readonly admin = inject(AdminService);
  protected readonly filtros = inject(AdminFiltroService);
  protected readonly inst = inject(InstitucionService);
  protected readonly est = signal<Estadisticas | null>(null);

  protected readonly pctCompletas = computed(() => {
    const e = this.est();
    return e?.totalHv ? Math.round((e.completas / e.totalHv) * 100) : 0;
  });
  protected readonly pctAlineados = computed(() => {
    const e = this.est();
    return e?.docentes ? Math.round((e.docentesAlineados / e.docentes) * 100) : 0;
  });
  protected readonly sedesOrdenadas = computed(() => [...(this.est()?.porSede ?? [])].filter((s) => s.totalHv > 0).sort((a, b) => b.totalHv - a.totalHv));
  protected readonly columnasSede = ['sede', 'region', 'total', 'docentes', 'alineados', 'estudiantes'];
  protected readonly filtroTexto = computed(() => {
    const f = this.filtros.filtro();
    const partes = [
      f.region && this.inst.nombreRegion(f.region),
      f.departamento && this.est()?.porDepartamento.find((d) => d.clave === f.departamento)?.etiqueta,
      f.sedeId && this.inst.nombreSede(f.sedeId),
      f.tipoVinculacion && this.inst.tiposVinculacion.find((t) => t.valor === f.tipoVinculacion)?.etiqueta,
    ].filter(Boolean);
    return partes.length ? partes.join(' · ') : 'Toda la institución';
  });

  constructor() {
    effect(() => {
      const f = this.filtros.filtro();
      this.admin.estadisticas(f).subscribe((e) => this.est.set(e));
    });
  }

  ancho(a: number, b: number): number {
    return b ? (a / b) * 100 : 0;
  }
}
