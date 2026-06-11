import { Injectable, Injector, inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from './auth.service';
import { TokenStorageService } from './token-storage.service';

export type SessionPolicyMetadata = {
  session_expires_at: string;
  idle_timeout_seconds: number;
};

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;
const ACTIVITY_THROTTLE_MS = 30_000;
const MAX_SET_TIMEOUT_MS = 2_147_483_647;

@Injectable({ providedIn: 'root' })
export class SessionPolicyService {
  private readonly injector = inject(Injector);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(TokenStorageService);

  private absoluteTimer: ReturnType<typeof setTimeout> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private listenersAttached = false;
  private lastActivityTouchMs = 0;
  private onActivity = (): void => this.touchActivity();
  private onStorage = (event: StorageEvent): void => {
    if (event.key === 'legaltech_access_token' && event.newValue == null) {
      void this.handleExternalLogout();
    }
  };

  applyFromAuthResponse(metadata: SessionPolicyMetadata): void {
    this.tokenStorage.setSessionMetadata(metadata.session_expires_at, metadata.idle_timeout_seconds);
    this.touchActivity();
    this.startWatching();
  }

  clear(): void {
    this.clearTimers();
    this.detachListeners();
  }

  hasPolicy(): boolean {
    return !!this.tokenStorage.getSessionExpiresAt() && this.tokenStorage.getIdleTimeoutSeconds() != null;
  }

  isLocallyValid(): boolean {
    if (!this.tokenStorage.getAccessToken()) return true;
    if (!this.hasPolicy()) return true;

    const sessionExpiresAt = this.tokenStorage.getSessionExpiresAt();
    if (sessionExpiresAt && Date.now() >= Date.parse(sessionExpiresAt)) {
      return false;
    }

    const idleTimeoutSeconds = this.tokenStorage.getIdleTimeoutSeconds();
    const lastActivityAt = this.tokenStorage.getLastActivityAt();
    if (idleTimeoutSeconds != null && lastActivityAt != null) {
      if (Date.now() - lastActivityAt >= idleTimeoutSeconds * 1_000) {
        return false;
      }
    }

    return true;
  }

  touchActivity(): void {
    if (!this.tokenStorage.getAccessToken() || !this.hasPolicy()) return;

    const now = Date.now();
    if (now - this.lastActivityTouchMs < ACTIVITY_THROTTLE_MS) return;
    this.lastActivityTouchMs = now;
    this.tokenStorage.setLastActivityAt(now);
    this.scheduleIdleTimer();
  }

  startWatching(): void {
    if (!this.hasPolicy() || typeof window === 'undefined') return;

    this.scheduleAbsoluteTimer();
    this.scheduleIdleTimer();

    if (!this.listenersAttached) {
      for (const eventName of ACTIVITY_EVENTS) {
        window.addEventListener(eventName, this.onActivity, { passive: true });
      }
      window.addEventListener('storage', this.onStorage);
      document.addEventListener('visibilitychange', this.onActivity);
      this.listenersAttached = true;
    }
  }

  private scheduleAbsoluteTimer(): void {
    this.clearAbsoluteTimer();

    const sessionExpiresAt = this.tokenStorage.getSessionExpiresAt();
    if (!sessionExpiresAt) return;

    const delayMs = Date.parse(sessionExpiresAt) - Date.now();
    if (delayMs <= 0) {
      void this.expireSession();
      return;
    }

    this.absoluteTimer = setTimeout(
      () => void this.expireSession(),
      Math.min(delayMs, MAX_SET_TIMEOUT_MS)
    );
  }

  private scheduleIdleTimer(): void {
    this.clearIdleTimer();

    const idleTimeoutSeconds = this.tokenStorage.getIdleTimeoutSeconds();
    const lastActivityAt = this.tokenStorage.getLastActivityAt();
    if (idleTimeoutSeconds == null || lastActivityAt == null) return;

    const delayMs = idleTimeoutSeconds * 1_000 - (Date.now() - lastActivityAt);
    if (delayMs <= 0) {
      void this.expireSession();
      return;
    }

    this.idleTimer = setTimeout(
      () => void this.expireSession(),
      Math.min(delayMs, MAX_SET_TIMEOUT_MS)
    );
  }

  private async expireSession(): Promise<void> {
    const auth = this.getAuth();
    if (!auth.isLoggedIn()) return;
    await auth.logout();
    void this.router.navigate(['/login']);
  }

  private async handleExternalLogout(): Promise<void> {
    this.clearTimers();
    const auth = this.getAuth();
    if (auth.isLoggedIn()) {
      await auth.logout();
      void this.router.navigate(['/login']);
    }
  }

  private getAuth(): AuthService {
    return this.injector.get(AuthService);
  }

  private clearAbsoluteTimer(): void {
    if (this.absoluteTimer != null) {
      clearTimeout(this.absoluteTimer);
      this.absoluteTimer = null;
    }
  }

  private clearIdleTimer(): void {
    if (this.idleTimer != null) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearAbsoluteTimer();
    this.clearIdleTimer();
  }

  private detachListeners(): void {
    if (!this.listenersAttached || typeof window === 'undefined') return;

    for (const eventName of ACTIVITY_EVENTS) {
      window.removeEventListener(eventName, this.onActivity);
    }
    window.removeEventListener('storage', this.onStorage);
    document.removeEventListener('visibilitychange', this.onActivity);
    this.listenersAttached = false;
  }
}
