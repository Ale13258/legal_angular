import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/admin.guard';
import { authGuard } from './core/guards/auth.guard';
import { clienteGuard } from './core/guards/cliente.guard';
import { guestGuard } from './core/guards/guest.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/welcome-page/welcome-page').then((m) => m.WelcomePage) },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login-page/login-page').then((m) => m.LoginPage),
  },
  {
    path: 'registro',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/registro-page/registro-page').then((m) => m.RegistroPage),
  },
  {
    path: '',
    loadComponent: () => import('./layout/app-layout/app-layout').then((m) => m.AppLayout),
    canActivate: [authGuard],
    children: [
      {
        path: 'mi-cartera',
        canActivate: [clienteGuard],
        loadComponent: () =>
          import('./pages/cliente-portal-page/cliente-portal-page').then((m) => m.ClientePortalPage),
      },
      {
        path: 'dashboard',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/dashboard-page/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'usuarios',
        canActivate: [superAdminGuard],
        loadComponent: () =>
          import('./pages/usuarios-page/usuarios-page').then((m) => m.UsuariosPage),
      },
      {
        path: 'clientes/nuevo',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/nuevo-cliente-page/nuevo-cliente-page').then((m) => m.NuevoClientePage),
      },
      {
        path: 'clientes/:id',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/cliente-detail-page/cliente-detail-page').then((m) => m.ClienteDetailPage),
      },
      {
        path: 'propiedades',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/cuentas-page/cuentas-page').then((m) => m.CuentasPage),
      },
      {
        path: 'propiedades/:id',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/cuenta-detail-page/cuenta-detail-page').then(
            (m) => m.CuentaDetailPage
          ),
      },
      { path: 'cuentas', redirectTo: 'propiedades', pathMatch: 'full' },
      { path: 'cuentas/:id', redirectTo: 'propiedades/:id' },
      {
        path: 'graficos',
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./pages/graficos-page/graficos-page').then((m) => m.GraficosPage),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () =>
      import('./pages/not-found-page/not-found-page').then((m) => m.NotFoundPage),
  },
];
