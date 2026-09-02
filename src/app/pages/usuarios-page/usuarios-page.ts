import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { fadeInUp } from '../../core/animations/animations';
import type { InvitableStaffRole } from '../../core/services/auth.service';
import { AuthService } from '../../core/services/auth.service';
import {
  UsuariosService,
  type StaffUsuario,
  type StaffUsuarioStatus,
} from '../../core/services/usuarios.service';

@Component({
  selector: 'app-usuarios-page',
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
            Usuarios
          </h1>
          <p class="text-primary-foreground/70 mt-1 text-sm md:text-base">
            Invita analistas legales y abogadas junior. Ellos crearán su contraseña al registrarse.
          </p>
        </div>
      </div>

      @if (error() || success()) {
        <div class="page-container max-w-5xl mt-4 space-y-3 relative z-10">
          @if (error()) {
            <div class="rounded-xl border border-destructive/40 bg-card px-4 py-3 text-sm text-destructive shadow-card">
              {{ error() }}
            </div>
          }
          @if (success()) {
            <div class="rounded-xl border border-primary/30 bg-card px-4 py-3 text-sm text-foreground shadow-card">
              {{ success() }}
            </div>
          }
        </div>
      }

      <div
        class="page-container space-y-6 max-w-5xl relative z-10"
        [class.-mt-6]="!error() && !success()"
        [class.mt-6]="!!error() || !!success()"
      >
        <section
          [@fadeInUp]="{ value: '', params: { delay: 0, duration: 450, offset: 10, ease: 'ease-out' } }"
          class="bg-card rounded-2xl shadow-card p-4 sm:p-6 border border-border/50"
        >
          <h2 class="font-display text-lg font-semibold text-foreground mb-4">Nuevo usuario</h2>
          <form [formGroup]="createForm" (ngSubmit)="onCreate()" class="space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div class="space-y-2">
                <label class="text-sm font-medium" for="email">Correo</label>
                <input
                  id="email"
                  type="email"
                  formControlName="email"
                  placeholder="usuario@correo.com"
                  class="w-full rounded-xl border border-input bg-background px-4 py-2"
                />
              </div>
              <div class="space-y-2">
                <label class="text-sm font-medium" for="role">Rol</label>
                <select
                  id="role"
                  formControlName="role"
                  class="w-full rounded-xl border border-input bg-background px-4 py-2"
                >
                  <option value="analista_legal">Analista legal</option>
                  <option value="abogada_junior">Abogada junior</option>
                </select>
              </div>
            </div>
            <p class="text-sm text-muted-foreground">
              Se enviará un enlace al correo para que la persona cree su contraseña y active la cuenta.
            </p>
            <div class="flex justify-end">
              <button
                type="submit"
                [disabled]="createForm.invalid || creating()"
                class="nav-pill rounded-xl bg-primary text-primary-foreground px-5 py-2.5 font-medium hover:opacity-95 disabled:opacity-60"
              >
                {{ creating() ? 'Enviando…' : 'Enviar invitación' }}
              </button>
            </div>
          </form>
        </section>

        <section
          [@fadeInUp]="{ value: '', params: { delay: 80, duration: 450, offset: 10, ease: 'ease-out' } }"
          class="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden"
        >
          <div class="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-6 border-b border-border/50">
            <h2 class="font-display text-lg font-semibold text-foreground">Staff</h2>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                (click)="setStatusFilter(null)"
                class="rounded-full px-3 py-1 text-xs font-medium border"
                [class]="statusFilter() === null ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'"
              >
                Todos
              </button>
              @for (s of statusOptions; track s.value) {
                <button
                  type="button"
                  (click)="setStatusFilter(s.value)"
                  class="rounded-full px-3 py-1 text-xs font-medium border"
                  [class]="statusFilter() === s.value ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted'"
                >
                  {{ s.label }}
                </button>
              }
            </div>
          </div>

          @if (loading()) {
            <p class="p-6 text-sm text-muted-foreground">Cargando usuarios…</p>
          } @else if (usuarios().length === 0) {
            <p class="p-6 text-sm text-muted-foreground">No hay usuarios con ese filtro.</p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full text-sm">
                <thead>
                  <tr class="text-left text-muted-foreground border-b border-border/50">
                    <th class="px-4 sm:px-6 py-3 font-medium">Correo</th>
                    <th class="px-4 py-3 font-medium">Rol</th>
                    <th class="px-4 py-3 font-medium">Estado</th>
                    <th class="px-4 sm:px-6 py-3 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  @for (u of usuarios(); track u.id) {
                    <tr class="border-b border-border/40 last:border-0">
                      <td class="px-4 sm:px-6 py-3 text-foreground">{{ u.email }}</td>
                      <td class="px-4 py-3">
                        @if (editingId() === u.id) {
                          <select
                            class="rounded-lg border border-input bg-background px-2 py-1"
                            [value]="editRole()"
                            (change)="onEditRoleChange($event)"
                          >
                            <option value="analista_legal">Analista legal</option>
                            <option value="abogada_junior">Abogada junior</option>
                          </select>
                        } @else {
                          {{ roleLabel(u.role) }}
                        }
                      </td>
                      <td class="px-4 py-3">
                        <span
                          class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                          [class]="statusBadgeClass(u.status)"
                        >
                          {{ statusLabel(u.status) }}
                        </span>
                      </td>
                      <td class="px-4 sm:px-6 py-3">
                        <div class="flex flex-wrap justify-end gap-2">
                          @if (editingId() === u.id) {
                            <button
                              type="button"
                              (click)="saveEdit(u)"
                              [disabled]="savingId() === u.id"
                              class="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-medium disabled:opacity-60"
                            >
                              Guardar
                            </button>
                            <button
                              type="button"
                              (click)="cancelEdit()"
                              class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                            >
                              Cancelar
                            </button>
                          } @else {
                            @if (u.role !== 'super_admin') {
                              <button
                                type="button"
                                (click)="startEdit(u)"
                                class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
                              >
                                Editar rol
                              </button>
                            }
                            @if (u.status === 'pending') {
                              <button
                                type="button"
                                (click)="resend(u)"
                                [disabled]="busyId() === u.id"
                                class="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-60"
                              >
                                Reenviar
                              </button>
                            }
                            @if (canDeactivate(u)) {
                              <button
                                type="button"
                                (click)="confirmDeactivate(u)"
                                [disabled]="busyId() === u.id || isCurrentUser(u)"
                                class="rounded-lg border border-amber-500/50 text-amber-700 dark:text-amber-300 px-3 py-1.5 text-xs font-medium hover:bg-amber-500/10 disabled:opacity-60"
                              >
                                Desactivar
                              </button>
                            }
                            @if (canActivate(u)) {
                              <button
                                type="button"
                                (click)="confirmActivate(u)"
                                [disabled]="busyId() === u.id"
                                class="rounded-lg border border-emerald-600/40 text-emerald-700 dark:text-emerald-300 px-3 py-1.5 text-xs font-medium hover:bg-emerald-500/10 disabled:opacity-60"
                              >
                                Activar
                              </button>
                            }
                            @if (canDelete(u)) {
                              <button
                                type="button"
                                (click)="confirmDelete(u)"
                                [disabled]="busyId() === u.id || isCurrentUser(u)"
                                class="rounded-lg border border-destructive/40 text-destructive px-3 py-1.5 text-xs font-medium hover:bg-destructive/10 disabled:opacity-60"
                              >
                                Eliminar
                              </button>
                            }
                          }
                        </div>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      </div>

      @if (deactivateTarget(); as target) {
        <div class="fixed inset-0 z-40 bg-black/50"></div>
        <section class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div class="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 class="font-display text-xl font-semibold text-foreground mb-2">Desactivar usuario</h2>
            <p class="text-sm text-muted-foreground mb-6">
              ¿Desactivar a <strong>{{ target.email }}</strong>? No podrá iniciar sesión y se cerrarán sus sesiones activas. El registro permanecerá en la lista como inactivo.
            </p>
            <div class="flex justify-end gap-3">
              <button
                type="button"
                (click)="deactivateTarget.set(null)"
                class="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="deactivate(target)"
                [disabled]="busyId() === target.id"
                class="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-60"
              >
                Desactivar
              </button>
            </div>
          </div>
        </section>
      }

      @if (activateTarget(); as target) {
        <div class="fixed inset-0 z-40 bg-black/50"></div>
        <section class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div class="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 class="font-display text-xl font-semibold text-foreground mb-2">Activar usuario</h2>
            <p class="text-sm text-muted-foreground mb-6">
              ¿Reactivar a <strong>{{ target.email }}</strong>? Podrá volver a iniciar sesión con su contraseña.
            </p>
            <div class="flex justify-end gap-3">
              <button
                type="button"
                (click)="activateTarget.set(null)"
                class="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="activate(target)"
                [disabled]="busyId() === target.id"
                class="rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                Activar
              </button>
            </div>
          </div>
        </section>
      }

      @if (deleteTarget(); as target) {
        <div class="fixed inset-0 z-40 bg-black/50"></div>
        <section class="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div class="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-card">
            <h2 class="font-display text-xl font-semibold text-foreground mb-2">Eliminar usuario</h2>
            <p class="text-sm text-muted-foreground mb-6">
              ¿Eliminar permanentemente a <strong>{{ target.email }}</strong>? Esta acción no se puede deshacer.
            </p>
            <div class="flex justify-end gap-3">
              <button
                type="button"
                (click)="deleteTarget.set(null)"
                class="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                (click)="remove(target)"
                [disabled]="busyId() === target.id"
                class="rounded-xl bg-destructive text-destructive-foreground px-4 py-2 text-sm font-medium disabled:opacity-60"
              >
                Eliminar
              </button>
            </div>
          </div>
        </section>
      }
    </div>
  `,
})
export class UsuariosPage implements OnInit {
  private readonly usuariosService = inject(UsuariosService);
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly usuarios = signal<StaffUsuario[]>([]);
  readonly loading = signal(true);
  readonly creating = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal<string | null>(null);
  readonly statusFilter = signal<StaffUsuarioStatus | null>(null);
  readonly editingId = signal<string | null>(null);
  readonly editRole = signal<InvitableStaffRole>('analista_legal');
  readonly savingId = signal<string | null>(null);
  readonly busyId = signal<string | null>(null);
  readonly deactivateTarget = signal<StaffUsuario | null>(null);
  readonly activateTarget = signal<StaffUsuario | null>(null);
  readonly deleteTarget = signal<StaffUsuario | null>(null);

  readonly statusOptions: Array<{ value: StaffUsuarioStatus; label: string }> = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'active', label: 'Activo' },
    { value: 'inactive', label: 'Inactivo' },
  ];

  readonly createForm = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    role: this.fb.nonNullable.control<InvitableStaffRole>('analista_legal', Validators.required),
  });

  ngOnInit(): void {
    void this.reload();
  }

  async reload(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const status = this.statusFilter();
      const items = await this.usuariosService.list(status ? { status } : undefined);
      this.usuarios.set(items);
    } catch (error: unknown) {
      this.error.set(
        this.usuariosService.extractErrorMessage(error, 'No se pudo cargar el listado de usuarios.')
      );
    } finally {
      this.loading.set(false);
    }
  }

  setStatusFilter(status: StaffUsuarioStatus | null): void {
    this.statusFilter.set(status);
    void this.reload();
  }

  async onCreate(): Promise<void> {
    if (this.createForm.invalid || this.creating()) return;
    this.creating.set(true);
    this.error.set(null);
    this.success.set(null);
    const { email, role } = this.createForm.getRawValue();
    try {
      await this.usuariosService.create({ email, role });
      this.createForm.reset({ email: '', role: 'analista_legal' });
      this.success.set('Invitación enviada. El usuario recibirá un enlace para crear su contraseña.');
      await this.reload();
    } catch (error: unknown) {
      this.error.set(
        this.usuariosService.extractErrorMessage(error, 'No se pudo enviar la invitación.')
      );
    } finally {
      this.creating.set(false);
    }
  }

  startEdit(u: StaffUsuario): void {
    if (u.role === 'super_admin') return;
    this.editingId.set(u.id);
    this.editRole.set(u.role === 'abogada_junior' ? 'abogada_junior' : 'analista_legal');
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  onEditRoleChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    if (value === 'analista_legal' || value === 'abogada_junior') {
      this.editRole.set(value);
    }
  }

  async saveEdit(u: StaffUsuario): Promise<void> {
    this.savingId.set(u.id);
    this.error.set(null);
    this.success.set(null);
    try {
      await this.usuariosService.update(u.id, { role: this.editRole() });
      this.editingId.set(null);
      this.success.set('Rol actualizado.');
      await this.reload();
    } catch (error: unknown) {
      this.error.set(this.usuariosService.extractErrorMessage(error, 'No se pudo actualizar el rol.'));
    } finally {
      this.savingId.set(null);
    }
  }

  async resend(u: StaffUsuario): Promise<void> {
    this.busyId.set(u.id);
    this.error.set(null);
    this.success.set(null);
    try {
      await this.usuariosService.resendInvitation(u.id);
      this.success.set(`Invitación reenviada a ${u.email}.`);
    } catch (error: unknown) {
      this.error.set(
        this.usuariosService.extractErrorMessage(error, 'No se pudo reenviar la invitación.')
      );
    } finally {
      this.busyId.set(null);
    }
  }

  /** Super admin no se desactiva ni elimina; el resto sí. */
  canDelete(u: StaffUsuario): boolean {
    return u.role !== 'super_admin';
  }

  canDeactivate(u: StaffUsuario): boolean {
    if (u.role === 'super_admin') return false;
    return u.status === 'active' || u.is_active === true;
  }

  canActivate(u: StaffUsuario): boolean {
    if (u.role === 'super_admin') return false;
    return u.status === 'inactive' || (u.is_active === false && u.status !== 'pending');
  }

  confirmDeactivate(u: StaffUsuario): void {
    if (!this.canDeactivate(u) || this.isCurrentUser(u)) return;
    this.activateTarget.set(null);
    this.deleteTarget.set(null);
    this.deactivateTarget.set(u);
  }

  confirmActivate(u: StaffUsuario): void {
    if (!this.canActivate(u)) return;
    this.deactivateTarget.set(null);
    this.deleteTarget.set(null);
    this.activateTarget.set(u);
  }

  confirmDelete(u: StaffUsuario): void {
    if (!this.canDelete(u) || this.isCurrentUser(u)) return;
    this.activateTarget.set(null);
    this.deactivateTarget.set(null);
    this.deleteTarget.set(u);
  }

  isCurrentUser(u: StaffUsuario): boolean {
    return this.auth.currentUser()?.id === u.id;
  }

  async deactivate(u: StaffUsuario): Promise<void> {
    this.busyId.set(u.id);
    this.error.set(null);
    this.success.set(null);
    try {
      await this.usuariosService.deactivate(u.id);
      this.deactivateTarget.set(null);
      this.success.set(`${u.email} fue desactivado.`);
      await this.reload();
    } catch (error: unknown) {
      this.error.set(
        this.usuariosService.extractErrorMessage(error, 'No se pudo desactivar el usuario.')
      );
    } finally {
      this.busyId.set(null);
    }
  }

  async activate(u: StaffUsuario): Promise<void> {
    this.busyId.set(u.id);
    this.error.set(null);
    this.success.set(null);
    try {
      await this.usuariosService.activate(u.id);
      this.activateTarget.set(null);
      this.success.set(`${u.email} fue reactivado.`);
      await this.reload();
    } catch (error: unknown) {
      this.error.set(
        this.usuariosService.extractErrorMessage(error, 'No se pudo activar el usuario.')
      );
    } finally {
      this.busyId.set(null);
    }
  }

  async remove(u: StaffUsuario): Promise<void> {
    this.busyId.set(u.id);
    this.error.set(null);
    this.success.set(null);
    try {
      await this.usuariosService.remove(u.id);
      this.deleteTarget.set(null);
      this.usuarios.update((items) => items.filter((item) => item.id !== u.id));
      this.success.set(`${u.email} fue eliminado.`);
    } catch (error: unknown) {
      this.error.set(
        this.usuariosService.extractErrorMessage(error, 'No se pudo eliminar el usuario.')
      );
    } finally {
      this.busyId.set(null);
    }
  }

  roleLabel(role: string): string {
    switch (role) {
      case 'super_admin':
        return 'Super admin';
      case 'analista_legal':
        return 'Analista legal';
      case 'abogada_junior':
        return 'Abogada junior';
      default:
        return role;
    }
  }

  statusLabel(status: StaffUsuarioStatus): string {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'active':
        return 'Activo';
      case 'inactive':
        return 'Inactivo';
    }
  }

  statusBadgeClass(status: StaffUsuarioStatus): string {
    switch (status) {
      case 'pending':
        return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
      case 'active':
        return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
      case 'inactive':
        return 'bg-muted text-muted-foreground';
    }
  }
}
