import { motion } from 'framer-motion';
import { formatCurrency } from '@/data/store';

interface BalanceCardProps {
  label: string;
  amount: number;
  variant?: 'default' | 'highlight';
  icon?: React.ReactNode;
}

export function BalanceCard({ label, amount, variant = 'default', icon }: BalanceCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
      className={
        variant === 'highlight'
          ? 'bg-card p-6 rounded-2xl shadow-card border-l-4 border-primary'
          : 'bg-card p-6 rounded-2xl shadow-card border border-border/50'
      }
    >
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <p className="text-sm font-medium text-primary uppercase tracking-widest">{label}</p>
      </div>
      <motion.p
        className="text-3xl font-bold text-foreground tabular-nums"
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.6, ease: [0.2, 0, 0, 1] }}
      >
        {formatCurrency(amount)}
      </motion.p>
    </motion.div>
  );
}
