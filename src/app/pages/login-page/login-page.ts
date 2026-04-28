import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { fadeInUp } from '../../core/animations/animations';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [FormsModule, RouterLink],
  animations: [fadeInUp],
  template: `
    <div class="min-h-screen bg-background flex flex-col">
      <header class="border-b border-border bg-card page-container py-4">
        <a routerLink="/" class="flex items-center gap-2 text-foreground">
          <span class="text-primary" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22V10"/><path d="M12 10L6 16"/><path d="M12 10l6 6"/></svg>
          </span>
          <span class="font-display font-bold text-lg">LegalTech</span>
        </a>
      </header>
      <main class="flex-1 flex items-center justify-center page-container py-12">
        <div
          [@fadeInUp]="{ value: '', params: { delay: 0, duration: 500, offset: 16, ease: 'ease-out' } }"
          class="w-full max-w-md interactive-card rounded-2xl border border-border bg-card p-8 shadow-card"
        >
          <h1 class="font-display text-2xl font-bold text-foreground mb-1">Iniciar sesión</h1>
          <p class="text-muted-foreground text-sm mb-4">Accede como administrador o cliente.</p>

          @if (error()) {
            <div class="mb-4 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive text-sm px-4 py-3">
              {{ error() }}
            </div>
          }

          <form (ngSubmit)="onSubmit()" class="space-y-4">
            <div>
              <label for="email" class="block text-sm font-medium text-foreground mb-1.5">Correo</label>
              <input
                id="email"
                type="email"
                name="email"
                [(ngModel)]="email"
                required
                autocomplete="email"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
                placeholder="correo@ejemplo.com"
              />
            </div>
            <div>
              <label for="password" class="block text-sm font-medium text-foreground mb-1.5">Contraseña</label>
              <input
                id="password"
                type="password"
                name="password"
                [(ngModel)]="password"
                required
                autocomplete="current-password"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              [disabled]="loading()"
              class="w-full nav-pill rounded-xl bg-primary text-primary-foreground py-3 font-medium hover:opacity-95 disabled:opacity-60"
            >
              {{ loading() ? 'Entrando…' : 'Entrar' }}
            </button>
          </form>

          <p class="mt-6 text-center text-sm text-muted-foreground">
            ¿Cliente nuevo?
            <a routerLink="/registro" class="text-primary font-medium hover:underline">Crear cuenta</a>
          </p>
          <p class="mt-2 text-center text-sm">
            <a routerLink="/" class="text-muted-foreground hover:text-foreground">Volver al inicio</a>
          </p>
        </div>
      </main>
    </div>
  `,
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  email = '';
  password = '';
  readonly error = signal<string | null>(null);
  readonly loading = signal(false);

  async onSubmit(): Promise<void> {
    this.error.set(null);
    const e = this.email.trim();
    if (!e || !this.password) {
      this.error.set('Completa correo y contraseña.');
      return;
    }
    this.loading.set(true);
    const result = await this.auth.login(e, this.password);
    this.loading.set(false);
    if (!result.ok) {
      this.error.set(result.error);
      return;
    }
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const safe =
      returnUrl &&
      returnUrl.startsWith('/') &&
      !returnUrl.startsWith('//') &&
      !returnUrl.includes('login');
    this.router.navigateByUrl(safe ? returnUrl : this.auth.defaultRouteAfterLogin());
  }
}
