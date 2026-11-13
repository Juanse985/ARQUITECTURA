import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import Swal from 'sweetalert2';
import { AlertService } from '../../../core/services/alert.service';
import { GeminiService, HojaVidaParcial, TAMANO_MAX_HV } from '../../../core/services/gemini.service';
import { ImportacionService } from '../../../core/services/importacion.service';
import { InstitucionService } from '../../../core/services/institucion.service';
import { CatalogosService } from '../../../core/services/catalogos.service';
import { PageTitleComponent } from '../../../shared/components/page-title/page-title.component';
import { FechaCoPipe } from '../../../shared/pipes/fecha-co.pipe';

type Paso = 'seleccionar' | 'procesando' | 'revisar';

/**
 * Importar una hoja de vida en CUALQUIER formato (PDF, Word, imagen o texto).
 * 1) El usuario sube el archivo; 2) Gemini extrae los datos; 3) el usuario revisa
 * y los aplica al formulario (solo campos vacíos o sobrescribiendo).
 * El archivo original queda guardado con la hoja de vida.
 */
@Component({
  selector: 'app-importar-hoja-vida',
  imports: [FormsModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatCheckboxModule, MatRadioModule, MatProgressBarModule, PageTitleComponent, FechaCoPipe],
  templateUrl: './importar-hoja-vida.component.html',
  styleUrl: './importar-hoja-vida.component.scss',
})
export class ImportarHojaVidaComponent {
  private readonly gemini = inject(GeminiService);
  private readonly importacion = inject(ImportacionService);
  private readonly alert = inject(AlertService);
  private readonly router = inject(Router);
  protected readonly inst = inject(InstitucionService);
  protected readonly c = inject(CatalogosService);

  protected readonly paso = signal<Paso>('seleccionar');
  protected readonly archivo = signal<File | null>(null);
  protected readonly resultado = signal<HojaVidaParcial | null>(null);
  protected readonly arrastrando = signal(false);
  protected consentimiento = false;
  protected modo: 'vacios' | 'sobrescribir' = 'vacios';
  protected readonly maxMb = TAMANO_MAX_HV / 1024 / 1024;
  protected readonly iaHabilitada = computed(() => this.inst.config().iaHabilitada);
  protected readonly formato = computed(() => {
    const a = this.archivo();
    return a ? this.gemini.formatoDe(a) : null;
  });

  seleccionar(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.validarYTomar(input.files?.[0] ?? null);
    input.value = '';
  }

  soltar(e: DragEvent): void {
    e.preventDefault();
    this.arrastrando.set(false);
    this.validarYTomar(e.dataTransfer?.files?.[0] ?? null);
  }

  private validarYTomar(f: File | null): void {
    if (!f) return;
    if (!this.gemini.formatoDe(f)) {
      void this.alert.error('Formato no permitido', 'Sube la hoja de vida en PDF, Word (.docx), JPG, PNG o TXT.');
      return;
    }
    if (f.size > TAMANO_MAX_HV) {
      void this.alert.error('Archivo muy grande', `El archivo no debe superar ${this.maxMb} MB.`);
      return;
    }
    this.archivo.set(f);
    this.resultado.set(null);
    this.paso.set('seleccionar');
  }

  quitar(): void {
    this.archivo.set(null);
    this.resultado.set(null);
    this.paso.set('seleccionar');
  }

  /** Pide la API key solo para esta sesión del navegador (no se guarda en el código ni en el servidor). */
  private async asegurarApiKey(): Promise<boolean> {
    if (this.gemini.tieneApiKey()) return true;
    const r = await Swal.fire({
      title: 'API key de Gemini',
      html:
        'Para leer la hoja de vida con IA se necesita una API key de <b>Google AI Studio</b>.<br>' +
        '<small>Se guarda solo en esta pestaña (sessionStorage) y se borra al cerrarla. ' +
        'Modo demostración: en producción la llamada la hace el servidor.</small>',
      input: 'password',
      inputPlaceholder: 'AIza...',
      inputAttributes: { autocomplete: 'off', 'aria-label': 'API key de Gemini' },
      showCancelButton: true,
      confirmButtonText: 'Usar esta key',
      cancelButtonText: 'Cancelar',
      customClass: { popup: 'sigehv-swal', confirmButton: 'sigehv-btn-confirm', cancelButton: 'sigehv-btn-cancel' },
      reverseButtons: true,
      inputValidator: (v) => (!v || v.trim().length < 20 ? 'Ingresa una API key válida.' : null),
    });
    if (!r.isConfirmed || !r.value) return false;
    this.gemini.guardarApiKeySesion(String(r.value));
    return true;
  }

  async analizar(): Promise<void> {
    const f = this.archivo();
    if (!f) return;
    if (!this.consentimiento) {
      void this.alert.info('Autorización requerida', 'Debes autorizar el envío del documento al servicio de IA para continuar.', 'warning');
      return;
    }
    if (!(await this.asegurarApiKey())) return;
    this.paso.set('procesando');
    try {
      const r = await this.gemini.extraer(f);
      this.resultado.set(r);
      this.paso.set('revisar');
      this.alert.toast(`La IA encontró ${r.camposEncontrados} datos`);
    } catch (e) {
      this.paso.set('seleccionar');
      const msg = (e as Error).message ?? 'Error desconocido';
      if (/API key/i.test(msg)) this.gemini.olvidarApiKey();
      void this.alert.error('No se pudo analizar la hoja de vida', msg.replace(/[<>]/g, ''));
    }
  }

  aplicar(): void {
    const f = this.archivo();
    if (!f) return;
    this.importacion.establecer({ parcial: this.resultado(), archivo: f, modo: this.modo, conIa: !!this.resultado() });
    void this.router.navigate(['/hoja-vida/editar']);
  }

  /** Solo guardar el archivo original, sin IA (el usuario llena el formulario a mano). */
  async soloArchivo(): Promise<void> {
    const f = this.archivo();
    if (!f) return;
    const ok = await this.alert.confirmar('Guardar sin IA', 'Se adjuntará tu hoja de vida original y luego diligenciarás el formulario manualmente.', 'Continuar');
    if (!ok) return;
    this.importacion.establecer({ parcial: null, archivo: f, modo: this.modo, conIa: false });
    void this.router.navigate(['/hoja-vida/editar']);
  }

  tamanoKb(n: number): string {
    return n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.round(n / 1024)} KB`;
  }
}
