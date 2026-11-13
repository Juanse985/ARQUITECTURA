import { AbstractControl, FormArray, ValidationErrors, ValidatorFn } from '@angular/forms';
import { REGEX } from '../constants/app.constants';
import { edad, hoy } from '../utils/date-utils';

/** Validadores personalizados reutilizables. Los mensajes se resuelven en FieldErrorComponent. */
export class CustomValidators {
  /** Contraseña: mínimo 8 caracteres, al menos una mayúscula y un número. */
  static passwordSegura(): ValidatorFn {
    return (c: AbstractControl): ValidationErrors | null => {
      const v = c.value as string;
      if (!v) return null;
      return REGEX.password.test(v) ? null : { passwordSegura: true };
    };
  }

  /** Valida en un FormGroup que dos controles tengan el mismo valor. */
  static coinciden(campo: string, confirmacion: string): ValidatorFn {
    return (g: AbstractControl): ValidationErrors | null => {
      const a = g.get(campo);
      const b = g.get(confirmacion);
      if (!a || !b) return null;
      const err = a.value && b.value && a.value !== b.value;
      if (err) {
        b.setErrors({ ...(b.errors ?? {}), noCoincide: true });
      } else if (b.hasError('noCoincide')) {
        const { noCoincide, ...resto } = b.errors ?? {};
        b.setErrors(Object.keys(resto).length ? resto : null);
      }
      return null;
    };
  }

  static patron(regex: RegExp, clave: string): ValidatorFn {
    return (c: AbstractControl): ValidationErrors | null => {
      const v = c.value;
      if (v === null || v === undefined || v === '') return null;
      return regex.test(String(v)) ? null : { [clave]: true };
    };
  }

  /** La fecha no puede ser posterior a hoy. */
  static fechaNoFutura(): ValidatorFn {
    return (c: AbstractControl): ValidationErrors | null => {
      const v = c.value as Date | null;
      if (!v) return null;
      return v > hoy() ? { fechaFutura: true } : null;
    };
  }

  /** Edad mínima (por defecto 14 años). */
  static edadMinima(min = 14): ValidatorFn {
    return (c: AbstractControl): ValidationErrors | null => {
      const v = c.value as Date | null;
      if (!v) return null;
      return edad(v) < min ? { edadMinima: { min } } : null;
    };
  }

  /** Grupo de experiencia: fecha de retiro >= fecha de ingreso. */
  static rangoFechas(inicio: string, fin: string): ValidatorFn {
    return (g: AbstractControl): ValidationErrors | null => {
      const a = g.get(inicio)?.value as Date | null;
      const b = g.get(fin)?.value as Date | null;
      if (a && b && b < a) return { rangoFechas: true };
      return null;
    };
  }

  /** En un FormArray de experiencias, detecta períodos que se cruzan. */
  static sinCruceFechas(): ValidatorFn {
    return (arr: AbstractControl): ValidationErrors | null => {
      if (!(arr instanceof FormArray)) return null;
      const periodos = arr.controls
        .map((c, i) => ({
          i,
          ini: c.get('fechaIngreso')?.value as Date | null,
          fin: (c.get('empleoActual')?.value ? hoy() : c.get('fechaRetiro')?.value) as Date | null,
        }))
        .filter((p): p is { i: number; ini: Date; fin: Date } => !!p.ini && !!p.fin && p.fin >= p.ini);
      const cruces: [number, number][] = [];
      for (let x = 0; x < periodos.length; x++) {
        for (let y = x + 1; y < periodos.length; y++) {
          const a = periodos[x];
          const b = periodos[y];
          if (a.ini <= b.fin && b.ini <= a.fin) cruces.push([a.i + 1, b.i + 1]);
        }
      }
      return cruces.length ? { cruceFechas: cruces } : null;
    };
  }

  /** Solo un empleo puede marcarse como actual. */
  static unSoloEmpleoActual(): ValidatorFn {
    return (arr: AbstractControl): ValidationErrors | null => {
      if (!(arr instanceof FormArray)) return null;
      const n = arr.controls.filter((c) => c.get('empleoActual')?.value).length;
      return n > 1 ? { variosEmpleosActuales: true } : null;
    };
  }

  /** Checkbox obligatorio (requiredTrue con mensaje propio). */
  static aceptado(): ValidatorFn {
    return (c: AbstractControl): ValidationErrors | null => (c.value === true ? null : { noAceptado: true });
  }
}
