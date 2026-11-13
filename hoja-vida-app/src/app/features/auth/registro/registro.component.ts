import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CustomValidators } from '../../../core/validators/custom-validators';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { FieldErrorComponent } from '../../../shared/components/field-error/field-error.component';
import { ErrorMessagePipe } from '../../../shared/pipes/error-message.pipe';

@Component({
  selector: 'app-registro',
  imports: [
    ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatCheckboxModule, ErrorMessagePipe, FieldErrorComponent,
  ],
  templateUrl: './registro.component.html',
  styleUrl: '../auth-card.scss',
})
export class RegistroComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alert = inject(AlertService);

  protected readonly verPassword = signal(false);
  protected readonly enviando = signal(false);

  protected readonly form = this.fb.nonNullable.group(
    {
      nombres: ['', [Validators.required, Validators.maxLength(80)]],
      apellidos: ['', [Validators.required, Validators.maxLength(80)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, CustomValidators.passwordSegura()]],
      confirmarPassword: ['', [Validators.required]],
      aceptaTerminos: [false, [CustomValidators.aceptado()]],
    },
    { validators: CustomValidators.coinciden('password', 'confirmarPassword') },
  );

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { nombres, apellidos, email, password } = this.form.getRawValue();
    this.enviando.set(true);
    this.auth.registrar({ nombres, apellidos, email, password }).subscribe({
      next: async () => {
        await this.alert.exito('¡Cuenta creada!', 'Ya puedes diligenciar tu hoja de vida.');
        void this.router.navigate(['/hoja-vida/editar']);
      },
      error: () => this.enviando.set(false),
      complete: () => this.enviando.set(false),
    });
  }
}
