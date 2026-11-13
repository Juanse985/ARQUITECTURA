import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SeccionLista, HojaVidaService } from '../../../core/services/hoja-vida.service';
import { AlertService } from '../../../core/services/alert.service';
import { CatalogosService } from '../../../core/services/catalogos.service';
import { InstitucionService } from '../../../core/services/institucion.service';
import { docenteAlineado, nivelMaximo } from '../../../core/utils/perfil-profesional';
import { PageTitleComponent } from '../../../shared/components/page-title/page-title.component';
import { CatalogoLabelPipe } from '../../../shared/pipes/catalogo-label.pipe';
import { FechaCoPipe } from '../../../shared/pipes/fecha-co.pipe';

/** Detalle de la hoja de vida: consulta por secciones y eliminación de registros. */
@Component({
  selector: 'app-hoja-vida-detalle',
  imports: [
    RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatTableModule, MatTooltipModule, MatProgressBarModule,
    PageTitleComponent, CatalogoLabelPipe, FechaCoPipe,
  ],
  templateUrl: './hoja-vida-detalle.component.html',
  styleUrl: './hoja-vida-detalle.component.scss',
})
export class HojaVidaDetalleComponent implements OnInit {
  protected readonly hvService = inject(HojaVidaService);
  protected readonly c = inject(CatalogosService);
  protected readonly inst = inject(InstitucionService);
  protected readonly nivel = computed(() => (this.hv() ? nivelMaximo(this.hv()!) : ''));
  protected readonly alineado = computed(() => (this.hv() ? docenteAlineado(this.hv()!) : null));
  private readonly alert = inject(AlertService);
  private readonly router = inject(Router);

  protected readonly cargado = signal(false);
  protected readonly hv = this.hvService.hojaVida;
  protected readonly dp = computed(() => this.hv()?.datosPersonales ?? null);
  protected readonly lugarNac = computed(() => this.c.ubicacionLegible(this.dp()?.lugarNacimiento));
  protected readonly ubicCorr = computed(() => this.c.ubicacionLegible(this.dp()?.ubicacionCorrespondencia));

  protected readonly colEstudios = ['modalidad', 'titulo', 'semestres', 'graduado', 'terminacion', 'acciones'];
  protected readonly colIdiomas = ['idioma', 'habla', 'lee', 'escribe', 'acciones'];
  protected readonly colExp = ['empresa', 'tipo', 'cargo', 'ingreso', 'retiro', 'acciones'];

  ngOnInit(): void {
    this.inst.cargarSedes().subscribe();
    this.hvService.obtener().subscribe(() => this.cargado.set(true));
  }

  etiquetaVinculacion(v: string | null | undefined): string {
    return this.inst.tiposVinculacion.find((t) => t.valor === v)?.etiqueta ?? '—';
  }
  etiquetaArea(v: string | null | undefined): string {
    return this.inst.areas.find((a) => a.valor === v)?.etiqueta ?? '—';
  }

  async eliminarArchivo(): Promise<void> {
    const hv = this.hv();
    if (!hv?.archivoOriginal) return;
    if (!(await this.alert.confirmarEliminar(`el archivo ${hv.archivoOriginal.nombre}`))) return;
    this.hvService.eliminarArchivoOriginal(hv.id).subscribe(() => this.alert.toast('Archivo eliminado'));
  }

  editar(paso: number): void {
    void this.router.navigate(['/hoja-vida/editar'], { queryParams: { paso } });
  }

  /** DELETE /api/hoja-vida/{id}/{seccion}/{itemId} con confirmación. */
  async eliminarItem(seccion: SeccionLista, itemId: number | undefined, nombre: string): Promise<void> {
    const hv = this.hv();
    if (!hv || !itemId) return;
    if (!(await this.alert.confirmarEliminar(nombre))) return;
    this.hvService.eliminarItem(hv.id, seccion, itemId).subscribe(() => this.alert.toast('Registro eliminado'));
  }

  async eliminarHojaVida(): Promise<void> {
    const hv = this.hv();
    if (!hv) return;
    if (!(await this.alert.confirmarEliminar('toda tu hoja de vida'))) return;
    this.hvService.eliminar(hv.id).subscribe(() => void this.alert.exito('Hoja de vida eliminada'));
  }

  mesAnio(mes: number | null, anio: number | null): string {
    if (!mes && !anio) return '—';
    const m = this.c.meses.find((x) => x.valor === mes)?.etiqueta ?? '';
    return `${m} ${anio ?? ''}`.trim();
  }
}
