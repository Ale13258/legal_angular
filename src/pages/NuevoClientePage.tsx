import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function NuevoClientePage() {
  const navigate = useNavigate();
  const [tipoPersona, setTipoPersona] = useState<'natural' | 'juridica'>('natural');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Cliente creado exitosamente');
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen pb-12">
      <div className="gradient-hero px-8 pt-6 pb-10 rounded-b-[2rem]">
        <div className="max-w-3xl mx-auto">
          <Button variant="heroOutline" size="sm" onClick={() => navigate('/dashboard')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-primary-foreground">Nuevo Cliente</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 -mt-6">
        <motion.form
          onSubmit={handleSubmit}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-card p-8 border border-border/50 space-y-6"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Nombre completo / Razón social</Label>
              <Input placeholder="Nombre del cliente" required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Tipo de persona</Label>
              <Select value={tipoPersona} onValueChange={(v: 'natural' | 'juridica') => setTipoPersona(v)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="natural">Persona Natural</SelectItem>
                  <SelectItem value="juridica">Persona Jurídica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{tipoPersona === 'natural' ? 'Cédula de Ciudadanía (CC)' : 'NIT'}</Label>
              <Input placeholder={tipoPersona === 'natural' ? '1.023.456.789' : '900.123.456-7'} required className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Teléfono</Label>
              <Input placeholder="310 234 5678" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="cliente@email.com" className="rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input placeholder="Dirección del cliente" className="rounded-xl" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Observaciones o comentarios</Label>
            <Textarea placeholder="Notas adicionales sobre el cliente..." rows={4} className="rounded-xl" />
          </div>
          <div className="flex justify-end">
            <Button type="submit" size="lg">
              <Save className="w-4 h-4 mr-1" /> Guardar Cliente
            </Button>
          </div>
        </motion.form>
      </div>
    </div>
  );
}
