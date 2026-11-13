import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../environments/environment';
import { InstitucionService } from '../../core/services/institucion.service';
import { LogoPlaceholderComponent } from '../../shared/components/logo-placeholder/logo-placeholder.component';

interface Beneficio {
  icono: string;
  titulo: string;
  texto: string;
}

/** Layout público (login, registro, recuperar contraseña) con panel de bienvenida institucional. */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterOutlet, MatIconModule, LogoPlaceholderComponent],
  templateUrl: './auth-layout.component.html',
  styleUrl: './auth-layout.component.scss',
})
export class AuthLayoutComponent implements OnInit {
  protected readonly app = environment;
  protected readonly inst = inject(InstitucionService);
  protected readonly anio = new Date().getFullYear();

  protected readonly beneficios: Beneficio[] = [
    { icono: 'description', titulo: 'Formato Único oficial', texto: 'Diligencia la hoja de vida Persona Natural paso a paso.' },
    { icono: 'auto_awesome', titulo: 'Importa con IA', texto: 'Sube tu HV en PDF, Word o foto y Gemini llena los campos.' },
    { icono: 'save', titulo: 'Guarda borradores', texto: 'Avanza a tu ritmo y retoma cuando quieras.' },
    { icono: 'print', titulo: 'Lista para imprimir', texto: 'Descárgala en PDF con el formato oficial.' },
  ];

  ngOnInit(): void {
    this.inst.cargarSedes().subscribe();
  }
}
