import { Injectable, inject } from '@angular/core';
import { HttpService } from './http.service';

@Injectable({ providedIn: 'root' })
export class HttpArchiveService {
  private readonly http = inject(HttpService);

  get<T>(path: string, options?: object): Promise<T> {
    return this.http.get<T>(path, options);
  }

  post<T>(path: string, body: unknown, options?: object): Promise<T> {
    return this.http.post<T>(path, body, options);
  }

  put<T>(path: string, body: unknown, options?: object): Promise<T> {
    return this.http.put<T>(path, body, options);
  }

  patch<T>(path: string, body: unknown, options?: object): Promise<T> {
    return this.http.patch<T>(path, body, options);
  }

  delete<T>(path: string, options?: object): Promise<T> {
    return this.http.delete<T>(path, options);
  }

  getRaw<T>(path: string, options?: object): Promise<T> {
    return this.http.getRaw<T>(path, options);
  }

  postRaw<T>(path: string, body: unknown, options?: object): Promise<T> {
    return this.http.postRaw<T>(path, body, options);
  }

  putRaw<T>(path: string, body: unknown, options?: object): Promise<T> {
    return this.http.putRaw<T>(path, body, options);
  }

  patchRaw<T>(path: string, body: unknown, options?: object): Promise<T> {
    return this.http.patchRaw<T>(path, body, options);
  }

  deleteRaw<T>(path: string, options?: object): Promise<T> {
    return this.http.deleteRaw<T>(path, options);
  }

  getItems<T>(path: string, options?: object): Promise<T[]> {
    return this.http.getItems<T>(path, options);
  }

  toUrl(path: string): string {
    return this.http.toUrl(path);
  }

  unwrapItems<T>(data: { items?: T[] } | T[]): T[] {
    return this.http.unwrapItems(data);
  }
}
