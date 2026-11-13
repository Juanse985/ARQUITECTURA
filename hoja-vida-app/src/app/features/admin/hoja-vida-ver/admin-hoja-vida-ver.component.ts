import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { HojaVida } from '../../../core/models';
import { AdminService } from '../../../core/services/admin.service';
import { InstitucionService } from '../../../core/services/institucion.service';
import { docenteAlineado, nivelMaximo } from '../../../core/utils/perfil-profesional';
import { PageTitleComponent } from '../../../shared/components/page-title/page-title.component';
import { FechaCoPipe } from '../../../shared/pipes/fecha-co.pipe';
import { FormatoOficialViewComponent } from '../../hoja-vida/components/formato-oficial-view/formato-oficial-view.component';

/** Vista de solo lectura de cualquier hoja de vida (rol ADMIN). Cada consulta queda en la auditoría. */
@Component({
  selector: 'app-admin-hoja-vida-ver',
  imports: [RouterLink, MatCardModule, MatButtonModule, MatIconModule, PageTitleComponent, FormatoOficialViewComponent, FechaCoPipe],
  template: `
    <div class="no-print">
      <app-page-title [titulo]="titulo()" subtitulo="Vista de solo lectura · la consulta queda registrada en la auditoría" icono="badge">
        <a mat-button routerLink="/admin/hojas-vida"><mat-icon>arrow_back</mat-icon> Volver</a>
        <button mat-flat-button type="button" (click)="imprimir()" [disabled]="!hv()"><mat-icon>print</mat-icon> Imprimir / PDF</button>
      </app-page-title>
    </div>
    @if (hv(); as h) {
      <mat-card appearance="outlined" class="resumen no-print">
        <dl>
          <div><dt>Vinculación</dt><dd>{{ vinculacion() }}</dd></div>
          <div><dt>Sede</dt><dd>{{ inst.nombreSede(h.institucional?.sedeId) || '—' }}</dd></div>
          <div><dt>Programa</dt><dd>{{ inst.nombrePrograma(h.institucional?.programaId) || '—' }}</dd></div>
          <div><dt>Profesión</dt><dd>{{ h.institucional?.profesion || '—' }}</dd></div>
          <div><dt>Nivel máximo</dt><dd>{{ nivel() }}</dd></div>
          <div><dt>Enfocado en su carrera</dt><dd>{{ alineado() === null ? 'No aplica' : alineado() ? 'Sí' : 'No' }}</dd></div>
          <div><dt>Estado</dt><dd>{{ h.estado === 'COMPLETA' ? 'Completa' : 'Borrador' }} · {{ h.fechaActualizacion | fechaCo }}</dd></div>
          <div><dt>Origen</dt><dd>{{ h.origen === 'IMPORTADA_IA' ? 'Importada con IA' : 'Formulario' }}</dd></div>
        </dl>
        @if (h.archivoOriginal; as a) {
          <p class="archivo">
            <mat-icon>attach_file</mat-icon> Archivo original: <b>{{ a.nombre }}</b> ({{ a.formato }})
            @if (a.url) { <a mat-button [href]="a.url" [attr.download]="a.nombre"><mat-icon>download</mat-icon> Descargar</a> }
            @else { <small>(dato de prueba sin archivo)</small> }
          </p>
        }
      </mat-card>
      <div class="hoja"><app-formato-oficial-view [hv]="h" /></div>
    }
  `,
  styles: `
    .resumen { padding: 14px 18px; margin-bottom: 16px; }
    dl { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 8px 18px; margin: 0; }
    dt { font-size: 0.75rem; color: #7b8794; text-transform: uppercase; font-weight: 600; }
    dd { margin: 0; font-weight: 500; }
    .archivo { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin: 12px 0 0; }
    .hoja { background: #dfe6f0; padding: 24px 8px; border-radius: 12px; overflow-x: auto; }
    @media print { .hoja { background: none; padding: 0; } }
  `,
})
export class AdminHojaVidaVerComponent implements OnInit {
  readonly id = input.required<string>();
  private readonly admin = inject(AdminService);
  protected readonly inst = inject(InstitucionService);
  protected readonly hv = signal<HojaVida | null>(null);
  protected readonly titulo = computed(() => {
    const d = this.hv()?.datosPersonales;
    return d ? `${d.nombres} ${d.primerApellido} ${d.segundoApellido ?? ''}` : 'Hoja de vida';
  });
  protected readonly nivel = computed(() => (this.hv() ? nivelMaximo(this.hv()!) : ''));
  protected readonly alineado = computed(() => (this.hv() ? docenteAlineado(this.hv()!) : null));
  protected readonly vinculacion = computed(() => this.inst.tiposVinculacion.find((t) => t.valor === this.hv()?.institucional?.tipoVinculacion)?.etiqueta ?? '—');

  ngOnInit(): void {
    this.inst.cargarSedes().subscribe();
    this.admin.hojaVida(Number(this.id())).subscribe((h) => this.hv.set(h));
  }

  imprimir(): void {
    window.print();
  }
}
