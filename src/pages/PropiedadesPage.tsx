import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { StatusBadge } from '@/components/StatusBadge';
import { Button } from '@/components/ui/button';
import {
  mockPropiedades, getClienteById, formatCurrency, tipoPropiedadLabels,
} from '@/data/store';
import { Search, Eye, Building2 } from 'lucide-react';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

export default function PropiedadesPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [filterTipo, setFilterTipo] = useState('todos');

  const propiedadesConCliente = mockPropiedades.map(p => ({
    ...p,
    cliente: getClienteById(p.cliente_id),
  }));

  const filtered = propiedadesConCliente.filter(p => {
    const matchSearch =
      !search ||
      p.identificador.toLowerCase().includes(search.toLowerCase()) ||
      p.direccion.toLowerCase().includes(search.toLowerCase()) ||
      p.cliente?.nombre.toLowerCase().includes(search.toLowerCase());
    const matchTipo = filterTipo === 'todos' || p.tipo_propiedad === filterTipo;
    return matchSearch && matchTipo;
  });

  return (
    <div className="min-h-screen">
      <div className="gradient-hero px-8 pt-8 pb-12 rounded-b-[2rem]">
        <div className="max-w-6xl mx-auto">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-primary-foreground mb-2">Propiedades</h1>
            <p className="text-primary-foreground/70 mb-6">Listado general de todas las propiedades</p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 -mt-6">
        {/* Filters */}
        <div className="bg-card rounded-2xl shadow-card p-6 mb-6 border border-border/50">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por identificador, dirección o cliente..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 rounded-full"
              />
            </div>
            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[180px] rounded-full">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los tipos</SelectItem>
                <SelectItem value="apartamento">Apartamento</SelectItem>
                <SelectItem value="local">Local</SelectItem>
                <SelectItem value="parqueadero">Parqueadero</SelectItem>
                <SelectItem value="otro">Otro</SelectItem>
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
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identificador</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Dirección</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cliente</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monto a la fecha</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((prop, i) => (
                  <motion.tr
                    key={prop.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/50 hover:bg-secondary/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/propiedades/${prop.id}`)}
                  >
                    <td className="px-6 py-4 font-medium text-foreground">{prop.identificador}</td>
                    <td className="px-6 py-4 text-muted-foreground">{prop.direccion}</td>
                    <td className="px-6 py-4 text-muted-foreground">{prop.cliente?.nombre}</td>
                    <td className="px-6 py-4">
                      <StatusBadge variant={prop.tipo_propiedad === 'local' ? 'juridica' : prop.tipo_propiedad === 'parqueadero' ? 'pendiente' : 'activa'}>
                        {tipoPropiedadLabels[prop.tipo_propiedad]}
                      </StatusBadge>
                    </td>
                    <td className="px-6 py-4 text-right font-semibold text-foreground">
                      {prop.monto_a_la_fecha > 0 ? formatCurrency(prop.monto_a_la_fecha) : <span className="text-muted-foreground">$0</span>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end">
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); navigate(`/propiedades/${prop.id}`); }} title="Ver detalle">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">No se encontraron propiedades</div>
          )}
        </div>
      </div>
    </div>
  );
}
