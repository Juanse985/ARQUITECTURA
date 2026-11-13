import { Component, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { ResumenHojaVida } from '../../../core/models';
import { AdminService } from '../../../core/services/admin.service';
import { AlertService } from '../../../core/services/alert.service';
import { InstitucionService } from '../../../core/services/institucion.service';
import { PageTitleComponent } from '../../../shared/components/page-title/page-title.component';
import { FechaCoPipe } from '../../../shared/pipes/fecha-co.pipe';
import { FiltrosAdminComponent } from '../components/filtros-admin/filtros-admin.component';
import { AdminFiltroService } from '../services/admin-filtro.service';

/** Consulta de todas las hojas de vida cargadas, con búsqueda, filtros, paginación y exportación. */
@Component({
  selector: 'app-admin-hojas-vida',
  imports: [
    FormsModule, RouterLink, MatCardModule, MatTableModule, MatPaginatorModule, MatFormFieldModule, MatInputModule, MatSelectModule,
    MatIconModule, MatButtonModule, MatTooltipModule, PageTitleComponent, FiltrosAdminComponent, FechaCoPipe,
  ],
  templateUrl: './admin-hojas-vida.component.html',
  styleUrl: './admin-hojas-vida.component.scss',
})
export class AdminHojasVidaComponent {
  private readonly admin = inject(AdminService);
  private readonly alert = inject(AlertService);
  protected readonly filtros = inject(AdminFiltroService);
  protected readonly inst = inject(InstitucionService);

  protected readonly filas = signal<ResumenHojaVida[]>([]);
  protected readonly total = signal(0);
  protected readonly pagina = signal(1);
  protected readonly tamano = signal(10);
  protected readonly q = signal('');
  protected readonly estado = signal<string | null>(null);
  protected texto = '';
  private temporizador?: ReturnType<typeof setTimeout>;
  protected readonly columnas = ['nombre', 'vinculacion', 'sede', 'profesion', 'nivel', 'experiencia', 'estado', 'origen', 'acciones'];

  constructor() {
    effect(() => {
      const f = this.filtros.filtro();
      this.admin.hojasVida(f, this.q(), this.estado(), this.pagina(), this.tamano()).subscribe((p) => {
        this.filas.set(p.items);
        this.total.set(p.total);
      });
    });
  }

  buscar(): void {
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      this.pagina.set(1);
      this.q.set(this.texto);
    }, 300);
  }

  cambiarPagina(e: PageEvent): void {
    this.tamano.set(e.pageSize);
    this.pagina.set(e.pageIndex + 1);
  }

  vinculacion(v: string | null): string {
    return this.inst.tiposVinculacion.find((t) => t.valor === v)?.etiqueta ?? '—';
  }

  /** Exporta a CSV (Excel) todas las filas que cumplen los filtros actuales. */
  async exportar(): Promise<void> {
    const ok = await this.alert.confirmar(
      'Exportar a CSV',
      `Se descargarán <b>${this.total()}</b> registros con datos personales.<br>Trátalos según la Ley 1581 de 2012 y no los compartas fuera de la institución.`,
      'Descargar',
      'warning',
    );
    if (!ok) return;
    const todas: ResumenHojaVida[] = [];
    for (let p = 1; p <= Math.ceil(this.total() / 100); p++) {
      const r = await firstValueFrom(this.admin.hojasVida(this.filtros.filtro(), this.q(), this.estado(), p, 100));
      todas.push(...r.items);
    }
    const encabezado = ['ID', 'Nombre', 'Documento', 'Email', 'Vinculación', 'Sede', 'Programa', 'Profesión', 'Nivel máximo', 'Años experiencia', 'Estado', 'Origen', 'Formato archivo', 'Docente enfocado', 'Actualización'];
    // Escapa comillas y neutraliza fórmulas (=, +, -, @) para evitar inyección CSV.
    const celda = (v: unknown) => {
      let s = String(v ?? '');
      if (/^[=+\-@]/.test(s)) s = `'${s}`;
      return `"${s.replace(/"/g, '""')}"`;
    };
    const filas = todas.map((r) =>
      [r.id, r.nombreCompleto, r.documento, r.email, this.vinculacion(r.tipoVinculacion), this.inst.nombreSede(r.sedeId), this.inst.nombrePrograma(r.programaId),
        r.profesion, r.nivelMaximo, r.experienciaAnios, r.estado, r.origen, r.formatoArchivo ?? 'Formulario', r.alineado === null ? '' : r.alineado ? 'Sí' : 'No', r.fechaActualizacion]
        .map(celda).join(';'),
    );
    const blob = new Blob(['﻿' + [encabezado.map(celda).join(';'), ...filas].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `hojas-de-vida-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    this.alert.toast('Archivo CSV generado');
  }
}
