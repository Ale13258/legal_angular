import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { BalanceCard } from '@/components/BalanceCard';
import {
  mockClientes, mockCuentas, mockPropiedades, mockHistorial, mockGestiones,
  getTotalCartera, formatCurrency, tipoCuentaLabels, estadoCuentaLabels,
} from '@/data/store';
import { ArrowLeft, DollarSign } from 'lucide-react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend, LineChart, Line,
} from 'recharts';

const PURPLE = 'hsl(263, 70%, 50%)';
const GREEN = 'hsl(142, 71%, 45%)';
const RED = 'hsl(0, 84%, 60%)';
const AMBER = 'hsl(38, 92%, 50%)';
const LILAC = 'hsl(263, 70%, 80%)';

export default function GraficosPage() {
  const navigate = useNavigate();

  // Distribution by estado
  const estadoDist = Object.entries(
    mockCuentas.reduce<Record<string, number>>((acc, c) => {
      acc[c.estado] = (acc[c.estado] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: estadoCuentaLabels[name] || name, value }));

  // Distribution by tipo
  const tipoDist = Object.entries(
    mockCuentas.reduce<Record<string, number>>((acc, c) => {
      acc[c.tipo] = (acc[c.tipo] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name: tipoCuentaLabels[name] || name, value }));

  const pieColors = [PURPLE, GREEN, AMBER, RED, LILAC];

  // Payments by period
  const periodos = [...new Set(mockHistorial.map(h => h.periodo))].sort();
  const paymentByPeriod = periodos.map(p => {
    const items = mockHistorial.filter(h => h.periodo === p);
    return {
      periodo: p,
      cobrado: items.reduce((s, h) => s + h.valor_cobrado, 0),
      pagado: items.reduce((s, h) => s + h.valor_pagado, 0),
    };
  });

  // Balance evolution
  let runningBalance = 0;
  const balanceEvolution = periodos.map(p => {
    const items = mockHistorial.filter(h => h.periodo === p);
    runningBalance += items.reduce((s, h) => s + h.valor_cobrado - h.valor_pagado, 0);
    return { periodo: p, saldo: runningBalance };
  });

  // Gestiones by month
  const gestionesByMonth = Object.entries(
    mockGestiones.reduce<Record<string, number>>((acc, g) => {
      const month = g.fecha.substring(0, 7);
      acc[month] = (acc[month] || 0) + 1;
      return acc;
    }, {})
  ).map(([mes, cantidad]) => ({ mes, cantidad })).sort((a, b) => a.mes.localeCompare(b.mes));

  return (
    <div className="min-h-screen pb-12">
      <div className="gradient-hero px-8 pt-6 pb-10 rounded-b-[2rem]">
        <div className="max-w-6xl mx-auto">
          <Button variant="heroOutline" size="sm" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">Gráficos y Analítica</h1>
          <p className="text-primary-foreground/70 text-sm">Visión general de toda la cartera</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 -mt-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BalanceCard label="Cartera Total" amount={getTotalCartera()} variant="highlight" icon={<DollarSign className="w-4 h-4 text-primary" />} />
          <BalanceCard label="Clientes" amount={mockClientes.length} />
          <BalanceCard label="Propiedades" amount={mockPropiedades.length} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pie: Estado */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl shadow-card p-6 border border-border/50">
            <h3 className="font-display font-bold text-foreground mb-4">Distribución por Estado</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={estadoDist} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {estadoDist.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Pie: Tipo */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl shadow-card p-6 border border-border/50">
            <h3 className="font-display font-bold text-foreground mb-4">Distribución por Tipo</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={tipoDist} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {tipoDist.map((_, i) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Bar: Cobrado vs Pagado */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="bg-card rounded-2xl shadow-card p-6 border border-border/50">
          <h3 className="font-display font-bold text-foreground mb-4">Cobrado vs Pagado por Periodo</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={paymentByPeriod} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5.9% 90%)" />
              <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Legend />
              <Bar dataKey="cobrado" fill={PURPLE} radius={[6, 6, 0, 0]} name="Cobrado" />
              <Bar dataKey="pagado" fill={GREEN} radius={[6, 6, 0, 0]} name="Pagado" />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Line: Balance */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card rounded-2xl shadow-card p-6 border border-border/50">
            <h3 className="font-display font-bold text-foreground mb-4">Evolución del Saldo</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={balanceEvolution}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5.9% 90%)" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Line type="monotone" dataKey="saldo" stroke={PURPLE} strokeWidth={3} dot={{ r: 4 }} name="Saldo" />
              </LineChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Bar: Gestiones by month */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-card rounded-2xl shadow-card p-6 border border-border/50">
            <h3 className="font-display font-bold text-foreground mb-4">Gestiones por Mes</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={gestionesByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5.9% 90%)" />
                <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="cantidad" fill={LILAC} radius={[6, 6, 0, 0]} name="Gestiones" />
              </BarChart>
            </ResponsiveContainer>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
