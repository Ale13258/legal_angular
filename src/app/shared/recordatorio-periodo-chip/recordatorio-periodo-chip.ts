import { Component, computed, input } from '@angular/core';
import type { ResumenRecordatorios } from '../../core/utils/cuenta-recordatorio-periodo';

/**
 * Recordatorio del periodo (solo visual).
 * Pasteles alineados a la gama de badges (`enviado` azul / ámbar suave).
 */
@Component({
  selector: 'app-recordatorio-periodo-chip',
  standalone: true,
  template: `
    @if (resumen(); as r) {
      @if (r.total === 0) {
        <span class="text-sm text-muted-foreground">—</span>
      } @else {
        <span
          class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium tabular-nums"
          [class]="r.pendiente ? pastelPendiente : pastelEnviado"
          [title]="ratioTitle()"
        >
          {{ r.label }}
        </span>
      }
    } @else {
      <span
        class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
        [class]="enviado() ? pastelEnviado : pastelPendiente"
        [title]="unitTitle()"
      >
        {{ enviado() ? 'Enviado' : 'Pendiente' }}
      </span>
    }
  `,
})
export class RecordatorioPeriodoChip {
  enviado = input(false);
  resumen = input<ResumenRecordatorios | null>(null);

  /** Misma gama azul pastel que el badge `enviado`. */
  protected readonly pastelEnviado =
    'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  /** Ámbar más suave que `contactado`. */
  protected readonly pastelPendiente =
    'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300';

  ratioTitle = computed(() => {
    const r = this.resumen();
    if (!r) return '';
    if (r.total === 0) return 'Sin propiedades';
    if (r.pendiente) return `${r.enviados} de ${r.total} con recordatorio en el periodo`;
    return 'Todas las unidades tienen recordatorio en el periodo';
  });

  unitTitle = computed(() =>
    this.enviado()
      ? 'Recordatorio enviado en el periodo mensual'
      : 'Sin recordatorio enviado en el periodo mensual',
  );
}
