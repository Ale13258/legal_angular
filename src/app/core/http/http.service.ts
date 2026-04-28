import { HttpBackend, HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class HttpService {
  private readonly http = inject(HttpClient);
  private readonly backend = inject(HttpBackend);
  private readonly rawHttp = new HttpClient(this.backend);
  private readonly apiBase = environment.apiBaseUrl;

  /** GET con interceptores (auth, contexto, etc.). */
  get<T>(path: string, options?: object): Promise<T> {
    return firstValueFrom(this.http.get<T>(this.toUrl(path), options));
  }

  /** POST con interceptores (auth, contexto, etc.). */
  post<T>(path: string, body: unknown, options?: object): Promise<T> {
    return firstValueFrom(this.http.post<T>(this.toUrl(path), body, options));
  }

  /** PUT con interceptores (auth, contexto, etc.). */
  put<T>(path: string, body: unknown, options?: object): Promise<T> {
    return firstValueFrom(this.http.put<T>(this.toUrl(path), body, options));
  }

  /** PATCH con interceptores (auth, contexto, etc.). */
  patch<T>(path: string, body: unknown, options?: object): Promise<T> {
    return firstValueFrom(this.http.patch<T>(this.toUrl(path), body, options));
  }

  /** DELETE con interceptores (auth, contexto, etc.). */
  delete<T>(path: string, options?: object): Promise<T> {
    return firstValueFrom(this.http.delete<T>(this.toUrl(path), options));
  }

  /** GET sin interceptores, útil para login/refresh/logout. */
  getRaw<T>(path: string, options?: object): Promise<T> {
    return firstValueFrom(this.rawHttp.get<T>(this.toUrl(path), options));
  }

  /** POST sin interceptores, útil para login/refresh/logout. */
  postRaw<T>(path: string, body: unknown, options?: object): Promise<T> {
    return firstValueFrom(this.rawHttp.post<T>(this.toUrl(path), body, options));
  }

  /** PUT sin interceptores. */
  putRaw<T>(path: string, body: unknown, options?: object): Promise<T> {
    return firstValueFrom(this.rawHttp.put<T>(this.toUrl(path), body, options));
  }

  /** PATCH sin interceptores. */
  patchRaw<T>(path: string, body: unknown, options?: object): Promise<T> {
    return firstValueFrom(this.rawHttp.patch<T>(this.toUrl(path), body, options));
  }

  /** DELETE sin interceptores. */
  deleteRaw<T>(path: string, options?: object): Promise<T> {
    return firstValueFrom(this.rawHttp.delete<T>(this.toUrl(path), options));
  }

  /** Helper para endpoints que responden `T[]` o `{ items: T[] }`. */
  async getItems<T>(path: string, options?: object): Promise<T[]> {
    const response = await this.get<{ items?: T[] } | T[]>(path, options);
    return this.unwrapItems(response);
  }

  /** Construye URL absoluta API desde `environment.apiBaseUrl`. */
  toUrl(path: string): string {
    const base = this.apiBase.endsWith('/') ? this.apiBase.slice(0, -1) : this.apiBase;
    const segment = path.startsWith('/') ? path : `/${path}`;
    return `${base}${segment}`;
  }

  /** Normaliza respuestas lista: array directo o wrapper `items`. */
  unwrapItems<T>(data: { items?: T[] } | T[]): T[] {
    if (Array.isArray(data)) return data;
    return data.items ?? [];
  }
}
