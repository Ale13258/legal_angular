import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="min-h-screen bg-muted/30 flex flex-col">
      <header
        class="bg-card border-b border-border px-6 py-3 flex items-center gap-6 shrink-0"
      >
        <a routerLink="/" class="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center mr-4">
          <span class="text-primary-foreground font-bold text-lg">L</span>
        </a>
        <nav class="flex items-center gap-1 flex-1">
          <a
            routerLink="/dashboard"
            routerLinkActive="bg-primary text-primary-foreground"
            [routerLinkActiveOptions]="{ exact: false }"
            class="px-4 py-2 rounded-full flex items-center gap-2 transition-all text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
            Cartera
          </a>
          <a
            routerLink="/propiedades"
            routerLinkActive="bg-primary text-primary-foreground"
            [routerLinkActiveOptions]="{ exact: true }"
            class="px-4 py-2 rounded-full flex items-center gap-2 transition-all text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
            Propiedades
          </a>
          <a
            routerLink="/graficos"
            routerLinkActive="bg-primary text-primary-foreground"
            class="px-4 py-2 rounded-full flex items-center gap-2 transition-all text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>
            Gráficos
          </a>
        </nav>
        <a
          routerLink="/"
          class="px-4 py-2 rounded-full flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title="Salir"
        >
          Salir
        </a>
      </header>
      <main class="flex-1 overflow-auto">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AppLayout {}
