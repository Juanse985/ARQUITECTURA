import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { HojaVidaService } from '../../../core/services/hoja-vida.service';
import { PageTitleComponent } from '../../../shared/components/page-title/page-title.component';
import { FormatoOficialViewComponent } from '../components/formato-oficial-view/formato-oficial-view.component';

/** Página de la hoja de vida en el formato oficial, lista para imprimir (carta). */
@Component({
  selector: 'app-formato-oficial',
  imports: [RouterLink, MatButtonModule, MatIconModule, PageTitleComponent, FormatoOficialViewComponent],
  template: `
    <div class="no-print">
      <app-page-title titulo="Formato oficial" subtitulo="Vista lista para imprimir en tamaño carta o guardar como PDF." icono="print">
        <a mat-button routerLink="/hoja-vida/editar"><mat-icon>edit</mat-icon> Editar</a>
        <button mat-flat-button type="button" (click)="imprimir()" [disabled]="!hv.hojaVida()"><mat-icon>print</mat-icon> Imprimir / PDF</button>
      </app-page-title>
    </div>
    @if (cargado()) {
      @if (hv.hojaVida(); as h) {
        <div class="hoja">
          <app-formato-oficial-view [hv]="h" />
        </div>
      } @else {
        <div class="vacio">
          <mat-icon>description</mat-icon>
          <p>Aún no has creado tu hoja de vida.</p>
          <a mat-flat-button routerLink="/hoja-vida/editar"><mat-icon>add</mat-icon> Crear hoja de vida</a>
        </div>
      }
    }
  `,
  styles: `
    .hoja { background: #dfe6f0; padding: 24px 8px; border-radius: 12px; overflow-x: auto; }
    .vacio { text-align: center; padding: 48px; color: #3e4c59; mat-icon { font-size: 56px; width: 56px; height: 56px; color: #0b2d6b; } }
    @media print { .hoja { background: none; padding: 0; } }
  `,
})
export class FormatoOficialComponent implements OnInit {
  protected readonly hv = inject(HojaVidaService);
  protected readonly cargado = signal(false);

  ngOnInit(): void {
    this.hv.obtener().subscribe(() => this.cargado.set(true));
  }

  imprimir(): void {
    window.print();
  }
}
