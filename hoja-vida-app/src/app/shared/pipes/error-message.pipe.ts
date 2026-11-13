import { Pipe, PipeTransform } from '@angular/core';
import { ValidationErrors } from '@angular/forms';

/** Traduce los errores de validación de un control a un mensaje en español. */
export function mensajeValidacion(errors: ValidationErrors | null | undefined): string {
  if (!errors) return '';
  const [clave, valor] = Object.entries(errors)[0];
  switch (clave) {
    case 'required': return 'Este campo es obligatorio.';
    case 'email': return 'Ingresa un correo electrónico válido.';
    case 'minlength': return `Debe tener al menos ${valor.requiredLength} caracteres.`;
    case 'maxlength': return `Debe tener máximo ${valor.requiredLength} caracteres.`;
    case 'min': return `El valor mínimo es ${valor.min}.`;
    case 'max': return `El valor máximo es ${valor.max}.`;
    case 'pattern': return 'El formato no es válido.';
    case 'passwordSegura': return 'Mínimo 8 caracteres, con al menos una mayúscula y un número.';
    case 'noCoincide': return 'Las contraseñas no coinciden.';
    case 'telefono': return 'Ingresa un teléfono válido (7 a 20 dígitos).';
    case 'documento': return 'Solo letras y números, entre 3 y 20 caracteres.';
    case 'soloNumeros': return 'Solo se permiten números.';
    case 'fechaFutura': return 'La fecha no puede ser posterior a hoy.';
    case 'edadMinima': return `Debes tener al menos ${valor.min} años.`;
    case 'matDatepickerParse': return 'Fecha no válida. Usa el formato dd/mm/aaaa.';
    case 'matDatepickerMax': return 'La fecha supera el máximo permitido.';
    case 'matDatepickerMin': return 'La fecha es anterior al mínimo permitido.';
    case 'rangoFechas': return 'La fecha de retiro no puede ser anterior a la de ingreso.';
    case 'noAceptado': return 'Debes aceptar para continuar.';
    default: return 'Valor no válido.';
  }
}

@Pipe({ name: 'errorMsg' })
export class ErrorMessagePipe implements PipeTransform {
  transform(errors: ValidationErrors | null | undefined): string {
    return mensajeValidacion(errors);
  }
}
