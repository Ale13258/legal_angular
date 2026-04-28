import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { fadeInUp } from '../../core/animations/animations';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-nuevo-cliente-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  animations: [fadeInUp],
  template: `
    <div class="min-h-screen pb-12">
      <div class="gradient-hero page-container pt-6 pb-10 rounded-b-[2rem]">
        <div class="w-full">
          <a
            routerLink="/dashboard"
            class="inline-flex items-center rounded-xl border border-primary-foreground/50 text-primary-foreground px-3 py-1.5 text-sm mb-4"
          >
            Volver
          </a>
          <h1 class="font-display text-2xl md:text-3xl font-bold text-primary-foreground">
            Nuevo Cliente
          </h1>
        </div>
      </div>

      <div class="page-container -mt-6 max-w-3xl">
        <form
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          [@fadeInUp]="{ value: '', params: { delay: 0, duration: 500, offset: 10, ease: 'ease-out' } }"
          class="bg-card rounded-2xl shadow-card p-4 sm:p-8 border border-border/50 space-y-6"
        >
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div class="space-y-2">
              <label class="text-sm font-medium">Nombre completo / Razón social</label>
              <input
                formControlName="nombre"
                placeholder="Nombre del cliente"
                class="w-full rounded-xl border border-input bg-background px-4 py-2"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">Tipo de persona</label>
              <select
                formControlName="tipo_persona"
                class="w-full rounded-xl border border-input bg-background px-4 py-2"
              >
                <option value="natural">Persona Natural</option>
                <option value="juridica">Persona Jurídica</option>
              </select>
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">
                {{ form.get('tipo_persona')?.value === 'natural' ? 'Cédula (CC)' : 'NIT' }}
              </label>
              <input
                formControlName="documento"
                [placeholder]="form.get('tipo_persona')?.value === 'natural' ? '1.023.456.789' : '900.123.456-7'"
                class="w-full rounded-xl border border-input bg-background px-4 py-2"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">Teléfono</label>
              <input
                formControlName="telefono"
                placeholder="310 234 5678"
                class="w-full rounded-xl border border-input bg-background px-4 py-2"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">Email</label>
              <input
                formControlName="email"
                type="email"
                placeholder="cliente@email.com"
                class="w-full rounded-xl border border-input bg-background px-4 py-2"
              />
            </div>
            <div class="space-y-2">
              <label class="text-sm font-medium">Dirección</label>
              <input
                formControlName="direccion"
                placeholder="Dirección del cliente"
                class="w-full rounded-xl border border-input bg-background px-4 py-2"
              />
            </div>
          </div>
          <div class="space-y-2">
            <label class="text-sm font-medium">Descripción (opcional)</label>
            <textarea
              formControlName="observaciones"
              placeholder="Descripción o notas del cliente..."
              rows="4"
              class="w-full rounded-xl border border-input bg-background px-4 py-2"
            ></textarea>
          </div>
          <div class="flex justify-end">
            <button
              type="submit"
              [disabled]="saving()"
              class="rounded-xl bg-primary text-primary-foreground px-6 py-3 font-medium disabled:opacity-50"
            >
              {{ saving() ? 'Guardando...' : 'Guardar Cliente' }}
            </button>
          </div>
        </form>
      </div>

      @if (alertOpen()) {
        <div class="fixed inset-0 z-40 bg-black/50"></div>
        <section class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div class="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 class="font-display text-xl font-semibold text-foreground mb-2">{{ alertTitle() }}</h2>
            <p class="text-sm text-muted-foreground mb-6">{{ alertMessage() }}</p>
            <div class="flex justify-end">
              <button
                type="button"
                (click)="closeAlert()"
                class="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-95"
              >
                Entendido
              </button>
            </div>
          </div>
        </section>
      }
    </div>
  `,
})
export class NuevoClientePage {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly data = inject(DataService);

  readonly saving = signal(false);
  readonly alertOpen = signal(false);
  readonly alertTitle = signal('Atención');
  readonly alertMessage = signal('');

  form = this.fb.group({
    nombre: ['', Validators.required],
    tipo_persona: ['natural' as const, Validators.required],
    documento: ['', Validators.required],
    telefono: [''],
    email: [''],
    direccion: [''],
    observaciones: [''],
  });

  async onSubmit(): Promise<void> {
    if (this.saving()) return;

    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.openAlert(
        'Faltan campos obligatorios',
        'Completa nombre, tipo de persona y documento para guardar el cliente.'
      );
      return;
    }

    this.saving.set(true);
    try {
      await this.data.createCliente({
        nombre: this.form.value.nombre ?? '',
        tipo_persona: (this.form.value.tipo_persona ?? 'natural') as 'natural' | 'juridica',
        documento: this.form.value.documento ?? '',
        telefono: this.form.value.telefono ?? '',
        email: this.form.value.email ?? '',
        direccion: this.form.value.direccion ?? '',
        observaciones: this.form.value.observaciones ?? '',
      });
      this.router.navigate(['/dashboard']);
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse) {
        const backendMessage = this.extractBackendMessage(error.error);
        const normalized = backendMessage.toLowerCase();
        if (
          error.status === 409 ||
          normalized.includes('exist') ||
          normalized.includes('duplicad') ||
          normalized.includes('unique')
        ) {
          this.openAlert(
            'Cliente ya existe',
            'Ya hay un cliente registrado con ese documento o correo. Verifica la información antes de guardar.'
          );
          return;
        }
      }
      this.openAlert('No se pudo guardar', 'Ocurrió un error al guardar el cliente. Intenta nuevamente.');
    } finally {
      this.saving.set(false);
    }
  }

  closeAlert(): void {
    this.alertOpen.set(false);
  }

  private openAlert(title: string, message: string): void {
    this.alertTitle.set(title);
    this.alertMessage.set(message);
    this.alertOpen.set(true);
  }

  private extractBackendMessage(errorBody: unknown): string {
    if (!errorBody || typeof errorBody !== 'object') return '';
    const candidate = errorBody as { message?: unknown; error?: unknown };
    if (typeof candidate.message === 'string') return candidate.message;
    if (Array.isArray(candidate.message) && typeof candidate.message[0] === 'string') {
      return candidate.message[0];
    }
    if (typeof candidate.error === 'string') return candidate.error;
    return '';
  }
}
