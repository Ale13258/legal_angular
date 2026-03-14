import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Send, Copy, Eye, Pencil } from 'lucide-react';
import { formatCurrency } from '@/data/store';
import type { Propiedad, Cliente } from '@/types';
import { toast } from 'sonner';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propiedad: Propiedad;
  cliente: Cliente;
  saldo: number;
}

function generateTemplate(cliente: Cliente, propiedad: Propiedad, saldo: number): string {
  const fecha = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  return `Estimado(a) ${cliente.nombre},

Por medio de la presente nos permitimos recordarle que a la fecha presenta un saldo pendiente de pago correspondiente a la propiedad ${propiedad.identificador} ubicada en ${propiedad.direccion}.

Monto pendiente: ${formatCurrency(saldo)}
Fecha de corte: ${fecha}

Le solicitamos amablemente realizar el pago a la mayor brevedad posible para evitar la generación de intereses de mora y/o el inicio de acciones de cobro adicionales.

Si ya realizó el pago, por favor haga caso omiso de esta comunicación y envíenos el soporte respectivo.

Para cualquier consulta o acuerdo de pago, no dude en comunicarse con nosotros.

Cordialmente,
Departamento de Cartera`;
}

function generateHTMLTemplate(cliente: Cliente, propiedad: Propiedad, saldo: number, asunto: string, cuerpoTexto: string): string {
  const fecha = new Date().toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
  const parrafos = cuerpoTexto.split('\n\n').filter(p => p.trim());

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${asunto}</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f7;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f4f4f7;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6b3cc8 0%, #8b5cf6 100%); padding:32px 40px; text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:700;letter-spacing:-0.5px;">
                📋 Recordatorio de Pago
              </h1>
              <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:14px;">${fecha}</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:32px 40px;">
              ${parrafos.map(p => {
                if (p.includes('Monto pendiente:') || p.includes('Fecha de corte:')) {
                  const lines = p.split('\n');
                  return `
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#faf5ff;border-radius:8px;border-left:4px solid #6b3cc8;margin:20px 0;">
                <tr>
                  <td style="padding:16px 20px;">
                    ${lines.map(line => {
                      if (line.includes('Monto pendiente:')) {
                        const parts = line.split(':');
                        return `<p style="margin:0 0 4px;font-size:14px;color:#4a4a68;"><strong>${parts[0]}:</strong> <span style="color:#6b3cc8;font-size:18px;font-weight:700;">${parts.slice(1).join(':').trim()}</span></p>`;
                      }
                      return `<p style="margin:0 0 4px;font-size:14px;color:#4a4a68;">${line}</p>`;
                    }).join('')}
                  </td>
                </tr>
              </table>`;
                }
                return `<p style="color:#4a4a68;font-size:15px;line-height:1.7;margin:0 0 16px;">${p.replace(/\n/g, '<br>')}</p>`;
              }).join('')}
            </td>
          </tr>

          <!-- Info Card -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#f8f9fc;border-radius:8px;">
                <tr>
                  <td style="padding:20px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#8b8ba7;text-transform:uppercase;letter-spacing:0.5px;">Datos de la Propiedad</p>
                    <p style="margin:0 0 4px;font-size:14px;color:#4a4a68;"><strong>Propiedad:</strong> ${propiedad.identificador}</p>
                    <p style="margin:0 0 4px;font-size:14px;color:#4a4a68;"><strong>Dirección:</strong> ${propiedad.direccion}</p>
                    <p style="margin:0;font-size:14px;color:#4a4a68;"><strong>Cliente:</strong> ${cliente.nombre}</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fc;padding:24px 40px;text-align:center;border-top:1px solid #e8e8ef;">
              <p style="margin:0 0 4px;font-size:13px;color:#8b8ba7;">Este es un mensaje automático del sistema de gestión de cartera.</p>
              <p style="margin:0;font-size:13px;color:#8b8ba7;">Si tiene alguna consulta, comuníquese con el Departamento de Cartera.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export default function PaymentReminderDialog({ open, onOpenChange, propiedad, cliente, saldo }: Props) {
  const [asunto, setAsunto] = useState(`Recordatorio de pago — ${propiedad.identificador}`);
  const [destinatario, setDestinatario] = useState(cliente.email);
  const [cuerpo, setCuerpo] = useState(() => generateTemplate(cliente, propiedad, saldo));
  const [tab, setTab] = useState('editar');

  const htmlTemplate = generateHTMLTemplate(cliente, propiedad, saldo, asunto, cuerpo);

  const handleCopy = () => {
    const full = `Para: ${destinatario}\nAsunto: ${asunto}\n\n${cuerpo}`;
    navigator.clipboard.writeText(full);
    toast.success('Plantilla copiada al portapapeles');
  };

  const handleCopyHTML = () => {
    navigator.clipboard.writeText(htmlTemplate);
    toast.success('Plantilla HTML copiada al portapapeles');
  };

  const handleSendMailto = () => {
    const mailto = `mailto:${encodeURIComponent(destinatario)}?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(cuerpo)}`;
    window.open(mailto, '_blank');
    toast.success('Se abrió el cliente de correo');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Mail className="w-5 h-5 text-primary" /> Notificación de Recordatorio de Pago
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Destinatario</label>
              <Input value={destinatario} onChange={e => setDestinatario(e.target.value)} type="email" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Asunto</label>
              <Input value={asunto} onChange={e => setAsunto(e.target.value)} />
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="w-full">
              <TabsTrigger value="editar" className="flex-1 gap-2">
                <Pencil className="w-3.5 h-3.5" /> Editar Texto
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex-1 gap-2">
                <Eye className="w-3.5 h-3.5" /> Vista Previa Email
              </TabsTrigger>
            </TabsList>

            <TabsContent value="editar" className="mt-3">
              <Textarea
                value={cuerpo}
                onChange={e => setCuerpo(e.target.value)}
                rows={14}
                className="font-mono text-sm"
              />
            </TabsContent>

            <TabsContent value="preview" className="mt-3">
              <div className="border border-border rounded-xl overflow-hidden bg-[#f4f4f7]">
                <div className="bg-muted/80 px-4 py-2 border-b border-border flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="w-3.5 h-3.5" />
                  <span>Vista previa del correo electrónico</span>
                </div>
                <div
                  className="p-4"
                  dangerouslySetInnerHTML={{ __html: htmlTemplate }}
                  style={{ maxHeight: '500px', overflow: 'auto' }}
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="bg-muted/50 rounded-xl p-4 text-sm space-y-1">
            <p className="font-medium text-foreground">Resumen</p>
            <p className="text-muted-foreground">Cliente: {cliente.nombre} — {cliente.email}</p>
            <p className="text-muted-foreground">Propiedad: {propiedad.identificador}</p>
            <p className="text-muted-foreground">Monto pendiente: <span className="font-bold text-destructive">{formatCurrency(saldo)}</span></p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleCopy} className="flex-1">
              <Copy className="w-4 h-4 mr-2" /> Copiar Texto
            </Button>
            <Button variant="outline" onClick={handleCopyHTML} className="flex-1">
              <Copy className="w-4 h-4 mr-2" /> Copiar HTML
            </Button>
            <Button onClick={handleSendMailto} className="flex-1">
              <Send className="w-4 h-4 mr-2" /> Abrir en Correo
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
