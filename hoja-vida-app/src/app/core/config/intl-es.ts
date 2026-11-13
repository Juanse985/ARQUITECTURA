import { Injectable } from '@angular/core';
import { MatStepperIntl } from '@angular/material/stepper';

/** Textos del stepper en español. */
@Injectable()
export class StepperIntlEs extends MatStepperIntl {
  override optionalLabel = 'Opcional';
  override completedLabel = 'Completado';
  override editableLabel = 'Editable';
}
