import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/StatusBadge';
import { BalanceCard } from '@/components/BalanceCard';
import {
  getClienteById, getPropiedadesByCliente, getCuentasByCliente,
  formatCurrency, tipoPropiedadLabels, tipoCuentaLabels,
  estadoCuentaLabels, etapaProcesoLabels, getHistorialByPropiedad,
} from '@/data/store';
import {
  ArrowLeft, Plus, Eye, Pencil, Trash2, Mail, Phone, MapPin,
  User, Building2, DollarSign, FileDown, FileText,
} from 'lucide-react';
import ClientReportDialog from '@/components/ClientReportDialog';
import ReportPreviewDialog from '@/components/ReportPreviewDialog';
import type { Propiedad } from '@/types';

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const cliente = getClienteById(id!);
  const propiedades = getPropiedadesByCliente(id!);
  const cuentas = getCuentasByCliente(id!);
  const [clientReportOpen, setClientReportOpen] = useState(false);
  const [propReportOpen, setPropReportOpen] = useState(false);
  const [selectedProp, setSelectedProp] = useState<Propiedad | null>(null);

  const openPropReport = (p: Propiedad) => {
    setSelectedProp(p);
    setPropReportOpen(true);
  };

  if (!cliente) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        Cliente no encontrado.
        <Button variant="outline" onClick={() => navigate('/dashboard')} className="ml-4">Volver</Button>
      </div>
    );
  }

  const totalMonto = propiedades.reduce((sum, p) => sum + p.monto_a_la_fecha, 0);

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <div className="gradient-hero px-8 pt-6 pb-10 rounded-b-[2rem]">
        <div className="max-w-6xl mx-auto">
          <Button variant="heroOutline" size="sm" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">{cliente.nombre}</h1>
          <p className="text-primary-foreground/70 text-sm">
            {cliente.tipo_persona === 'natural' ? `CC: ${cliente.documento}` : `NIT: ${cliente.documento}`}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 -mt-6 space-y-6">
        {/* Client info + balance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 bg-card rounded-2xl shadow-card p-6 border border-border/50">
            <h2 className="font-display font-bold text-lg text-foreground mb-4 flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> Información del Cliente
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="w-4 h-4" /> {cliente.email}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="w-4 h-4" /> {cliente.telefono}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground col-span-2">
                <MapPin className="w-4 h-4" /> {cliente.direccion}
              </div>
              {cliente.observaciones && (
                <div className="col-span-2 bg-secondary/50 rounded-xl p-3 text-muted-foreground text-sm">
                  <span className="font-medium text-foreground">Observaciones:</span> {cliente.observaciones}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <BalanceCard label="Monto a la fecha" amount={totalMonto} variant="highlight" icon={<DollarSign className="w-4 h-4 text-primary" />} />
            <Button variant="outline" onClick={() => setClientReportOpen(true)} className="w-full">
              <FileDown className="w-4 h-4 mr-2" /> Informe General
            </Button>
          </div>
        </div>

        {/* Properties */}
        <div className="bg-card rounded-2xl shadow-card p-6 border border-border/50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
              <Building2 className="w-5 h-5 text-primary" /> Propiedades del Cliente
            </h2>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-1" /> Añadir Propiedad
            </Button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Propiedad</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identificador</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Monto a la fecha</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {propiedades.map((p, i) => (
                  <motion.tr
                    key={p.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-border/50 hover:bg-secondary/50 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">{p.direccion}</td>
                    <td className="px-4 py-3">
                      <StatusBadge variant="default">{tipoPropiedadLabels[p.tipo_propiedad]}</StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-sm">{p.identificador}</td>
                    <td className="px-4 py-3 text-right font-bold text-foreground tabular-nums">{formatCurrency(p.monto_a_la_fecha)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openPropReport(p)} title="Informe de propiedad">
                          <FileText className="w-4 h-4 text-primary" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => navigate(`/propiedades/${p.id}`)} title="Ver detalle">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Eliminar">
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          {propiedades.length === 0 && <p className="text-center py-8 text-muted-foreground">No hay propiedades registradas.</p>}
        </div>

        {/* Cuentas */}
        <div className="bg-card rounded-2xl shadow-card p-6 border border-border/50">
          <h2 className="font-display font-bold text-lg text-foreground mb-4">Cuentas del Cliente</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Cuenta</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Etapa</th>
                </tr>
              </thead>
              <tbody>
                {cuentas.map(cu => (
                  <tr key={cu.id} className="border-b border-border/50 hover:bg-secondary/50 transition-colors">
                    <td className="px-4 py-3 font-mono text-sm">{cu.numero_cuenta}</td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={cu.tipo === 'juridica' ? 'juridica' : 'pendiente'}>
                        {tipoCuentaLabels[cu.tipo]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge variant={cu.estado === 'activa' ? 'activa' : cu.estado === 'cerrada' ? 'cerrada' : 'en_proceso'}>
                        {estadoCuentaLabels[cu.estado]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{etapaProcesoLabels[cu.etapa_proceso]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {cuentas.length === 0 && <p className="text-center py-8 text-muted-foreground">No hay cuentas registradas.</p>}
        </div>
      </div>

      <ClientReportDialog
        open={clientReportOpen}
        onOpenChange={setClientReportOpen}
        cliente={cliente}
        propiedades={propiedades}
      />

      {selectedProp && (() => {
        const hist = getHistorialByPropiedad(selectedProp.id);
        const totalCobrado = hist.reduce((s, h) => s + h.valor_cobrado, 0);
        const totalPagado = hist.reduce((s, h) => s + h.valor_pagado, 0);
        return (
          <ReportPreviewDialog
            open={propReportOpen}
            onOpenChange={setPropReportOpen}
            propiedad={selectedProp}
            clienteNombre={cliente.nombre}
            historial={hist}
            totalCobrado={totalCobrado}
            totalPagado={totalPagado}
            saldo={totalCobrado - totalPagado}
          />
        );
      })()}
    </div>
  );
}
