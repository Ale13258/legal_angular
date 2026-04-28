import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpService } from '../http/http.service';
import { TokenStorageService } from './token-storage.service';

export type UserRole = 'admin' | 'cliente';

export interface UsuarioRegistrado {
  email: string;
  password: string;
  role: UserRole;
  clienteId?: string;
}

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

type BackendAuthUser = {
  id: string;
  email: string;
  role: UserRole;
  cliente_id?: string | null;
  clienteId?: string | null;
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpService);
  private readonly tokenStorage = inject(TokenStorageService);
  private refreshInFlight: Promise<boolean> | null = null;
  private initInFlight: Promise<void> | null = null;

  /** Usuario de la sesión actual (null si no hay login) */
  readonly currentUser = signal<SesionUsuario | null>(null);
  readonly isReady = signal(false);
  private readonly isAdminSignal = computed(() => this.currentUser()?.role === 'admin');
  private readonly isClienteSignal = computed(() => this.currentUser()?.role === 'cliente');

  constructor() {
    void this.initializeSession();
  }

  isLoggedIn(): boolean {
    return !!this.tokenStorage.getAccessToken() && this.currentUser() !== null;
  }

  isAdmin(): boolean {
    return this.isAdminSignal();
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
      this.currentUser.set(null);
      this.isReady.set(true);
      return;
    }
    const ok = await this.fetchMe();
    if (!ok) {
      await this.refreshSession();
    }
    this.isReady.set(true);
  }

  async ensureSession(): Promise<boolean> {
    await this.initializeSession();
    return this.currentUser() !== null;
  }

  async login(email: string, password: string): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const res = await this.http.postRaw<{
        access_token: string;
        refresh_token: string;
        user: BackendAuthUser;
      }>('/auth/login', { email: email.trim(), password });
      this.tokenStorage.setTokens(res.access_token, res.refresh_token);
      this.currentUser.set(this.normalizeSessionUser(res.user));
      this.isReady.set(true);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Correo o contraseña incorrectos.' };
    }
  }

  async logout(): Promise<void> {
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

  defaultRouteAfterLogin(): string {
    const u = this.currentUser();
    if (!u) return '/login';
    return u.role === 'admin' ? '/dashboard' : '/mi-cartera';
  }

  async refreshSession(): Promise<boolean> {
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.refreshSessionInternal();
    const result = await this.refreshInFlight;
    this.refreshInFlight = null;
    return result;
  }

  private async refreshSessionInternal(): Promise<boolean> {
    const refreshToken = this.tokenStorage.getRefreshToken();
    if (!refreshToken) {
      await this.logout();
      return false;
    }
    try {
      const tokenRes = await this.http.postRaw<{ access_token: string; refresh_token: string }>(
        '/auth/refresh',
        { refresh_token: refreshToken }
      );
      this.tokenStorage.setTokens(tokenRes.access_token, tokenRes.refresh_token);
      return await this.fetchMe();
    } catch {
      await this.logout();
      return false;
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
