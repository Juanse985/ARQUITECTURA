import { Component, computed, inject, input } from '@angular/core';
import { InstitucionService } from '../../../core/services/institucion.service';

/** Logos institucionales incluidos en el proyecto (public/branding). */
export const LOGOS_INSTITUCIONALES = {
  completo: 'branding/uniminuto-logo.png',
  icono: 'branding/uniminuto-md.png',
  iconoTransparente: 'branding/uniminuto-md-transparente.png',
} as const;

/**
 * Logo de la institución.
 * - Si el administrador cargó un logo (Administración > Institución e IA), se usa ese.
 * - Si no, se usan los logos de UNIMINUTO incluidos en `public/branding/`.
 * Variantes: 'completo' (MD + nombre) o 'icono' (solo MD).
 */
@Component({
  selector: 'app-logo-placeholder',
  template: `<img class="logo" [class]="'logo ' + variante() + (grande() ? ' grande' : '')" [src]="src()" [alt]="'Logo ' + inst.nombre()" />`,
  styles: `
    :host { display: inline-flex; }
    .logo { display: block; object-fit: contain; }
    .completo { height: 44px; max-width: 170px; border-radius: 4px; }
    .icono { height: 44px; width: auto; border-radius: 6px; }
    .completo.grande { height: 96px; max-width: 340px; border-radius: 8px; }
    .icono.grande { height: 88px; }
  `,
})
export class LogoPlaceholderComponent {
  readonly grande = input(false);
  readonly variante = input<'completo' | 'icono'>('completo');
  protected readonly inst = inject(InstitucionService);
  protected readonly src = computed(() => this.inst.logoUrl() ?? (this.variante() === 'icono' ? LOGOS_INSTITUCIONALES.icono : LOGOS_INSTITUCIONALES.completo));
}
