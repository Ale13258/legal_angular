import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { HttpService } from '../http/http.service';
import { ETAPAS_TUTELA_SIN_ALERTA, type EtapaTutela } from '../tutela-etapas';
import { DIAS_HABILES_AVISO_TUTELA, diasHabilesEntre, todayBogotaYmd } from '../utils/dias-habiles-co';

export type Tutela = {
  id: string;
  cliente_id: string | null;
  cliente_nombre: string | null;
  fecha_radicacion: string | null;
  radicado: string | null;
  juzgado: string | null;
  accionante: string;
  accionado: string;
  derecho: string;
  vencimiento: string | null;
  etapa: EtapaTutela;
  fecha_etapa: string | null;
  observaciones: string | null;
  nota: string | null;
  alerta_por_vencer_enviada_at: string | null;
  alerta_vencida_enviada_at: string | null;
  created_at: string;
  updated_at: string;
};

export type TutelaInput = {
  cliente_id: string | null;
  fecha_radicacion: string | null;
  radicado: string | null;
  juzgado: string | null;
  accionante: string;
  accionado: string;
  derecho: string;
  etapa: EtapaTutela;
  fecha_etapa: string | null;
  vencimiento: string | null;
  nota: string | null;
};

export type PlazoTutela = 'vencida' | 'por_vencer' | 'en_plazo' | 'sin_vencimiento' | 'cerrada';

export type FiltroPlazoTutela = 'todos' | 'vencida' | 'por_vencer' | 'en_plazo';

/** `?filtro=` que usa el CTA del correo de alerta (`filtro=vencidas`). */
export function filtroPlazoDesdeQuery(value: string | null | undefined): FiltroPlazoTutela | null {
  switch (String(value ?? '').trim().toLowerCase()) {
    case 'vencidas':
    case 'vencida':
      return 'vencida';
    case 'por_vencer':
    case 'por-vencer':
      return 'por_vencer';
    case 'en_plazo':
      return 'en_plazo';
    default:
      return null;
  }
}

/** Mismo criterio que la alerta del backend: ≤ 2 días hábiles = por vencer. */
export function plazoTutela(t: Pick<Tutela, 'vencimiento' | 'etapa'>, hoyYmd = todayBogotaYmd()): PlazoTutela {
  if (ETAPAS_TUTELA_SIN_ALERTA.includes(t.etapa)) return 'cerrada';
  if (!t.vencimiento) return 'sin_vencimiento';
  if (t.vencimiento < hoyYmd) return 'vencida';
  return diasHabilesEntre(hoyYmd, t.vencimiento) <= DIAS_HABILES_AVISO_TUTELA ? 'por_vencer' : 'en_plazo';
}

@Injectable({ providedIn: 'root' })
export class TutelasService {
  private readonly http = inject(HttpService);
  private readonly tutelasSignal = signal<Tutela[]>([]);

  readonly tutelas = this.tutelasSignal.asReadonly();

  async load(): Promise<Tutela[]> {
    const items = await this.http.getItems<Tutela>('/tutelas');
    this.tutelasSignal.set(items);
    return items;
  }

  async create(input: TutelaInput): Promise<Tutela> {
    const created = await this.http.post<Tutela>('/tutelas', input);
    this.tutelasSignal.update((list) => [created, ...list]);
    return created;
  }

  async update(id: string, input: Partial<TutelaInput>): Promise<Tutela> {
    const updated = await this.http.patch<Tutela>(`/tutelas/${id}`, input);
    this.tutelasSignal.update((list) => list.map((t) => (t.id === id ? updated : t)));
    return updated;
  }

  async remove(id: string): Promise<void> {
    await this.http.delete(`/tutelas/${id}`);
    this.tutelasSignal.update((list) => list.filter((t) => t.id !== id));
  }

  extractErrorMessage(error: unknown, fallback: string): string {
    if (!(error instanceof HttpErrorResponse)) return fallback;
    const body = error.error as { message?: unknown } | null;
    if (body && typeof body.message === 'string' && body.message.trim()) return body.message;
    return fallback;
  }
}
