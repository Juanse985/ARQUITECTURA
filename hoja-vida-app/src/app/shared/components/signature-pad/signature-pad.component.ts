import { AfterViewInit, Component, ElementRef, forwardRef, inject, signal, viewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { AlertService } from '../../../core/services/alert.service';

/**
 * Captura de firma: dibujarla en un canvas o subir una imagen.
 * Funciona como control de formulario (ControlValueAccessor) cuyo valor es un data URL PNG.
 */
@Component({
  selector: 'app-signature-pad',
  imports: [MatButtonModule, MatButtonToggleModule, MatIconModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SignaturePadComponent), multi: true }],
  template: `
    <div class="firma">
      <mat-button-toggle-group [value]="modo()" (change)="modo.set($event.value)" aria-label="Forma de ingresar la firma" [disabled]="deshabilitado">
        <mat-button-toggle value="dibujar"><mat-icon>draw</mat-icon> Dibujar</mat-button-toggle>
        <mat-button-toggle value="subir"><mat-icon>upload</mat-icon> Subir imagen</mat-button-toggle>
      </mat-button-toggle-group>

      @if (valor()) {
        <div class="preview">
          <img [src]="valor()" alt="Firma registrada" />
          <button mat-stroked-button type="button" (click)="limpiar()" [disabled]="deshabilitado">
            <mat-icon>delete</mat-icon> Quitar firma
          </button>
        </div>
      }

      <div [hidden]="modo() !== 'dibujar' || !!valor()">
        <canvas
          #lienzo
          width="500"
          height="160"
          tabindex="0"
          aria-label="Área para dibujar la firma con el mouse o el dedo"
          (pointerdown)="iniciar($event)"
          (pointermove)="mover($event)"
          (pointerup)="terminar()"
          (pointerleave)="terminar()"
        ></canvas>
        <div class="acciones">
          <button mat-button type="button" (click)="borrarLienzo()"><mat-icon>backspace</mat-icon> Limpiar</button>
          <button mat-flat-button type="button" (click)="usarDibujo()" [disabled]="!hayTrazo()">
            <mat-icon>check</mat-icon> Usar esta firma
          </button>
        </div>
      </div>

      @if (modo() === 'subir' && !valor()) {
        <label class="subir">
          <input type="file" accept="image/png,image/jpeg" (change)="subir($event)" [disabled]="deshabilitado" />
          <mat-icon>image</mat-icon> Seleccionar imagen (PNG o JPG, máx. 1 MB)
        </label>
      }
    </div>
  `,
  styles: `
    .firma { display: flex; flex-direction: column; gap: 12px; }
    canvas { width: 100%; max-width: 500px; height: 160px; border: 2px dashed #cbd2d9; border-radius: 10px;
      background: #fff; touch-action: none; cursor: crosshair; display: block; }
    .acciones { display: flex; gap: 8px; margin-top: 8px; }
    .preview { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
    .preview img { max-height: 90px; max-width: 280px; border-bottom: 1px solid #3e4c59; background: #fff; }
    .subir { display: inline-flex; align-items: center; gap: 8px; cursor: pointer; padding: 12px 16px;
      border: 2px dashed #cbd2d9; border-radius: 10px; color: #163f8a; }
    .subir input { position: absolute; opacity: 0; width: 1px; }
  `,
})
export class SignaturePadComponent implements ControlValueAccessor, AfterViewInit {
  private readonly alert = inject(AlertService);
  private readonly lienzo = viewChild.required<ElementRef<HTMLCanvasElement>>('lienzo');
  private ctx?: CanvasRenderingContext2D | null;
  private dibujando = false;

  protected readonly modo = signal<'dibujar' | 'subir'>('dibujar');
  protected readonly valor = signal<string | null>(null);
  protected readonly hayTrazo = signal(false);
  protected deshabilitado = false;

  private onChange: (v: string | null) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    this.ctx = this.lienzo().nativeElement.getContext('2d');
    if (this.ctx) {
      this.ctx.lineWidth = 2.2;
      this.ctx.lineCap = 'round';
      this.ctx.strokeStyle = '#061a40';
    }
  }

  private punto(e: PointerEvent): { x: number; y: number } {
    const c = this.lienzo().nativeElement;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * c.width) / r.width, y: ((e.clientY - r.top) * c.height) / r.height };
  }

  iniciar(e: PointerEvent): void {
    if (this.deshabilitado || !this.ctx) return;
    this.dibujando = true;
    const p = this.punto(e);
    this.ctx.beginPath();
    this.ctx.moveTo(p.x, p.y);
  }

  mover(e: PointerEvent): void {
    if (!this.dibujando || !this.ctx) return;
    const p = this.punto(e);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
    this.hayTrazo.set(true);
  }

  terminar(): void {
    this.dibujando = false;
  }

  borrarLienzo(): void {
    const c = this.lienzo().nativeElement;
    this.ctx?.clearRect(0, 0, c.width, c.height);
    this.hayTrazo.set(false);
  }

  usarDibujo(): void {
    this.establecer(this.lienzo().nativeElement.toDataURL('image/png'));
  }

  subir(e: Event): void {
    const archivo = (e.target as HTMLInputElement).files?.[0];
    if (!archivo) return;
    if (archivo.size > 1024 * 1024) {
      (e.target as HTMLInputElement).value = '';
      void this.alert.error('Archivo muy grande', 'La imagen de la firma no debe superar 1 MB.');
      return;
    }
    const r = new FileReader();
    r.onload = () => this.establecer(r.result as string);
    r.readAsDataURL(archivo);
  }

  limpiar(): void {
    this.borrarLienzo();
    this.establecer(null);
  }

  private establecer(v: string | null): void {
    this.valor.set(v);
    this.onChange(v);
    this.onTouched();
  }

  writeValue(v: string | null): void {
    this.valor.set(v ?? null);
  }
  registerOnChange(fn: (v: string | null) => void): void {
    this.onChange = fn;
  }
  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }
  setDisabledState(d: boolean): void {
    this.deshabilitado = d;
  }
}
