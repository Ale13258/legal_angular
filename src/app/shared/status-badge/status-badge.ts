import { Component, input } from '@angular/core';

@Component({
  selector: 'app-status-badge',
  standalone: true,
  template: `
    <span
      class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium"
      [class]="variantClass()"
    >
      {{ label() }}
    </span>
  `,
})
export class StatusBadge {
  label = input.required<string>();
  variant = input<string>('default');

  variantClass(): string {
    const v = this.variant();
    const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium';
    const map: Record<string, string> = {
      default: 'bg-muted text-muted-foreground',
      activa: 'bg-primary text-primary-foreground',
      cerrada: 'bg-muted text-muted-foreground',
      en_proceso: 'bg-orange-500 text-white',
      juridica: 'bg-primary text-primary-foreground',
      pendiente: 'bg-orange-500 text-white',
      parcial: 'bg-primary text-primary-foreground',
      pagado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      vencido: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return map[v] ?? map['default'];
  }
}
