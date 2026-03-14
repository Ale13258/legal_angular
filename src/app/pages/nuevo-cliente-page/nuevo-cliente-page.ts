import { Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-nuevo-cliente-page',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule],
  template: `
    <div class="min-h-screen pb-12">
      <div class="gradient-hero px-8 pt-6 pb-10 rounded-b-[2rem]">
        <div class="max-w-3xl mx-auto">
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

      <div class="max-w-3xl mx-auto px-8 -mt-6">
        <form
          [formGroup]="form"
          (ngSubmit)="onSubmit()"
          class="bg-card rounded-2xl shadow-card p-8 border border-border/50 space-y-6"
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
              [disabled]="form.invalid"
              class="rounded-xl bg-primary text-primary-foreground px-6 py-3 font-medium disabled:opacity-50"
            >
              Guardar Cliente
            </button>
          </div>
        </form>
      </div>
    </div>
  `,
})
export class NuevoClientePage {
  private fb = inject(FormBuilder);
  private router = inject(Router);

  form = this.fb.group({
    nombre: ['', Validators.required],
    tipo_persona: ['natural' as const, Validators.required],
    documento: ['', Validators.required],
    telefono: [''],
    email: [''],
    direccion: [''],
    observaciones: [''],
  });

  onSubmit(): void {
    if (this.form.invalid) return;
    // Mock: no persist, just navigate
    this.router.navigate(['/dashboard']);
  }
}
