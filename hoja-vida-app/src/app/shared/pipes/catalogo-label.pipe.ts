import { Pipe, PipeTransform } from '@angular/core';
import { OpcionCatalogo } from '../../core/models';

/** Devuelve la etiqueta (o la descripción) de un valor de catálogo. */
@Pipe({ name: 'catalogoLabel' })
export class CatalogoLabelPipe implements PipeTransform {
  transform<T>(valor: T | null | undefined, lista: OpcionCatalogo<T>[], descripcion = false): string {
    const op = lista.find((o) => o.valor === valor);
    if (!op) return '';
    return descripcion ? (op.descripcion ?? op.etiqueta) : op.etiqueta;
  }
}
