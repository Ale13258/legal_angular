import { Injectable } from '@angular/core';

const LS_ACCESS_TOKEN = 'legaltech_access_token';
const LS_REFRESH_TOKEN = 'legaltech_refresh_token';
const LS_SESSION_EXPIRES_AT = 'legaltech_session_expires_at';
const LS_IDLE_TIMEOUT_SECONDS = 'legaltech_idle_timeout_seconds';
const LS_LAST_ACTIVITY_AT = 'legaltech_last_activity_at';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  private isBrowser(): boolean {
    return typeof localStorage !== 'undefined';
  }

  getAccessToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem(LS_ACCESS_TOKEN);
  }

  getRefreshToken(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem(LS_REFRESH_TOKEN);
  }

  getSessionExpiresAt(): string | null {
    if (!this.isBrowser()) return null;
    return localStorage.getItem(LS_SESSION_EXPIRES_AT);
  }

  getIdleTimeoutSeconds(): number | null {
    if (!this.isBrowser()) return null;
    const raw = localStorage.getItem(LS_IDLE_TIMEOUT_SECONDS);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  getLastActivityAt(): number | null {
    if (!this.isBrowser()) return null;
    const raw = localStorage.getItem(LS_LAST_ACTIVITY_AT);
    if (!raw) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  setTokens(accessToken: string, refreshToken: string): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(LS_ACCESS_TOKEN, accessToken);
    localStorage.setItem(LS_REFRESH_TOKEN, refreshToken);
  }

  setSessionMetadata(sessionExpiresAt: string, idleTimeoutSeconds: number): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(LS_SESSION_EXPIRES_AT, sessionExpiresAt);
    localStorage.setItem(LS_IDLE_TIMEOUT_SECONDS, String(idleTimeoutSeconds));
  }

  setLastActivityAt(timestampMs: number): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(LS_LAST_ACTIVITY_AT, String(timestampMs));
  }

  clear(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem(LS_ACCESS_TOKEN);
    localStorage.removeItem(LS_REFRESH_TOKEN);
    localStorage.removeItem(LS_SESSION_EXPIRES_AT);
    localStorage.removeItem(LS_IDLE_TIMEOUT_SECONDS);
    localStorage.removeItem(LS_LAST_ACTIVITY_AT);
  }
}
