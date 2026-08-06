import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { HttpService } from '../http/http.service';
import { isAccessTokenValid } from '../utils/jwt.utils';
import { SessionPolicyService } from './session-policy.service';
import { TokenStorageService } from './token-storage.service';

export const STAFF_ROLES = ['super_admin', 'analista_legal', 'abogada_junior'] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export type UserRole = StaffRole | 'cliente';
export type InvitableStaffRole = 'analista_legal' | 'abogada_junior';

export interface SesionUsuario {
  id: string;
  email: string;
  role: UserRole;
  clienteId?: string;
}

export type RegisterClienteErrorReason =
  | 'missing_fields'
  | 'weak_password'
  | 'password_mismatch'
  | 'duplicate_user'
  | 'unknown_error';

export type RegisterClienteResult = { ok: true } | { ok: false; error: string; reason: RegisterClienteErrorReason };

export type RegisterStaffErrorReason =
  | 'missing_fields'
  | 'weak_password'
  | 'password_mismatch'
  | 'invalid_invitation'
  | 'unknown_error';

export type RegisterStaffResult = { ok: true } | { ok: false; error: string; reason: RegisterStaffErrorReason };

export type RegistrationInvitation = {
  email: string;
  role: InvitableStaffRole;
};

type BackendAuthUser = {
  id: string;
  email: string;
  role: UserRole;
  cliente_id?: string | null;
  clienteId?: string | null;
};

function isStaffRole(role: string | undefined | null): role is StaffRole {
  return role === 'super_admin' || role === 'analista_legal' || role === 'abogada_junior';
}

