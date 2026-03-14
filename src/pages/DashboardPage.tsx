import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { BalanceCard } from '@/components/BalanceCard';
import {
  mockClientes, mockCuentas, mockPropiedades,
  formatCurrency, getTotalCartera,
  tipoCuentaLabels, estadoCuentaLabels, etapaProcesoLabels, getClienteById,
} from '@/data/store';
import {
  Plus, BarChart3, Search, Eye, FileDown, PieChart,
  DollarSign, Users, Briefcase,
} from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterEstado, setFilterEstado] = useState('todos');
  const [filterTipo, setFilterTipo] = useState('todos');

  const cuentasConCliente = mockCuentas.map(cu => ({
    ...cu,
    cliente: getClienteById(cu.cliente_id),
  }));

  const filtered = cuentasConCliente.filter(cu => {
    const matchSearch =
      !search ||
      cu.cliente?.nombre.toLowerCase().includes(search.toLowerCase()) ||
      cu.numero_cuenta.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filterEstado === 'todos' || cu.estado === filterEstado;
    const matchTipo = filterTipo === 'todos' || cu.tipo === filterTipo;
    return matchSearch && matchEstado && matchTipo;
  });

  const totalCartera = getTotalCartera();
  const clientesActivos = mockClientes.length;
  const cuentasActivas = mockCuentas.filter(c => c.estado === 'activa').length;

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <div className="gradient-hero px-8 pt-8 pb-12 rounded-b-[2rem]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-2">
              Gestión de Cartera
            </h1>
            <p className="text-primary-foreground/70 mb-6">
              Administra cuentas, cobros y procesos jurídicos
            </p>
            <div className="flex flex-wrap gap-3">
              <Button variant="hero" onClick={() => navigate('/clientes/nuevo')}>
                <Plus className="w-4 h-4 mr-1" /> Nuevo Cliente
              </Button>
              <Button variant="heroOutline" onClick={() => navigate('/graficos')}>
                <BarChart3 className="w-4 h-4 mr-1" /> Ver gráficos generales
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 -mt-6">
        {/* Balance cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <BalanceCard label="Cartera Total" amount={totalCartera} variant="highlight" icon={<DollarSign className="w-4 h-4 text-primary" />} />
          <BalanceCard label="Clientes Activos" amount={clientesActivos} icon={<Users className="w-4 h-4 text-primary" />} />
          <BalanceCard label="Cuentas Activas" amount={cuentasActivas} icon={<Briefcase className="w-4 h-4 text-primary" />} />
        </div>

        {/* Filters */}
        <div className="bg-card rounded-2xl shadow-card p-6 mb-6 border border-border/50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente o número de cuenta..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 rounded-full"
              />
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-[160px] rounded-full">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="activa">Activa</SelectItem>
                <SelectItem value="cerrada">Cerrada</SelectItem>
                <SelectItem value="en_proceso">En Proceso</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[160px] rounded-full">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="juridica">Jurídica</SelectItem>
                <SelectItem value="extrajudicial">Extrajudicial</SelectItem>
                <SelectItem value="acuerdo_de_pago">Acuerdo de Pago</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cuenta</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((cu, i) => (
                  <motion.tr
                    key={cu.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/50 hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-6 py-4 font-medium text-foreground">{cu.cliente?.nombre}</td>
                    <td className="px-6 py-4 text-muted-foreground font-mono text-sm">{cu.numero_cuenta}</td>
                    <td className="px-6 py-4">
                      <StatusBadge variant={cu.tipo === 'juridica' ? 'juridica' : cu.tipo === 'extrajudicial' ? 'pendiente' : 'parcial'}>
                        {tipoCuentaLabels[cu.tipo]}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge variant={cu.estado === 'activa' ? 'activa' : cu.estado === 'cerrada' ? 'cerrada' : 'en_proceso'}>
                        {estadoCuentaLabels[cu.estado]}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/clientes/${cu.cliente_id}`)} title="Ver cliente">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate('/graficos')} title="Ver gráficos">
                          <PieChart className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No se encontraron resultados</div>
          )}
        </div>
      </div>
    </div>
  );
}
