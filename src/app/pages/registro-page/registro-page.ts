import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { fadeInUp } from '../../core/animations/animations';

@Component({
  selector: 'app-registro-page',
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
          <h1 class="font-display text-2xl font-bold text-foreground mb-1">Registro de cliente</h1>
          <p class="text-muted-foreground text-sm mb-6">
            Usa el mismo correo que figura en tu ficha de cliente en cartera. Si no estás dado de alta,
            contacta al administrador.
          </p>

          @if (error()) {
            <div class="mb-4 rounded-xl border border-destructive/50 bg-destructive/10 text-destructive text-sm px-4 py-3">
              {{ error() }}
            </div>
          }
          @if (success()) {
            <div class="mb-4 rounded-xl border border-primary/30 bg-primary/10 text-foreground text-sm px-4 py-3">
              Cuenta creada. Ya puedes iniciar sesión.
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
                placeholder="El correo registrado en cartera"
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
                autocomplete="new-password"
                minlength="6"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div>
              <label for="confirm" class="block text-sm font-medium text-foreground mb-1.5"
                >Confirmar contraseña</label
              >
              <input
                id="confirm"
                type="password"
                name="confirm"
                [(ngModel)]="confirmPassword"
                required
                autocomplete="new-password"
                class="w-full rounded-xl border border-input bg-background px-4 py-2.5 text-sm"
              />
            </div>
            <button
              type="submit"
              [disabled]="loading() || success()"
              class="w-full nav-pill rounded-xl bg-primary text-primary-foreground py-3 font-medium hover:opacity-95 disabled:opacity-60"
            >
              {{ loading() ? 'Registrando…' : success() ? 'Listo' : 'Registrarse' }}
            </button>
          </form>

          <p class="mt-6 text-center text-sm text-muted-foreground">
            ¿Ya tienes cuenta?
            <a routerLink="/login" class="text-primary font-medium hover:underline">Iniciar sesión</a>
          </p>
        </div>
      </main>

      @if (duplicateModalOpen()) {
        <div class="fixed inset-0 z-40 bg-black/50"></div>
        <section class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div class="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 class="font-display text-xl font-semibold text-foreground mb-2">Correo ya registrado</h2>
            <p class="text-sm text-muted-foreground mb-6">
              Ya existe una cuenta con este correo. Intenta iniciar sesión o recupera tu contraseña.
            </p>
            <div class="flex justify-end gap-3">
              <button
                type="button"
                (click)="closeDuplicateModal()"
                class="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                Cerrar
              </button>
              <a
                routerLink="/login"
                (click)="closeDuplicateModal()"
                class="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95"
              >
                Ir a iniciar sesión
              </a>
            </div>
          </div>
        </section>
      }
    </div>
  `,
})
export class RegistroPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  email = '';
  password = '';
  confirmPassword = '';
  readonly error = signal<string | null>(null);
  readonly success = signal(false);
  readonly loading = signal(false);
  readonly duplicateModalOpen = signal(false);

  async onSubmit(): Promise<void> {
    if (this.success()) return;
    const email = this.email.trim();
    const password = this.password;
    const confirmPassword = this.confirmPassword;
    if (!email || !password || !confirmPassword) {
      this.error.set('Completa todos los campos obligatorios.');
      this.duplicateModalOpen.set(false);
      return;
    }

    this.error.set(null);
    this.duplicateModalOpen.set(false);
    this.loading.set(true);
    const result = await this.auth.registerCliente(email, password, confirmPassword);
    this.loading.set(false);
    if (!result.ok) {
      if (result.reason === 'duplicate_user') {
        this.duplicateModalOpen.set(true);
        return;
      }
      this.error.set(result.error);
      return;
    }
    this.success.set(true);
    setTimeout(() => this.router.navigate(['/login']), 1800);
  }

  closeDuplicateModal(): void {
    this.duplicateModalOpen.set(false);
  }
}
