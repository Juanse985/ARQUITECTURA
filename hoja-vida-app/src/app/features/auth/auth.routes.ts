import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'login' },
  {
    path: 'login',
    title: 'Iniciar sesión · SIGEHV',
    loadComponent: () => import('./login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'registro',
    title: 'Crear cuenta · SIGEHV',
    loadComponent: () => import('./registro/registro.component').then((m) => m.RegistroComponent),
  },
  {
    path: 'recuperar',
    title: 'Recuperar contraseña · SIGEHV',
    loadComponent: () =>
      import('./recuperar-contrasena/recuperar-contrasena.component').then((m) => m.RecuperarContrasenaComponent),
  },
];
