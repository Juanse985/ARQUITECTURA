import { Component, OnInit, computed, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { AuthService } from '../../core/services/auth.service';
import { HojaVidaService } from '../../core/services/hoja-vida.service';
import { PageTitleComponent } from '../../shared/components/page-title/page-title.component';

interface AccesoRapido {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string;
  queryParams?: Record<string, string | number>;
}

/** Inicio: estado de la hoja de vida (completitud por sección) y accesos rápidos. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DatePipe, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule, PageTitleComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  protected readonly hv = inject(HojaVidaService);

  protected readonly saludo = computed(() => {
    const h = new Date().getHours();
    return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  });

  protected readonly accesos: AccesoRapido[] = [
    { titulo: 'Diligenciar hoja de vida', descripcion: 'Completa o edita el Formato Único paso a paso.', icono: 'edit_note', ruta: '/hoja-vida/editar' },
    { titulo: 'Importar HV con IA', descripcion: 'Sube tu hoja de vida en PDF, Word o foto y Gemini llena el formato.', icono: 'auto_awesome', ruta: '/hoja-vida/importar' },
    { titulo: 'Ver detalle', descripcion: 'Consulta y administra estudios, idiomas y experiencias.', icono: 'badge', ruta: '/hoja-vida' },
    { titulo: 'Formato oficial', descripcion: 'Vista previa lista para imprimir en tamaño carta.', icono: 'print', ruta: '/hoja-vida/formato' },
    { titulo: 'Mi cuenta', descripcion: 'Actualiza tus datos de acceso y contraseña.', icono: 'manage_accounts', ruta: '/perfil' },
  ];

  protected readonly accesosAdmin: AccesoRapido[] = [
    { titulo: 'Panel de administración', descripcion: 'Estadísticas, mapa de sedes y docentes enfocados en su carrera.', icono: 'insights', ruta: '/admin' },
  ];

  ngOnInit(): void {
    this.hv.obtener().subscribe();
  }

  colorPorcentaje(p: number): string {
    return p === 100 ? 'completo' : p >= 50 ? 'medio' : 'bajo';
  }
}
