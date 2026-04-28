import { Injectable } from '@angular/core';

const LS_ACCESS_TOKEN = 'legaltech_access_token';
const LS_REFRESH_TOKEN = 'legaltech_refresh_token';

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

  setTokens(accessToken: string, refreshToken: string): void {
    if (!this.isBrowser()) return;
    localStorage.setItem(LS_ACCESS_TOKEN, accessToken);
    localStorage.setItem(LS_REFRESH_TOKEN, refreshToken);
  }

  clear(): void {
    if (!this.isBrowser()) return;
    localStorage.removeItem(LS_ACCESS_TOKEN);
    localStorage.removeItem(LS_REFRESH_TOKEN);
  }
}
