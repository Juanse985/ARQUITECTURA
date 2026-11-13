import { Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { ErrorMessagePipe } from '../../pipes/error-message.pipe';

/**
 * Mensaje de error para controles que NO están dentro de un mat-form-field
 * (radio buttons, checkboxes). Se muestra cuando el control fue tocado.
 */
@Component({
  selector: 'app-field-error',
  imports: [ErrorMessagePipe],
  template: `
    @if (control()?.invalid && (control()?.touched || control()?.dirty)) {
      <p class="field-error-text" role="alert">{{ control()?.errors | errorMsg }}</p>
    }
  `,
})
export class FieldErrorComponent {
  readonly control = input<AbstractControl | null>();
}
