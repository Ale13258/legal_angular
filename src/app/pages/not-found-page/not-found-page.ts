import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found-page',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="min-h-screen flex flex-col items-center justify-center px-6 text-muted-foreground">
      <h1 class="text-2xl font-bold mb-2 text-foreground">Página no encontrada</h1>
      <p class="mb-6">La ruta solicitada no existe.</p>
      <a
        routerLink="/dashboard"
        class="nav-pill rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        Volver al Dashboard
      </a>
    </div>
  `,
})
export class NotFoundPage {}
