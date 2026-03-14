import { cn } from '@/lib/utils';

type StatusVariant = 'juridica' | 'pagado' | 'vencido' | 'pendiente' | 'parcial' | 'activa' | 'cerrada' | 'en_proceso' | 'default';

const variantStyles: Record<StatusVariant, string> = {
  juridica: 'bg-primary text-primary-foreground',
  pagado: 'bg-success text-success-foreground',
  vencido: 'bg-destructive text-destructive-foreground',
  pendiente: 'bg-warning text-warning-foreground',
  parcial: 'bg-accent text-accent-foreground',
  activa: 'bg-primary text-primary-foreground',
  cerrada: 'bg-muted text-muted-foreground',
  en_proceso: 'bg-warning text-warning-foreground',
  default: 'bg-secondary text-secondary-foreground',
};

interface StatusBadgeProps {
  variant: StatusVariant;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({ variant, children, className }: StatusBadgeProps) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide', variantStyles[variant] || variantStyles.default, className)}>
      {children}
    </span>
  );
}
