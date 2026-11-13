import { Directive, HostListener } from '@angular/core';

/** Impide escribir caracteres que no sean dígitos en un input. */
@Directive({ selector: '[appSoloNumeros]' })
export class SoloNumerosDirective {
  private readonly permitidas = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Enter'];

  @HostListener('keydown', ['$event'])
  onKeyDown(e: KeyboardEvent): void {
    if (this.permitidas.includes(e.key) || e.ctrlKey || e.metaKey) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  }

  @HostListener('paste', ['$event'])
  onPaste(e: ClipboardEvent): void {
    const texto = e.clipboardData?.getData('text') ?? '';
    if (!/^\d*$/.test(texto)) e.preventDefault();
  }
}
