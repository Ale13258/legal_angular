import { Component, input } from '@angular/core';
import { DataService } from '../../core/services/data.service';

type BalanceCardIcon = 'cartera' | 'clientes' | 'cuentas' | 'cobrado' | 'pagado' | 'saldo';

@Component({
  selector: 'app-balance-card',
  standalone: true,
  template: `
    <div
      class="interactive-card rounded-2xl border border-border/50 p-4 sm:p-5 bg-card shadow-card min-w-0 h-full"
      [class.border-l-4]="accentLeft()"
      [class.border-l-primary]="accentLeft()"
      [class.ring-2]="variant() === 'highlight'"
      [class.ring-primary/30]="variant() === 'highlight'"
    >
      <div class="flex items-center gap-3 mb-2">
        @if (icon(); as iconType) {
          <span
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            aria-hidden="true"
          >
            @switch (iconType) {
              @case ('cartera') {
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="m17 5-5 7 5 7"/><path d="m7 5 5 7-5 7"/></svg>
              }
              @case ('clientes') {
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              }
              @case ('cuentas') {
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>
              }
              @case ('cobrado') {
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20"/><path d="m17 5-5 7 5 7"/><path d="m7 5 5 7-5 7"/></svg>
              }
              @case ('pagado') {
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/></svg>
              }
              @case ('saldo') {
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m16 16 3-8 3 8"/><path d="M2 16 5 8l3 8"/><path d="M7 21h10"/><path d="M12 3v18"/><path d="M3 12h2"/><path d="M19 12h2"/></svg>
              }
            }
          </span>
        }
        <span class="text-sm font-medium text-muted-foreground">{{ label() }}</span>
      </div>
      <p class="text-2xl font-bold tabular-nums text-foreground">
        {{ isCurrency() ? data.formatCurrency(amount()) : amount() }}
      </p>
    </div>
  `,
})
export class BalanceCard {
  label = input.required<string>();
  amount = input.required<number>();
  variant = input<'default' | 'highlight'>('default');
  isCurrency = input<boolean>(true);
  /** Icono a la izquierda del label (círculo púrpura). */
  icon = input<BalanceCardIcon>();
  /** Franja vertical primary a la izquierda (ej. página Informes). */
  accentLeft = input<boolean>(false);

  constructor(protected data: DataService) {}
}
