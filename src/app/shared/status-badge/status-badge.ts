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
      // Estados de gestión de cobro
      recibido: 'bg-slate-100 text-slate-700 dark:bg-slate-800/50 dark:text-slate-300',
      enviado: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      contactado: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      acordado: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      programado: 'bg-primary text-primary-foreground',
      // Tipos de cuenta (tabla cuentas)
      apartamento: 'bg-primary text-primary-foreground',
      oficina: 'bg-teal-600 text-white',
      local: 'bg-violet-600 text-white',
      casa: 'bg-emerald-700 text-white',
      bodega: 'bg-amber-700 text-white',
      garaje: 'bg-slate-600 text-white',
      parqueadero: 'bg-orange-500 text-white',
      otro: 'bg-muted text-muted-foreground',
      /** Cliente sin fila de cuenta en cartera (dashboard) */
      sin_cuenta: 'border border-dashed border-border bg-secondary/40 text-muted-foreground',
      /** Acceso al portal del cliente */
      portal_registrado:
        'bg-emerald-500/15 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
      portal_sin_registro:
        'bg-amber-500/15 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
      // Etapas de tutela
      tutela_radicacion: 'bg-muted text-muted-foreground',
      tutela_admision: 'bg-primary text-primary-foreground',
      tutela_inadmision: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      tutela_requerimiento: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
      tutela_sentencia: 'bg-primary text-primary-foreground',
      tutela_impugnacion: 'bg-orange-500 text-white',
      tutela_desacato: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      tutela_admite_impugnacion: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      tutela_otro: 'border border-border bg-secondary/40 text-muted-foreground',
      tutela_finalizada: 'border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
    };
    return map[v] ?? map['default'];
  }
}
