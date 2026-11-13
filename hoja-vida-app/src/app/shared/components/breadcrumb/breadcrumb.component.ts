import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { filter, startWith } from 'rxjs';
import { computed } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';

interface Miga {
  etiqueta: string;
  url: string;
}

/** Migas de pan construidas a partir de `data.breadcrumb` de cada ruta. */
@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink, MatIconModule],
  template: `
    <nav class="breadcrumb no-print" aria-label="Ruta de navegación">
      <ol>
        <li><a [routerLink]="inicio()" aria-label="Inicio"><mat-icon>home</mat-icon></a></li>
        @for (m of migas(); track m.url; let ultimo = $last) {
          <li>
            <mat-icon class="sep" aria-hidden="true">chevron_right</mat-icon>
            @if (ultimo) {
              <span aria-current="page">{{ m.etiqueta }}</span>
            } @else {
              <a [routerLink]="m.url">{{ m.etiqueta }}</a>
            }
          </li>
        }
      </ol>
    </nav>
  `,
  styles: `
    .breadcrumb ol { list-style: none; display: flex; align-items: center; flex-wrap: wrap; margin: 0; padding: 0; font-size: 0.85rem; }
    li { display: flex; align-items: center; }
    a { color: #163f8a; text-decoration: none; display: flex; align-items: center; }
    a:hover { text-decoration: underline; }
    mat-icon { font-size: 18px; width: 18px; height: 18px; }
    .sep { color: #7b8794; margin: 0 2px; }
    span { color: #3e4c59; font-weight: 600; }
  `,
})
export class BreadcrumbComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly migas = signal<Miga[]>([]);
  private readonly auth = inject(AuthService);
  protected readonly inicio = computed(() => (this.auth.esAdmin() ? '/admin' : '/inicio'));

  constructor() {
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), startWith(null), takeUntilDestroyed())
      .subscribe(() => this.migas.set(this.construir(this.route.root)));
  }

  private construir(ruta: ActivatedRoute, url = '', migas: Miga[] = []): Miga[] {
    for (const hijo of ruta.children) {
      const snap = hijo.snapshot;
      if (!snap) return migas;
      const segmento = snap.url.map((s) => s.path).join('/');
      const nuevaUrl = segmento ? `${url}/${segmento}` : url;
      const etiqueta = snap.data['breadcrumb'] as string | undefined;
      if (etiqueta && !migas.some((m) => m.etiqueta === etiqueta)) migas.push({ etiqueta, url: nuevaUrl || '/' });
      return this.construir(hijo, nuevaUrl, migas);
    }
    return migas;
  }
}
