import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorMessagePipe } from '../../../shared/pipes/error-message.pipe';

@Component({
  selector: 'app-recuperar-contrasena',
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, ErrorMessagePipe],
  template: `
    <mat-card class="auth-card" appearance="outlined">
      <h2>Recuperar contraseña</h2>
      <p class="sub">Te enviaremos un enlace para restablecer tu contraseña.</p>
      <form [formGroup]="form" (ngSubmit)="enviar()" novalidate>
        <mat-form-field>
          <mat-label>Correo electrónico</mat-label>
          <input matInput type="email" formControlName="email" autocomplete="email" required />
          <mat-error>{{ form.controls.email.errors | errorMsg }}</mat-error>
        </mat-form-field>
        <div class="acciones">
          <button mat-flat-button type="submit" [disabled]="enviando()"><mat-icon>send</mat-icon> Enviar enlace</button>
        </div>
      </form>
      <div class="links"><a routerLink="/auth/login">← Volver a iniciar sesión</a></div>
    </mat-card>
  `,
  styleUrl: '../auth-card.scss',
})
export class RecuperarContrasenaComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly alert = inject(AlertService);
  protected readonly enviando = signal(false);
  protected readonly form = this.fb.nonNullable.group({ email: ['', [Validators.required, Validators.email]] });

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.auth.recuperarPassword(this.form.getRawValue().email).subscribe({
      next: (r) => {
        void this.alert.exito('Solicitud enviada', r.mensaje);
        this.form.reset();
      },
      error: () => this.enviando.set(false),
      complete: () => this.enviando.set(false),
    });
  }
}
