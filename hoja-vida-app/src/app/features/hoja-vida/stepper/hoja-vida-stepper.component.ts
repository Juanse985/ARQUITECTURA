import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, HostListener, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable, concat, debounceTime, defaultIfEmpty, finalize, last, map, of, switchMap } from 'rxjs';
import { TieneCambiosSinGuardar } from '../../../core/guards/unsaved-changes.guard';
import { HojaVida, OrigenHojaVida } from '../../../core/models';
import { ImportacionService } from '../../../core/services/importacion.service';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { HojaVidaService } from '../../../core/services/hoja-vida.service';
import { CompletitudSeccion, calcularCompletitud } from '../../../core/utils/completitud';
import { PageTitleComponent } from '../../../shared/components/page-title/page-title.component';
import { HojaVidaFormFactory } from '../services/hoja-vida-form.factory';
import { Paso1DatosPersonalesComponent } from '../steps/paso1-datos-personales/paso1-datos-personales.component';
import { Paso2FormacionComponent } from '../steps/paso2-formacion/paso2-formacion.component';
import { Paso3ExperienciaComponent } from '../steps/paso3-experiencia/paso3-experiencia.component';
import { Paso4TiempoComponent } from '../steps/paso4-tiempo/paso4-tiempo.component';
import { Paso5DeclaracionComponent } from '../steps/paso5-declaracion/paso5-declaracion.component';
import { Paso6ObservacionesRrhhComponent } from '../steps/paso6-observaciones-rrhh/paso6-observaciones-rrhh.component';
import { Paso7ResumenComponent } from '../steps/paso7-resumen/paso7-resumen.component';

/**
 * Contenedor (componente "inteligente") del formulario por pasos.
 * - Construye el formulario con HojaVidaFormFactory y lo reparte a cada paso.
 * - Guarda borrador al avanzar, calcula completitud y controla cambios sin guardar.
 */
@Component({
  selector: 'app-hoja-vida-stepper',
  imports: [
    ReactiveFormsModule, RouterLink, MatStepperModule, MatButtonModule, MatIconModule, MatCardModule, MatTooltipModule,
    PageTitleComponent, Paso1DatosPersonalesComponent, Paso2FormacionComponent, Paso3ExperienciaComponent,
    Paso4TiempoComponent, Paso5DeclaracionComponent, Paso6ObservacionesRrhhComponent, Paso7ResumenComponent,
  ],
  templateUrl: './hoja-vida-stepper.component.html',
  styleUrl: './hoja-vida-stepper.component.scss',
})
export class HojaVidaStepperComponent implements OnInit, TieneCambiosSinGuardar {
  /** Query param ?paso=N (enlazado por withComponentInputBinding). */
  readonly paso = input<string>();

  private readonly factory = inject(HojaVidaFormFactory);
  private readonly hvService = inject(HojaVidaService);
  private readonly auth = inject(AuthService);
  private readonly alert = inject(AlertService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly bp = inject(BreakpointObserver);

  protected readonly form = this.factory.crearFormulario();
  protected readonly f = this.form.controls;

  protected readonly cargado = signal(false);
  protected readonly guardando = signal(false);
  protected readonly indice = signal(0);
  protected readonly existe = computed(() => !!this.hvService.hojaVida());
  protected readonly vertical = toSignal(this.bp.observe('(max-width: 959.98px)').pipe(map((r) => r.matches)), { initialValue: false });
  protected readonly completitud = signal<CompletitudSeccion[]>([]);
  protected readonly vistaPrevia = signal<HojaVida | null>(null);
  protected readonly ultimoGuardado = signal<Date | null>(null);

  /** Archivos seleccionados que aún no se han subido (multipart). */
  private fotoPendiente = false;
  /** Archivo original (PDF/DOCX/imagen) por subir tras guardar. */
  private archivoPendiente: { archivo: File; conIa: boolean } | null = null;
  private origen: OrigenHojaVida = 'FORMULARIO';
  private readonly importacion = inject(ImportacionService);
  private firmaPendiente = false;
  private cargando = false;

  protected readonly titulosPasos = [
    'Datos personales', 'Formación académica', 'Experiencia laboral', 'Tiempo de experiencia',
    'Declaración y firma', 'Observaciones RR. HH.', 'Resumen y vista previa',
  ];

  ngOnInit(): void {
    this.form.valueChanges.pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.actualizarCompletitud());

    this.f.datosPersonales.controls.fotoUrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => { if (!this.cargando) this.fotoPendiente = !!v; });
    this.f.declaracion.controls.firmaUrl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((v) => { if (!this.cargando) this.firmaPendiente = !!v; });

