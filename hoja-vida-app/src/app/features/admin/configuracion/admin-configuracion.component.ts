import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { TieneCambiosSinGuardar } from '../../../core/guards/unsaved-changes.guard';
import { AlertService } from '../../../core/services/alert.service';
import { GeminiService } from '../../../core/services/gemini.service';
import { InstitucionService } from '../../../core/services/institucion.service';
import { PageTitleComponent } from '../../../shared/components/page-title/page-title.component';
import { ErrorMessagePipe } from '../../../shared/pipes/error-message.pipe';
import { LOGOS_INSTITUCIONALES } from '../../../shared/components/logo-placeholder/logo-placeholder.component';

const MAX_LOGO = 500 * 1024;

/** Nombre y logo de la institución + parámetros de la importación con IA. */
@Component({
  selector: 'app-admin-configuracion',
  imports: [ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatSlideToggleModule, PageTitleComponent, ErrorMessagePipe],
  template: `
    <app-page-title titulo="Institución e inteligencia artificial" subtitulo="Estos datos aparecen en la barra superior, el login y el formato impreso." icono="settings" />
    <form [formGroup]="form" (ngSubmit)="guardar()" novalidate class="grid">
      <mat-card appearance="outlined" class="card">
        <h2>Institución</h2>
        <mat-form-field><mat-label>Nombre de la institución</mat-label><input matInput formControlName="nombre" required /><mat-error>{{ form.controls.nombre.errors | errorMsg }}</mat-error></mat-form-field>
        <mat-form-field><mat-label>Sigla</mat-label><input matInput formControlName="sigla" required /><mat-error>{{ form.controls.sigla.errors | errorMsg }}</mat-error></mat-form-field>
        <mat-form-field><mat-label>Sitio web</mat-label><input matInput formControlName="sitioWeb" placeholder="https://" /><mat-error>{{ form.controls.sitioWeb.errors | errorMsg }}</mat-error></mat-form-field>

        <h3>Logo</h3>
        <div class="logo">
          <div class="preview">
            <img [src]="form.controls.logoUrl.value || logoPorDefecto" alt="Logo actual" />
          </div>
          <div class="acciones-logo">
            <label class="subir">
              <input type="file" accept="image/png,image/jpeg,image/webp" (change)="subirLogo($event)" />
              <mat-icon>upload</mat-icon> Cargar logo (PNG/JPG/WebP, máx. 500 KB)
            </label>
            @if (form.controls.logoUrl.value) {
              <button mat-button type="button" (click)="quitarLogo()"><mat-icon>restart_alt</mat-icon> Volver al logo por defecto</button>
            }
            <small>Si no carga uno, se usa el logo de UNIMINUTO incluido en el proyecto (public/branding). SVG no se admite por seguridad.</small>
          </div>
        </div>
      </mat-card>

      <mat-card appearance="outlined" class="card">
        <h2>Importación de hojas de vida con IA (Gemini)</h2>
        <mat-slide-toggle formControlName="iaHabilitada">Permitir que los usuarios importen su hoja de vida con IA</mat-slide-toggle>
        <mat-form-field class="modelo">
          <mat-label>Modelo de Gemini</mat-label>
          <input matInput formControlName="modeloIa" />
          <mat-hint>Si el modelo no existe para la API key, la app elige automáticamente un modelo "flash" disponible.</mat-hint>
        </mat-form-field>
        <div class="key">
          <p><mat-icon>key</mat-icon> API key en esta pestaña: <b>{{ tieneKey() ? 'configurada' : 'no configurada' }}</b></p>
          @if (tieneKey()) {
            <button mat-stroked-button type="button" (click)="olvidarKey()"><mat-icon>delete</mat-icon> Borrar key de la sesión</button>
          }
        </div>
        <div class="alerta">
          <mat-icon>shield</mat-icon>
          <span>
            <b>Modo demostración.</b> En esta versión el navegador llama a Gemini y la API key se guarda solo en la pestaña (sessionStorage).
            En producción la llamada debe hacerla el backend FastAPI con la key en variables de entorno del servidor (ver docs/SEGURIDAD.md).
          </span>
        </div>
      </mat-card>

      <div class="pie">
        <button mat-button type="button" (click)="cargar()" [disabled]="!form.dirty">Descartar</button>
        <button mat-flat-button type="submit" [disabled]="!form.dirty"><mat-icon>save</mat-icon> Guardar configuración</button>
      </div>
    </form>
  `,
  styles: `
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; @media (max-width: 960px) { grid-template-columns: 1fr; } }
    .card { padding: 16px 18px; display: flex; flex-direction: column; gap: 6px; }
    h2 { margin: 0 0 10px; font-size: 1.05rem; color: #0b2d6b; }
    h3 { margin: 6px 0; font-size: 0.92rem; color: #163f8a; }
    .logo { display: flex; gap: 16px; align-items: center; flex-wrap: wrap; }
    .preview { width: 200px; height: 90px; border: 1px dashed #cbd2d9; border-radius: 10px; display: flex; align-items: center; justify-content: center; background: #162645; color: #cbd2d9;
      img { max-width: 180px; max-height: 76px; object-fit: contain; } }
    .acciones-logo { display: flex; flex-direction: column; gap: 6px; flex: 1; small { color: #7b8794; } }
    .subir { display: inline-flex; align-items: center; gap: 6px; cursor: pointer; padding: 8px 14px; border-radius: 20px; background: #f2b705; color: #061a40; font-weight: 600; font-size: 0.85rem; width: fit-content;
      input { position: absolute; opacity: 0; width: 1px; } &:focus-within { outline: 3px solid #163f8a; } }
    .modelo { margin-top: 14px; }
    .key p { display: flex; align-items: center; gap: 6px; margin: 8px 0; }
    .alerta { display: flex; gap: 8px; background: #fdf3d1; color: #6b4f00; border-radius: 10px; padding: 10px 12px; font-size: 0.85rem; margin-top: 10px; }
    .pie { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 10px; }
  `,
})
export class AdminConfiguracionComponent implements OnInit, TieneCambiosSinGuardar {
  private readonly fb = inject(FormBuilder);
  private readonly inst = inject(InstitucionService);
  private readonly alert = inject(AlertService);
  private readonly gemini = inject(GeminiService);
  protected readonly tieneKey = signal(false);
  protected readonly logoPorDefecto = LOGOS_INSTITUCIONALES.completo;

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(120)]],
    sigla: ['', [Validators.required, Validators.maxLength(20)]],
    sitioWeb: this.fb.control<string | null>(null, Validators.pattern(/^https:\/\/[^\s<>"']+$/)),
    logoUrl: this.fb.control<string | null>(null),
    iaHabilitada: [true],
    modeloIa: ['', [Validators.required, Validators.pattern(/^[a-z0-9.\-]+$/)]],
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.form.reset(this.inst.config());
    this.tieneKey.set(this.gemini.tieneApiKey());
  }

  tieneCambiosSinGuardar(): boolean {
    return this.form.dirty;
  }

  async subirLogo(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f) return;
    // Verifica la firma real del archivo (no solo la extensión).
    const b = new Uint8Array(await f.slice(0, 12).arrayBuffer());
    const hex = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
    const valido = hex.startsWith('89504e47') || hex.startsWith('ffd8ff') || (hex.startsWith('52494646') && hex.slice(16, 24) === '57454250');
    if (!valido) {
      void this.alert.error('Archivo no válido', 'El logo debe ser una imagen PNG, JPG o WebP.');
      return;
    }
    if (f.size > MAX_LOGO) {
      void this.alert.error('Archivo muy grande', 'El logo no debe superar 500 KB.');
      return;
    }
    const r = new FileReader();
    r.onload = () => {
      this.form.controls.logoUrl.setValue(r.result as string);
      this.form.markAsDirty();
    };
    r.readAsDataURL(f);
  }

  quitarLogo(): void {
    this.form.controls.logoUrl.setValue(null);
    this.form.markAsDirty();
  }

  olvidarKey(): void {
    this.gemini.olvidarApiKey();
    this.tieneKey.set(false);
    this.alert.toast('API key eliminada de la sesión');
  }

  async guardar(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (!(await this.alert.confirmarGuardar('¿Deseas guardar la configuración de la institución?'))) return;
    this.inst.actualizarConfiguracion(this.form.getRawValue()).subscribe(() => {
      this.form.markAsPristine();
      void this.alert.exito('Configuración guardada', 'El nombre y el logo ya se muestran en toda la aplicación.');
    });
  }
}
