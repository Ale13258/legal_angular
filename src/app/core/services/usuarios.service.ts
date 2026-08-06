import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { HttpService } from '../http/http.service';
import type { InvitableStaffRole, StaffRole } from './auth.service';

export type StaffUsuarioStatus = 'pending' | 'active' | 'inactive';

export type StaffUsuario = {
  id: string;
  email: string;
  role: StaffRole;
  is_active: boolean;
  status: StaffUsuarioStatus;
  created_at: string;
  updated_at: string;
};

export type CreateStaffUsuarioInput = {
  email: string;
  role: InvitableStaffRole;
};

export type UpdateStaffUsuarioInput = {
  email?: string;
  role?: InvitableStaffRole;
};

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly http = inject(HttpService);

  async list(params?: { status?: StaffUsuarioStatus; role?: StaffRole }): Promise<StaffUsuario[]> {
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.role) query.set('role', params.role);
    const qs = query.toString();
    const path = qs ? `/usuarios?${qs}` : '/usuarios';
    return this.http.getItems<StaffUsuario>(path);
  }

  async create(input: CreateStaffUsuarioInput): Promise<StaffUsuario> {
    return this.http.post<StaffUsuario>('/usuarios', {
      email: input.email.trim().toLowerCase(),
      role: input.role,
    });
  }

  async update(id: string, input: UpdateStaffUsuarioInput): Promise<StaffUsuario> {
    return this.http.patch<StaffUsuario>(`/usuarios/${id}`, {
      ...(input.email !== undefined ? { email: input.email.trim().toLowerCase() } : {}),
      ...(input.role !== undefined ? { role: input.role } : {}),
    });
  }

  async resendInvitation(id: string): Promise<StaffUsuario> {
    return this.http.post<StaffUsuario>(`/usuarios/${id}/resend-invitation`, {});
  }

  async deactivate(id: string): Promise<StaffUsuario> {
    return this.http.deleteJson<StaffUsuario>(`/usuarios/${id}`);
  }

  extractErrorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    const body = error.error;
    if (!body || typeof body !== 'object') return fallback;
    const candidate = body as { message?: unknown; error?: unknown };
    if (typeof candidate.message === 'string' && candidate.message.trim()) return candidate.message;
    if (Array.isArray(candidate.message) && typeof candidate.message[0] === 'string') {
      return candidate.message[0];
    }
    if (typeof candidate.error === 'string' && candidate.error.trim()) return candidate.error;
    return fallback;
  }
}
