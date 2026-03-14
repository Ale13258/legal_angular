import { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { BalanceCard } from '@/components/BalanceCard';
import {
  getPropiedadById, getClienteById, getHistorialByPropiedad,
  getGestionesByPropiedad, formatCurrency, conceptoLabels,
  estadoPagoLabels, tipoPropiedadLabels,
} from '@/data/store';
import {
  ArrowLeft, Plus, Pencil, Trash2, DollarSign, TrendingUp,
  Receipt, Calendar, ClipboardList, Upload, FileText, X, FileDown, Bell,
} from 'lucide-react';
import ReportPreviewDialog from '@/components/ReportPreviewDialog';
import RegistrarGestionDialog from '@/components/RegistrarGestionDialog';
import PaymentReminderDialog from '@/components/PaymentReminderDialog';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import type { EstadoPago } from '@/types';
import type { EstadoCuentaFile } from '@/types';

const estadoVariant = (e: EstadoPago) => {
  if (e === 'pagado') return 'pagado';
  if (e === 'vencido') return 'vencido';
  if (e === 'parcial') return 'parcial';
  return 'pendiente';
};

export default function PropiedadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const propiedad = getPropiedadById(id!);
  const [archivos, setArchivos] = useState<EstadoCuentaFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [gestionOpen, setGestionOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  if (!propiedad) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Propiedad no encontrada.
        <Button variant="outline" onClick={() => navigate(-1)} className="ml-4">Volver</Button>
      </div>
    );
  }

  const cliente = getClienteById(propiedad.cliente_id);
  const historial = getHistorialByPropiedad(propiedad.id);
  const gestiones = getGestionesByPropiedad(propiedad.id);

  const totalCobrado = historial.reduce((s, h) => s + h.valor_cobrado, 0);
  const totalPagado = historial.reduce((s, h) => s + h.valor_pagado, 0);
  const saldoActual = totalCobrado - totalPagado;

  // Chart data grouped by periodo
  const periodos = [...new Set(historial.map(h => h.periodo))].sort();
  const chartData = periodos.map(p => {
    const items = historial.filter(h => h.periodo === p);
    return {
      periodo: p,
      cobrado: items.reduce((s, h) => s + h.valor_cobrado, 0),
      pagado: items.reduce((s, h) => s + h.valor_pagado, 0),
    };
  });

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="gradient-hero px-8 pt-6 pb-10 rounded-b-[2rem]">
        <div className="max-w-6xl mx-auto">
          <Button variant="heroOutline" size="sm" onClick={() => navigate(`/clientes/${propiedad.cliente_id}`)} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver al cliente
          </Button>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">{propiedad.identificador}</h1>
          <p className="text-primary-foreground/70 text-sm">
            {tipoPropiedadLabels[propiedad.tipo_propiedad]} — {propiedad.direccion}
            {cliente && ` — ${cliente.nombre}`}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 -mt-6 space-y-6">
        {/* Financial summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <BalanceCard label="Total Cobrado" amount={totalCobrado} icon={<Receipt className="w-4 h-4 text-primary" />} />
          <BalanceCard label="Total Pagado" amount={totalPagado} icon={<TrendingUp className="w-4 h-4 text-primary" />} />
          <BalanceCard label="Monto a la fecha" amount={saldoActual} variant="highlight" icon={<DollarSign className="w-4 h-4 text-primary" />} />
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setReminderOpen(true)}>
            <Bell className="w-4 h-4 mr-2" /> Recordatorio de Pago
          </Button>
        </div>

        {/* Mini chart */}
        {chartData.length > 0 && (
          <div className="bg-card rounded-2xl shadow-card p-6 border border-border/50">
            <h3 className="font-display font-bold text-foreground mb-4">Cobrado vs Pagado por Periodo</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 5.9% 90%)" />
                <XAxis dataKey="periodo" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={v => `$${(v / 1_000_000).toFixed(1)}M`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="cobrado" fill="hsl(263 70% 50%)" radius={[6, 6, 0, 0]} name="Cobrado" />
                <Bar dataKey="pagado" fill="hsl(142 71% 45%)" radius={[6, 6, 0, 0]} name="Pagado" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Payment history */}
        <div className="bg-card rounded-2xl shadow-card p-6 border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-primary" /> Informe Interno: Historial de Pagos
            </h2>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setReportOpen(true)}>
                <FileDown className="w-4 h-4 mr-1" /> Editar y Descargar
              </Button>
              <Button size="sm"><Plus className="w-4 h-4 mr-1" /> Agregar Registro</Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {['Periodo', 'Concepto', 'Valor Cobrado', 'Valor Pagado', 'Estado', 'Fecha Pago', 'Monto a la fecha'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">{h}</th>
                  ))}
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((h, i) => (
                  <motion.tr
                    key={h.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-border/50 hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-mono text-sm">{h.periodo}</td>
                    <td className="px-4 py-3">{conceptoLabels[h.concepto]}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">{formatCurrency(h.valor_cobrado)}</td>
                    <td className="px-4 py-3 tabular-nums font-medium">{formatCurrency(h.valor_pagado)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={estadoVariant(h.estado_pago)}>{estadoPagoLabels[h.estado_pago]}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-sm">{h.fecha_pago || '—'}</td>
                    <td className="px-4 py-3 tabular-nums font-bold text-foreground">{formatCurrency(h.monto_a_la_fecha)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" title="Editar"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" title="Eliminar"><Trash2 className="w-4 h-4 text-destructive" /></Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {historial.length === 0 && <p className="text-center py-8 text-muted-foreground">No hay registros.</p>}
        </div>

        {/* Gestiones timeline */}
        <div className="bg-card rounded-2xl shadow-card p-6 border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" /> Gestiones de Cobro
            </h2>
            <Button size="sm" onClick={() => setGestionOpen(true)}><Plus className="w-4 h-4 mr-1" /> Registrar Gestión</Button>
          </div>
          <div className="space-y-4">
            {gestiones.map((g, i) => (
              <motion.div
                key={g.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-4"
              >
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-primary mt-1" />
                  {i < gestiones.length - 1 && <div className="w-0.5 flex-1 bg-border mt-1" />}
                </div>
                <div className="flex-1 pb-4">
                  <p className="text-xs text-muted-foreground font-mono">{g.fecha}</p>
                  <p className="text-sm text-foreground">{g.descripcion}</p>
                </div>
              </motion.div>
            ))}
          </div>
          {gestiones.length === 0 && <p className="text-center py-8 text-muted-foreground">No hay gestiones registradas.</p>}
        </div>

        {/* Estados de Cuenta */}
        <div className="bg-card rounded-2xl shadow-card p-6 border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" /> Estados de Cuenta
            </h2>
            <Button size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="w-4 h-4 mr-1" /> Subir Archivo
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const nuevo: EstadoCuentaFile = {
                  id: crypto.randomUUID(),
                  nombre: file.name,
                  archivo: file,
                  fecha_subida: new Date().toISOString(),
                  propiedad_id: propiedad.id,
                };
                setArchivos(prev => [nuevo, ...prev]);
                e.target.value = '';
              }}
            />
          </div>
          {archivos.length > 0 ? (
            <div className="space-y-2">
              {archivos.map((arch) => (
                <motion.div
                  key={arch.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-between bg-secondary/50 rounded-xl px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{arch.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(arch.fecha_subida).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {' · '}
                        {(arch.archivo.size / 1024).toFixed(0)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setArchivos(prev => prev.filter(a => a.id !== arch.id))}
                    title="Eliminar"
                  >
                    <X className="w-4 h-4 text-destructive" />
                  </Button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed border-border rounded-xl">
              <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="text-sm">No hay estados de cuenta. Sube un PDF, Excel o imagen.</p>
            </div>
          )}
        </div>
      </div>

      <ReportPreviewDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        propiedad={propiedad}
        clienteNombre={cliente?.nombre || 'Sin cliente'}
        historial={historial}
        totalCobrado={totalCobrado}
        totalPagado={totalPagado}
        saldo={saldoActual}
      />

      <RegistrarGestionDialog
        open={gestionOpen}
        onOpenChange={setGestionOpen}
        propiedadId={propiedad.id}
      />

      {cliente && (
        <PaymentReminderDialog
          open={reminderOpen}
          onOpenChange={setReminderOpen}
          propiedad={propiedad}
          cliente={cliente}
          saldo={saldoActual}
        />
      )}
    </div>
  );
}
