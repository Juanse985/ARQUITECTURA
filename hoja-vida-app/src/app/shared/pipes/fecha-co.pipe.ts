import { Pipe, PipeTransform } from '@angular/core';
import { formatoColombiano } from '../../core/utils/date-utils';

/** Muestra una fecha ISO o Date en formato colombiano dd/mm/aaaa. */
@Pipe({ name: 'fechaCo' })
export class FechaCoPipe implements PipeTransform {
  transform(valor: string | Date | null | undefined): string {
    return formatoColombiano(valor);
  }
}
