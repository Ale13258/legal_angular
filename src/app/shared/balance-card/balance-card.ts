import { Component, input } from '@angular/core';
import { DataService } from '../../core/services/data.service';

@Component({
  selector: 'app-balance-card',
  standalone: true,
  template: `
    <div
      class="rounded-2xl border border-border/50 p-5 bg-card shadow-card"
      [class.ring-2]="variant() === 'highlight'"
      [class.ring-primary/30]="variant() === 'highlight'"
    >
      <div class="flex items-center justify-between mb-2">
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

  constructor(protected data: DataService) {}
}
