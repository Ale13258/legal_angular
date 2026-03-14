import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/welcome-page/welcome-page').then((m) => m.WelcomePage) },
  {
    path: '',
    loadComponent: () => import('./layout/app-layout/app-layout').then((m) => m.AppLayout),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard-page/dashboard-page').then((m) => m.DashboardPage),
      },
      {
        path: 'clientes/nuevo',
        loadComponent: () =>
          import('./pages/nuevo-cliente-page/nuevo-cliente-page').then((m) => m.NuevoClientePage),
      },
      {
        path: 'clientes/:id',
        loadComponent: () =>
          import('./pages/cliente-detail-page/cliente-detail-page').then((m) => m.ClienteDetailPage),
      },
      {
        path: 'propiedades',
        loadComponent: () =>
          import('./pages/propiedades-page/propiedades-page').then((m) => m.PropiedadesPage),
      },
      {
        path: 'propiedades/:id',
        loadComponent: () =>
          import('./pages/propiedad-detail-page/propiedad-detail-page').then(
            (m) => m.PropiedadDetailPage
          ),
      },
      {
        path: 'graficos',
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
