import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { TieneCambiosSinGuardar } from '../../core/guards/unsaved-changes.guard';
import { AlertService } from '../../core/services/alert.service';
import { AuthService } from '../../core/services/auth.service';
import { HojaVidaService } from '../../core/services/hoja-vida.service';
import { CustomValidators } from '../../core/validators/custom-validators';
import { PageTitleComponent } from '../../shared/components/page-title/page-title.component';
import { ErrorMessagePipe } from '../../shared/pipes/error-message.pipe';
import { FechaCoPipe } from '../../shared/pipes/fecha-co.pipe';
import { Router } from '@angular/router';

/** Datos de la cuenta del usuario: nombres, correo y cambio de contraseña. */
@Component({
  selector: 'app-perfil',
  imports: [
    ReactiveFormsModule, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule,
    PageTitleComponent, ErrorMessagePipe, FechaCoPipe,
  ],
  templateUrl: './perfil.component.html',
  styleUrl: './perfil.component.scss',
})
export class PerfilComponent implements OnInit, TieneCambiosSinGuardar {
  private readonly fb = inject(FormBuilder);
  private readonly alert = inject(AlertService);
  private readonly hojaVida = inject(HojaVidaService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly verPassword = signal(false);

  protected readonly datos = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.maxLength(80)]],
    apellidos: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly password = this.fb.nonNullable.group(
    {
      passwordActual: ['', Validators.required],
      passwordNueva: ['', [Validators.required, CustomValidators.passwordSegura()]],
      confirmarPassword: ['', Validators.required],
    },
    { validators: CustomValidators.coinciden('passwordNueva', 'confirmarPassword') },
  );

  ngOnInit(): void {
    this.cargar();
  }

  private cargar(): void {
    const u = this.auth.usuario();
    if (u) this.datos.reset({ nombres: u.nombres, apellidos: u.apellidos, email: u.email });
  }

  tieneCambiosSinGuardar(): boolean {
    return this.datos.dirty || this.password.dirty;
  }

  async guardarDatos(): Promise<void> {
    if (this.datos.invalid) {
      this.datos.markAllAsTouched();
      return;
    }
    if (!(await this.alert.confirmar('Actualizar cuenta', '¿Deseas actualizar los datos de tu cuenta?', 'Sí, actualizar'))) return;
    this.auth.actualizarPerfil(this.datos.getRawValue()).subscribe(() => {
      this.cargar();
      void this.alert.exito('Cuenta actualizada', 'Tus datos se actualizaron correctamente.');
    });
  }

  async cambiarPassword(): Promise<void> {
    if (this.password.invalid) {
      this.password.markAllAsTouched();
      return;
    }
    if (!(await this.alert.confirmar('Cambiar contraseña', '¿Deseas cambiar tu contraseña?', 'Sí, cambiar'))) return;
    const { passwordActual, passwordNueva } = this.password.getRawValue();
    this.auth.cambiarPassword({ passwordActual, passwordNueva }).subscribe((r) => {
      this.password.reset();
      void this.alert.exito('Contraseña actualizada', r.mensaje);
    });
  }

  descartar(): void {
    this.cargar();
    this.password.reset();
  }

  async eliminarHojaVida(): Promise<void> {
    const hv = this.hojaVida.hojaVida();
    if (!hv) {
      await this.alert.info('Sin hoja de vida', 'Aún no has creado tu hoja de vida.');
      return;
    }
    if (!(await this.alert.confirmarEliminar('toda tu hoja de vida (todas las secciones)'))) return;
    this.hojaVida.eliminar(hv.id).subscribe(async () => {
      await this.alert.exito('Hoja de vida eliminada');
      void this.router.navigate(['/inicio']);
    });
  }
}
