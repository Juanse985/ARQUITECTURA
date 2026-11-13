import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { CatalogosService } from '../../../../core/services/catalogos.service';
import { SeccionHeaderComponent } from '../../components/seccion-header/seccion-header.component';

/**
 * Paso 6 – OBSERVACIONES DEL JEFE DE RECURSOS HUMANOS Y/O CONTRATOS.
 * Solo lectura en esta versión: la diligencia la entidad receptora.
 */
@Component({
  selector: 'app-paso6-observaciones-rrhh',
  imports: [MatIconModule, SeccionHeaderComponent],
  template: `
    <app-seccion-header
      numero="6"
      titulo="Observaciones del jefe de recursos humanos y/o contratos"
      descripcion="Sección de solo lectura: la diligencia la entidad receptora de la hoja de vida."
    />
    <div class="aviso"><mat-icon>lock</mat-icon> Esta sección no es editable por el aspirante.</div>
    <fieldset class="rrhh" disabled aria-readonly="true">
      <p class="texto">{{ catalogos.textos.certificacionRrhh }}</p>
      <div class="lineas" aria-label="Observaciones (vacío)">
        <span></span><span></span><span></span>
      </div>
      <div class="pie">
        <div class="campo"><span class="linea"></span><small>Firma del jefe de personal o de contratos</small></div>
        <div class="campo"><span class="linea"></span><small>Ciudad y fecha</small></div>
      </div>
    </fieldset>
  `,
  styles: `
    .aviso { display: flex; gap: 8px; align-items: center; color: #3e4c59; background: #f5f7fa; padding: 10px 14px; border-radius: 10px; margin-bottom: 12px; }
    .rrhh { border: 1px solid #cbd2d9; border-radius: 12px; padding: 16px; background: #fafbfc; margin: 0; }
    .texto { margin-top: 0; color: #1f2933; }
    .lineas span { display: block; border-bottom: 1px solid #7b8794; height: 28px; }
    .pie { display: flex; gap: 32px; flex-wrap: wrap; margin-top: 40px; }
    .campo { flex: 1; min-width: 220px; display: flex; flex-direction: column; gap: 4px; color: #3e4c59; }
    .linea { border-bottom: 1px solid #1f2933; height: 28px; }
  `,
})
export class Paso6ObservacionesRrhhComponent {
  protected readonly catalogos = inject(CatalogosService);
}