    this.hvService.obtener().subscribe((hv) => {
      this.cargarEnFormulario(hv);
      this.aplicarImportacion();
      const p = Number(this.paso());
      if (!isNaN(p) && p >= 0 && p < this.titulosPasos.length) this.indice.set(p);
      this.cargado.set(true);
    });
  }

  /** Si el usuario viene de "Importar HV", combina los datos extraídos con el formulario. */
  private aplicarImportacion(): void {
    const imp = this.importacion.tomar();
    if (!imp) return;
    this.archivoPendiente = { archivo: imp.archivo, conIa: imp.conIa };
    let n = 0;
    if (imp.parcial) {
      n = this.factory.combinar(this.form, imp.parcial, imp.modo);
      this.origen = 'IMPORTADA_IA';
    }
    this.form.markAsDirty();
    this.actualizarCompletitud();
    void this.alert.info(
      imp.parcial ? 'Datos importados con IA' : 'Archivo listo para guardar',
      imp.parcial
        ? `Se completaron <b>${n}</b> campos o registros desde <b>${imp.archivo.name.replace(/[<>&"']/g, '')}</b>.<br>Revisa cada paso: la IA puede equivocarse. Los campos en rojo faltan por diligenciar.`
        : 'Tu hoja de vida original se guardará junto con el formulario cuando pulses Guardar o Siguiente.',
      'success',
    );
  }

  private cargarEnFormulario(hv: HojaVida | null): void {
    this.cargando = true;
    this.origen = hv?.origen ?? 'FORMULARIO';
    if (hv) {
      this.factory.cargar(this.form, hv);
    } else {
      // Hoja de vida nueva: precarga los datos de la cuenta.
      const u = this.auth.usuario();
      if (u) this.f.datosPersonales.patchValue({ nombres: u.nombres, primerApellido: u.apellidos.split(' ')[0] ?? '', segundoApellido: u.apellidos.split(' ').slice(1).join(' ') || null, email: u.email });
    }
    this.fotoPendiente = false;
    this.firmaPendiente = false;
    this.cargando = false;
    this.form.markAsPristine();
    this.form.markAsUntouched();
    this.actualizarCompletitud();
  }

  private actualizarCompletitud(): void {
    this.completitud.set(calcularCompletitud(this.factory.aVistaPrevia(this.form, this.hvService.hojaVida())));
  }

  porcentajePaso(i: number): number | null {
    return this.completitud().find((s) => s.paso === i)?.porcentaje ?? null;
  }

  /** Nombres de las secciones con errores de validación. */
  seccionesInvalidas(): string[] {
    const r: string[] = [];
    if (this.f.datosPersonales.invalid || this.f.institucional.invalid) r.push('1. Datos personales y vinculación');
    if (this.f.formacion.invalid) r.push('2. Formación académica');
    if (this.f.experiencia.invalid) r.push('3. Experiencia laboral');
    if (this.f.tiempo.invalid) r.push('4. Tiempo de experiencia');
    if (this.f.declaracion.invalid) r.push('5. Declaración y firma');
    return r;
  }

  alCambiarPaso(i: number): void {
    this.indice.set(i);
    if (i === 6) {
      this.vistaPrevia.set(this.factory.aVistaPrevia(this.form, this.hvService.hojaVida()));
    }
    // Lleva el foco al inicio del paso (accesibilidad).
    setTimeout(() => document.querySelector<HTMLElement>('#contenido-principal')?.scrollIntoView({ behavior: 'smooth' }));
  }

  // ------------------------------------------------------------------ Guardado
  private persistir(silencioso: boolean): Observable<HojaVida> {
    const payload = this.factory.aPayload(this.form, { omitirFoto: this.fotoPendiente, omitirFirma: this.firmaPendiente, origen: this.origen });
    return this.hvService.guardar(payload, silencioso).pipe(
      switchMap((hv) => {
        this.factory.sincronizarIds(this.form, hv);
        const subidas: Observable<unknown>[] = [];
        const foto = this.f.datosPersonales.controls.fotoUrl.value;
        const firma = this.f.declaracion.controls.firmaUrl.value;
        if (this.fotoPendiente && foto) subidas.push(this.hvService.subirFoto(hv.id, dataUrlABlob(foto), 'foto.png'));
        if (this.firmaPendiente && firma) subidas.push(this.hvService.subirFirma(hv.id, dataUrlABlob(firma), 'firma.png'));
        const original = this.archivoPendiente;
        if (original) subidas.push(this.hvService.subirArchivoOriginal(hv.id, original.archivo, original.conIa));
        if (!subidas.length) return of(hv);
        return concat(...subidas).pipe(
          defaultIfEmpty(null),
          last(),
          switchMap(() => {
            this.fotoPendiente = false;
            this.firmaPendiente = false;
            this.archivoPendiente = null;
            return this.hvService.obtener().pipe(map((r) => r ?? hv));
          }),
        );
      }),
    );
  }

  /** Validez combinada del paso 1 (datos personales + vinculación institucional). */
  paso1Invalido(): boolean {
    return this.f.datosPersonales.invalid || this.f.institucional.invalid;
  }

  validarPaso1(): { invalid: boolean; markAllAsTouched: () => void } {
    return {
      invalid: this.paso1Invalido(),
      markAllAsTouched: () => {
        this.f.datosPersonales.markAllAsTouched();
        this.f.institucional.markAllAsTouched();
      },
    };
  }

  /** Avanza al siguiente paso guardando un borrador del progreso. */
  siguiente(stepper: MatStepper, control?: { invalid: boolean; markAllAsTouched: () => void }): void {
    if (control?.invalid) {
      control.markAllAsTouched();
      return;
    }
    if (!this.form.dirty && !this.archivoPendiente) {
      stepper.next();
      return;
    }
    this.guardando.set(true);
    this.persistir(true)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe(() => {
        this.form.markAsPristine();
        this.ultimoGuardado.set(new Date());
        this.alert.toast('Borrador guardado');
        stepper.next();
      });
  }

  async guardarFinal(): Promise<void> {
    const invalidas = this.seccionesInvalidas();
    if (invalidas.length) {
      this.form.markAllAsTouched();
      const ok = await this.alert.confirmar(
        'Hoja de vida incompleta',
        `Faltan datos obligatorios en:<br><b>${invalidas.join('<br>')}</b><br><br>¿Deseas guardarla como <b>borrador</b>?`,
        'Guardar borrador',
        'warning',
      );
      if (!ok) return;
    } else if (!(await this.alert.confirmarGuardar())) {
      return;
    }
    this.guardando.set(true);
    this.persistir(false)
      .pipe(finalize(() => this.guardando.set(false)))
      .subscribe(async (hv) => {
        this.form.markAsPristine();
        this.ultimoGuardado.set(new Date());
        this.vistaPrevia.set(this.factory.aVistaPrevia(this.form, hv));
        await this.alert.exito(
          invalidas.length ? 'Borrador guardado' : '¡Hoja de vida guardada!',
          invalidas.length ? 'Puedes completarla cuando quieras.' : 'Tu hoja de vida quedó registrada correctamente.',
        );
        if (!invalidas.length) void this.router.navigate(['/hoja-vida']);
      });
  }

  async descartar(): Promise<void> {
    if (!this.form.dirty) return;
    if (!(await this.alert.confirmar('Descartar cambios', '¿Deseas descartar los cambios no guardados?', 'Sí, descartar', 'warning'))) return;
    this.cargarEnFormulario(this.hvService.hojaVida());
    this.alert.toast('Cambios descartados', 'info');
  }

  imprimir(): void {
    document.body.classList.add('imprimiendo-vista-previa');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('imprimiendo-vista-previa');
    });
  }

  // ------------------------------------------------------------------ Cambios sin guardar
  tieneCambiosSinGuardar(): boolean {
    return (this.form.dirty || !!this.archivoPendiente) && !this.guardando();
  }

  @HostListener('window:beforeunload', ['$event'])
  antesDeSalir(e: BeforeUnloadEvent): void {
    if (this.tieneCambiosSinGuardar()) e.preventDefault();
  }
}

/** Convierte un data URL (base64) en Blob para enviarlo como multipart/form-data. */
function dataUrlABlob(dataUrl: string): Blob {
  const [cab, datos] = dataUrl.split(',');
  const mime = /data:(.*?);/.exec(cab)?.[1] ?? 'image/png';
  const bin = atob(datos);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
