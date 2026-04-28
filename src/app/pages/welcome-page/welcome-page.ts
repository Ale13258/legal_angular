import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { fadeInUp, fadeInUpStagger } from '../../core/animations/animations';

const WELCOME_FEATURES = [
  { label: 'Clientes', desc: 'Gestiona tu base de clientes', path: '/dashboard', icon: 'users' },
  { label: 'Propiedades', desc: 'Administra inmuebles y cartera', path: '/propiedades', icon: 'building' },
  { label: 'Informes', desc: 'Analítica y reportes financieros', path: '/graficos', icon: 'report' },
] as const;

@Component({
  selector: 'app-welcome-page',
  standalone: true,
  imports: [RouterLink],
  animations: [fadeInUp, fadeInUpStagger],
  template: `
    <div class="min-h-screen bg-background flex flex-col">
      <!-- Header -->
      <header class="border-b border-border bg-card page-container py-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
        <a routerLink="/" class="flex items-center gap-2">
          <span class="text-primary" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 22V10"/>
              <path d="M12 10L6 16"/>
              <path d="M12 10l6 6"/>
              <path d="M6 16H4a1 1 0 0 1-1-1v-2a1 1 0 0 1 1-1h2"/>
              <path d="M18 16h2a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1h-2"/>
              <path d="M6 16a2 2 0 1 1 0-4 2 2 0 0 1 0 4Z"/>
              <path d="M18 16a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/>
            </svg>
          </span>
          <span class="font-display font-bold text-xl text-foreground">LegalTech</span>
        </a>
        <div class="flex flex-wrap items-center gap-2">
          <a
            routerLink="/login"
            class="nav-pill inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-5 py-2.5 font-medium text-sm hover:opacity-95 shadow-sm"
          >
            Entrar al sistema
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </a>
          <a
            routerLink="/registro"
            class="nav-pill inline-flex items-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 font-medium text-sm text-foreground hover:bg-muted"
          >
            Registrarse
          </a>
        </div>
      </header>

      <!-- Hero -->
      <main class="flex-1 flex flex-col items-center page-container py-8 sm:py-12 md:py-16 w-full">
        <div
          [@fadeInUp]="{ value: '', params: { delay: 0, duration: 700, offset: 20, ease: 'cubic-bezier(0.2, 0, 0, 1)' } }"
          class="text-center mb-16 flex flex-col items-center"
        >
          <span class="rounded-full bg-primary/10 text-primary px-4 py-1.5 text-sm font-medium mb-6">
            Plataforma de Gestión Legal
          </span>
          <h1 class="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-center text-foreground mb-4 max-w-2xl">
            Bienvenidos a <span class="text-primary">LegalTech</span>
          </h1>
          <p class="text-muted-foreground text-center max-w-xl mb-10 text-base md:text-lg leading-relaxed">
            Gestión de Cartera con Precisión Legal. Administra propiedad horizontal, cobros jurídicos y cuentas con total claridad financiera.
          </p>
          <div class="flex flex-col sm:flex-row gap-3 mb-16">
            <a
              routerLink="/login"
              class="nav-pill inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground px-6 py-3 font-medium hover:opacity-95 shadow-sm"
            >
              Entrar al sistema
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
            </a>
            <a
              routerLink="/registro"
              class="nav-pill inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-6 py-3 font-medium text-foreground hover:bg-muted"
            >
              Soy cliente — Registrarme
            </a>
          </div>
        </div>

        <!-- Feature cards -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-5xl">
          @for (f of welcomeFeatures; track f.path; let i = $index) {
            <a
              [routerLink]="f.path"
              [@fadeInUpStagger]="{ value: '', params: { delay: 300 + i * 100, duration: 500, offset: 20, ease: 'cubic-bezier(0.2, 0, 0, 1)' } }"
              class="interactive-card rounded-2xl border border-border bg-card p-6 shadow-card flex flex-col items-center text-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span class="text-primary mb-4" aria-hidden="true">
                @switch (f.icon) {
                  @case ('users') {
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                  }
                  @case ('building') {
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M5 21V7l8-4v18"/><path d="M19 21V11l-6-4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/></svg>
                  }
                  @case ('report') {
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>
                  }
                  @default {
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
                  }
                }
              </span>
              <h2 class="font-display font-bold text-lg text-foreground mb-2">{{ f.label }}</h2>
              <p class="text-muted-foreground text-sm">{{ f.desc }}</p>
            </a>
          }
        </div>
      </main>

      <!-- Footer -->
      <footer class="border-t border-border py-4 shrink-0">
        <p class="text-center text-muted-foreground text-sm">
          © 2026 LegalTech - Gestión de Cartera y Propiedad Horizontal
        </p>
      </footer>
    </div>
  `,
})
export class WelcomePage {
  protected readonly welcomeFeatures = WELCOME_FEATURES;
}