type AuthTokensResponse = {
  access_token: string;
  refresh_token: string;
  session_expires_at?: string;
  idle_timeout_seconds?: number;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpService);
  private readonly tokenStorage = inject(TokenStorageService);
  private readonly sessionPolicy = inject(SessionPolicyService);
  private readonly router = inject(Router);
  private refreshInFlight: Promise<boolean> | null = null;
  private initInFlight: Promise<void> | null = null;

  /** Usuario de la sesión actual (null si no hay login) */
  readonly currentUser = signal<SesionUsuario | null>(null);
  readonly isReady = signal(false);
  private readonly isStaffSignal = computed(() => isStaffRole(this.currentUser()?.role));
  private readonly isSuperAdminSignal = computed(() => this.currentUser()?.role === 'super_admin');
  private readonly isClienteSignal = computed(() => this.currentUser()?.role === 'cliente');

  constructor() {
    void this.initializeSession();
  }

  isLoggedIn(): boolean {
    const accessToken = this.tokenStorage.getAccessToken();
    return (
      !!accessToken &&
      this.currentUser() !== null &&
      this.sessionPolicy.isLocallyValid() &&
      isAccessTokenValid(accessToken)
    );
  }

  /** Staff operativo: super_admin | analista_legal | abogada_junior */
  isStaff(): boolean {
    return this.isStaffSignal();
  }

  isSuperAdmin(): boolean {
    return this.isSuperAdminSignal();
  }

  /** Alias de isStaff() para compatibilidad con layout/guards existentes. */
  isAdmin(): boolean {
    return this.isStaff();
  }

  isCliente(): boolean {
    return this.isClienteSignal();
  }

  async initializeSession(): Promise<void> {
    if (this.initInFlight) {
      await this.initInFlight;
      return;
    }
    this.initInFlight = this.bootstrapSession();
    await this.initInFlight;
    this.initInFlight = null;
  }

  private async bootstrapSession(): Promise<void> {
    const accessToken = this.tokenStorage.getAccessToken();
    if (!accessToken) {
      this.sessionPolicy.clear();
      this.currentUser.set(null);
      this.isReady.set(true);
      return;
    }

    if (!this.sessionPolicy.isLocallyValid()) {
      await this.logout();
      this.isReady.set(true);
      return;
    }

    if (!isAccessTokenValid(accessToken)) {
      const refreshed = await this.refreshSession();
      if (!refreshed) {
        this.isReady.set(true);
        return;
      }
    } else {
      const ok = await this.fetchMe();
      if (!ok) {
        await this.refreshSession();
      }
    }

    if (this.currentUser()) {
      this.sessionPolicy.startWatching();
    } else {
      this.sessionPolicy.clear();
    }

    this.isReady.set(true);
  }

  async ensureSession(): Promise<boolean> {
    await this.initializeSession();

    const accessToken = this.tokenStorage.getAccessToken();
    if (!accessToken || this.currentUser() === null) {
      return false;
    }

    if (!this.sessionPolicy.isLocallyValid()) {
      await this.logout();
      return false;
    }

    if (!isAccessTokenValid(accessToken)) {
      return this.refreshSession();
    }

    return true;
  }

  async login(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await this.http.postRaw<AuthTokensResponse & { user: BackendAuthUser }>('/auth/login', {
        email: email.trim(),
        password,
      });
      this.persistAuthResponse(res);
      this.currentUser.set(this.normalizeSessionUser(res.user));
      this.isReady.set(true);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Correo o contraseña incorrectos.' };
    }
  }

  async logout(): Promise<void> {
    this.sessionPolicy.clear();
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (refreshToken) {
      try {
        await this.http.postRaw<void>('/auth/logout', { refresh_token: refreshToken });
      } catch {
        // El backend puede fallar; igual limpiamos sesión local.
      }
    }
    this.tokenStorage.clear();
    this.currentUser.set(null);
    this.isReady.set(true);
  }

  async logoutAndRedirect(): Promise<void> {
    await this.logout();
    void this.router.navigate(['/']);
  }

  async registerCliente(
    email: string,
    password: string,
    confirmPassword: string
  ): Promise<RegisterClienteResult> {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !password || !confirmPassword) {
      return { ok: false, error: 'Completa todos los campos obligatorios.', reason: 'missing_fields' };
    }
    if (password.length < 6) {
      return {
        ok: false,
        error: 'La contraseña debe tener al menos 6 caracteres.',
        reason: 'weak_password',
      };
    }
    if (password !== confirmPassword) {
      return { ok: false, error: 'Las contraseñas no coinciden.', reason: 'password_mismatch' };
    }
    try {
      await this.http.postRaw<{ user: unknown }>('/auth/register-cliente', {
        email: normalizedEmail,
        password,
        confirm_password: confirmPassword,
      });
      return { ok: true };
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse) {
        const message = this.extractBackendMessage(error.error);
        const normalizedMessage = message.toLowerCase();
        if (
          error.status === 409 ||
          normalizedMessage.includes('exist') ||
          normalizedMessage.includes('registrad') ||
          normalizedMessage.includes('duplicate') ||
          normalizedMessage.includes('duplicad')
        ) {
          return {
            ok: false,
            error: 'Ya existe una cuenta registrada con este correo.',
            reason: 'duplicate_user',
          };
        }
        return {
          ok: false,
          error: message || 'No se pudo registrar la cuenta con este correo.',
          reason: 'unknown_error',
        };
      }
      return { ok: false, error: 'No se pudo registrar la cuenta con este correo.', reason: 'unknown_error' };
    }
  }

  async getRegistrationInvitation(token: string): Promise<
    { ok: true; invitation: RegistrationInvitation } | { ok: false; error: string }
  > {
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      return { ok: false, error: 'Invitación inválida o expirada.' };
    }
    try {
      const invitation = await this.http.getRaw<RegistrationInvitation>(
        `/auth/registration-invitation?token=${encodeURIComponent(normalizedToken)}`
      );
      return { ok: true, invitation };
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse) {
        const message = this.extractBackendMessage(error.error);
        return { ok: false, error: message || 'Invitación inválida o expirada.' };
      }
      return { ok: false, error: 'Invitación inválida o expirada.' };
    }
  }

  async registerStaff(
    token: string,
    password: string,
    confirmPassword: string
  ): Promise<RegisterStaffResult> {
    const normalizedToken = token.trim();
    if (!normalizedToken || !password || !confirmPassword) {
      return { ok: false, error: 'Completa todos los campos obligatorios.', reason: 'missing_fields' };
    }
    if (password.length < 6) {
      return {
        ok: false,
        error: 'La contraseña debe tener al menos 6 caracteres.',
        reason: 'weak_password',
      };
    }
    if (password !== confirmPassword) {
      return { ok: false, error: 'Las contraseñas no coinciden.', reason: 'password_mismatch' };
    }
    try {
      await this.http.postRaw<{ user: unknown }>('/auth/register-staff', {
        token: normalizedToken,
        password,
        confirm_password: confirmPassword,
      });
      return { ok: true };
    } catch (error: unknown) {
      if (error instanceof HttpErrorResponse) {
        const message = this.extractBackendMessage(error.error);
        const normalizedMessage = message.toLowerCase();
        if (
          error.status === 400 ||
          normalizedMessage.includes('invit') ||
          normalizedMessage.includes('expir') ||
          normalizedMessage.includes('token')
        ) {
          return {
            ok: false,
            error: message || 'Invitación inválida o expirada.',
            reason: 'invalid_invitation',
          };
        }
        return {
          ok: false,
          error: message || 'No se pudo activar la cuenta.',
          reason: 'unknown_error',
        };
      }
      return { ok: false, error: 'No se pudo activar la cuenta.', reason: 'unknown_error' };
    }
  }

  defaultRouteAfterLogin(): string {
    const u = this.currentUser();
    if (!u) return '/login';
    return isStaffRole(u.role) ? '/dashboard' : '/mi-cartera';
  }

  async refreshSession(): Promise<boolean> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.refreshSessionInternal();
    const result = await this.refreshInFlight;
    this.refreshInFlight = null;
    return result;
  }

  private async refreshSessionInternal(): Promise<boolean> {
    if (!this.sessionPolicy.isLocallyValid()) {
      await this.logout();
      return false;
    }

    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      await this.logout();
      return false;
    }

    try {
      const tokenRes = await this.http.postRaw<AuthTokensResponse>('/auth/refresh', {
        refresh_token: refreshToken,
      });
      this.persistAuthResponse(tokenRes);
      const ok = await this.fetchMe();
      if (!ok) {
        await this.logout();
        return false;
      }
      return true;
    } catch {
      await this.logout();
      return false;
    }
  }

  private persistAuthResponse(res: AuthTokensResponse): void {
    this.tokenStorage.setTokens(res.access_token, res.refresh_token);
    if (res.session_expires_at && res.idle_timeout_seconds != null) {
      this.sessionPolicy.applyFromAuthResponse({
        session_expires_at: res.session_expires_at,
        idle_timeout_seconds: res.idle_timeout_seconds,
      });
    }
  }

  private async fetchMe(): Promise<boolean> {
    try {
      const user = await this.http.get<BackendAuthUser>('/auth/me');
      this.currentUser.set(this.normalizeSessionUser(user));
      return true;
    } catch {
      return false;
    }
  }

  private normalizeSessionUser(user: BackendAuthUser): SesionUsuario {
    const clienteId = user.cliente_id ?? user.clienteId ?? undefined;
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      clienteId: clienteId ?? undefined,
    };
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
