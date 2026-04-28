import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { routePageTransition } from '../../core/animations/animations';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-app-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  animations: [routePageTransition],
  template: `
    <div class="min-h-screen bg-muted/30 flex flex-col w-full">
      <header
        class="sticky top-0 z-40 bg-card border-b border-border px-4 py-3 sm:px-6 sm:py-3 flex flex-wrap items-center gap-2 sm:gap-6 shrink-0 w-full shadow-sm/50"
      >
        <a
          [routerLink]="homeLink()"
          class="w-10 h-10 rounded-xl gradient-hero flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          [attr.aria-label]="auth.isCliente() ? 'Mi cartera' : 'Cartera'"
        >
          <span class="text-primary-foreground font-bold text-lg">L</span>
        </a>
        @if (auth.isAdmin()) {
          <nav class="flex items-center gap-1 flex-1 min-w-0 flex-wrap">
            <a
              routerLink="/dashboard"
              routerLinkActive="bg-primary text-primary-foreground shadow-sm"
              [routerLinkActiveOptions]="{ exact: false }"
              class="nav-pill px-3 py-2 sm:px-4 rounded-full flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
              Cartera
            </a>
            <a
              routerLink="/propiedades"
              routerLinkActive="bg-primary text-primary-foreground shadow-sm"
              [routerLinkActiveOptions]="{ exact: true }"
              class="nav-pill px-3 py-2 sm:px-4 rounded-full flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/></svg>
              Propiedades
            </a>
            <a
              routerLink="/graficos"
              routerLinkActive="bg-primary text-primary-foreground shadow-sm"
              class="nav-pill px-3 py-2 sm:px-4 rounded-full flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary shrink-0"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
              Informes
            </a>
          </nav>
        } @else if (auth.isCliente()) {
          <nav class="flex items-center gap-1 flex-1 min-w-0">
            <span class="text-sm font-medium text-foreground px-2">Mi información</span>
            <a
              routerLink="/mi-cartera"
              routerLinkActive="bg-primary text-primary-foreground shadow-sm"
              class="nav-pill px-3 py-2 sm:px-4 rounded-full flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-primary hover:bg-secondary"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="shrink-0"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
              Ver mis datos
            </a>
          </nav>
        }
        <button
          type="button"
          (click)="salir()"
          class="nav-pill px-3 py-2 sm:px-4 rounded-full flex items-center gap-2 text-xs sm:text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 ml-auto sm:ml-0"
        >
          Salir
        </button>
      </header>
      <main class="flex-1 overflow-auto w-full min-w-0">
        <div
          [@routePageTransition]="{ value: routeAnimState, params: animParams }"
          class="min-h-full"
        >
          <router-outlet />
        </div>
      </main>
    </div>
  `,
})
export class AppLayout {
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  homeLink(): string {
    return this.auth.isCliente() ? '/mi-cartera' : '/dashboard';
  }

  async salir(): Promise<void> {
    await this.auth.logout();
    void this.router.navigate(['/']);
  }

  get routeAnimState(): string {
    return this.router.url || '/';
  }

  get animParams(): { duration: number; ease: string } {
    if (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return { duration: 1, ease: 'linear' };
    }
    return { duration: 220, ease: 'cubic-bezier(0.25, 0.1, 0.25, 1)' };
  }
}
