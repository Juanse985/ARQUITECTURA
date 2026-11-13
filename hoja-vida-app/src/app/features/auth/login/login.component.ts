import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { environment } from '../../../../environments/environment';
import { AlertService } from '../../../core/services/alert.service';
import { AuthService } from '../../../core/services/auth.service';
import { ErrorMessagePipe } from '../../../shared/pipes/error-message.pipe';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, ErrorMessagePipe],
  templateUrl: './login.component.html',
  styleUrl: '../auth-card.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alert = inject(AlertService);

  /** Query params enlazados como inputs (withComponentInputBinding). */
  readonly returnUrl = input<string>();
  readonly sesion = input<string>();

  protected readonly verPassword = signal(false);
  protected readonly enviando = signal(false);
  protected readonly modoDemo = environment.useMock;

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  enviar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (u) => {
        this.alert.toast(`¡Bienvenido(a), ${u.nombres.split(' ')[0]}!`);
        void this.router.navigateByUrl(this.returnUrl() || (u.rol === 'ADMIN' ? '/admin' : '/inicio'));
      },
      error: () => this.enviando.set(false),
      complete: () => this.enviando.set(false),
    });
  }

  usarDemo(admin = false): void {
    this.form.setValue(admin ? { email: 'admin@uniminuto.edu.co', password: 'Admin1234' } : { email: 'demo@uniminuto.edu.co', password: 'Demo1234' });
  }
}
