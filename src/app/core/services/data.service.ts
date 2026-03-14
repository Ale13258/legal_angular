import { Injectable } from '@angular/core';
import type {
  Cliente,
  Propiedad,
  HistorialPago,
  Cuenta,
  Gestion,
} from '../models';

const MOCK_CLIENTES: Cliente[] = [
  {
    id: 'c1',
    nombre: 'María Alejandra Rodríguez',
    tipo_persona: 'natural',
    documento: '1.023.456.789',
    telefono: '310 234 5678',
    email: 'maria.rodriguez@email.com',
    direccion: 'Cra 15 #82-30, Bogotá',
    observaciones:
      'Cliente con mora recurrente en administración. Se ha contactado en varias ocasiones.',
    created_at: '2024-06-15',
  },
  {
    id: 'c2',
    nombre: 'Inversiones El Dorado S.A.S',
    tipo_persona: 'juridica',
    documento: '900.123.456-7',
    telefono: '601 345 6789',
    email: 'contabilidad@eldorado.com',
    direccion: 'Av Boyacá #64-20, Bogotá',
    observaciones:
      'Empresa con múltiples propiedades. Contacto: Carlos Gómez (representante legal).',
    created_at: '2024-03-10',
  },
  {
    id: 'c3',
    nombre: 'Juan Carlos Mendoza',
    tipo_persona: 'natural',
    documento: '80.234.567',
    telefono: '315 678 9012',
    email: 'jcmendoza@gmail.com',
    direccion: 'Cll 100 #45-12, Bogotá',
    observaciones: '',
    created_at: '2025-01-20',
  },
];

const MOCK_PROPIEDADES: Propiedad[] = [
  {
    id: 'p1',
    cliente_id: 'c1',
    tipo_propiedad: 'apartamento',
    identificador: 'Torre A – Apto 301',
    direccion: 'Conjunto Residencial Los Pinos',
    notas: 'Propiedad principal de la cliente',
    monto_a_la_fecha: 3_450_000,
    created_at: '2024-06-15',
  },
  {
    id: 'p2',
    cliente_id: 'c1',
    tipo_propiedad: 'parqueadero',
    identificador: 'Parqueadero 45',
    direccion: 'Conjunto Residencial Los Pinos',
    notas: '',
    monto_a_la_fecha: 580_000,
    created_at: '2024-06-15',
  },
  {
    id: 'p3',
    cliente_id: 'c2',
    tipo_propiedad: 'local',
    identificador: 'Local 102-A',
    direccion: 'Centro Comercial Plaza Norte',
    notas: 'Local comercial grande, primer piso',
    monto_a_la_fecha: 8_200_000,
    created_at: '2024-03-10',
  },
  {
    id: 'p4',
    cliente_id: 'c2',
    tipo_propiedad: 'apartamento',
    identificador: 'Torre B – Apto 1502',
    direccion: 'Edificio Torres del Parque',
    notas: '',
    monto_a_la_fecha: 2_050_000,
    created_at: '2024-05-01',
  },
  {
    id: 'p5',
    cliente_id: 'c3',
    tipo_propiedad: 'apartamento',
    identificador: 'Torre C – Apto 801',
    direccion: 'Conjunto Altos del Retiro',
    notas: '',
    monto_a_la_fecha: 0,
    created_at: '2025-01-20',
  },
];

const MOCK_HISTORIAL: HistorialPago[] = [
  {
    id: 'h1',
    propiedad_id: 'p1',
    periodo: '2025-01',
    concepto: 'administracion',
    valor_cobrado: 850_000,
    valor_pagado: 0,
    fecha_pago: '',
    estado_pago: 'vencido',
    monto_a_la_fecha: 850_000,
    observaciones: '',
    created_at: '2025-01-01',
  },
  {
    id: 'h2',
    propiedad_id: 'p1',
    periodo: '2025-02',
    concepto: 'administracion',
    valor_cobrado: 850_000,
    valor_pagado: 850_000,
    fecha_pago: '2025-02-15',
    estado_pago: 'pagado',
    monto_a_la_fecha: 850_000,
    observaciones: 'Pago oportuno',
    created_at: '2025-02-01',
  },
  {
    id: 'h3',
    propiedad_id: 'p1',
    periodo: '2025-03',
    concepto: 'administracion',
    valor_cobrado: 850_000,
    valor_pagado: 400_000,
    fecha_pago: '2025-03-20',
    estado_pago: 'parcial',
    monto_a_la_fecha: 1_300_000,
    observaciones: 'Abono parcial',
    created_at: '2025-03-01',
  },
  {
    id: 'h4',
    propiedad_id: 'p1',
    periodo: '2025-03',
    concepto: 'intereses',
    valor_cobrado: 450_000,
    valor_pagado: 0,
    fecha_pago: '',
    estado_pago: 'pendiente',
    monto_a_la_fecha: 1_750_000,
    observaciones: 'Intereses por mora',
    created_at: '2025-03-15',
  },
  {
    id: 'h5',
    propiedad_id: 'p1',
    periodo: '2025-04',
    concepto: 'administracion',
    valor_cobrado: 850_000,
    valor_pagado: 0,
    fecha_pago: '',
    estado_pago: 'pendiente',
    monto_a_la_fecha: 2_600_000,
    observaciones: '',
    created_at: '2025-04-01',
  },
  {
    id: 'h6',
    propiedad_id: 'p1',
    periodo: '2025-04',
    concepto: 'extraordinaria',
    valor_cobrado: 850_000,
    valor_pagado: 0,
    fecha_pago: '',
    estado_pago: 'pendiente',
    monto_a_la_fecha: 3_450_000,
    observaciones: 'Cuota extraordinaria mejoras',
    created_at: '2025-04-10',
  },
  {
    id: 'h7',
    propiedad_id: 'p3',
    periodo: '2025-01',
    concepto: 'administracion',
    valor_cobrado: 2_200_000,
    valor_pagado: 0,
    fecha_pago: '',
    estado_pago: 'vencido',
    monto_a_la_fecha: 2_200_000,
    observaciones: '',
    created_at: '2025-01-01',
  },
  {
    id: 'h8',
    propiedad_id: 'p3',
    periodo: '2025-02',
    concepto: 'administracion',
    valor_cobrado: 2_200_000,
    valor_pagado: 0,
    fecha_pago: '',
    estado_pago: 'vencido',
    monto_a_la_fecha: 4_400_000,
    observaciones: '',
    created_at: '2025-02-01',
  },
  {
    id: 'h9',
    propiedad_id: 'p3',
    periodo: '2025-03',
    concepto: 'administracion',
    valor_cobrado: 2_200_000,
    valor_pagado: 0,
    fecha_pago: '',
    estado_pago: 'vencido',
    monto_a_la_fecha: 6_600_000,
    observaciones: '',
    created_at: '2025-03-01',
  },
  {
    id: 'h10',
    propiedad_id: 'p3',
    periodo: '2025-03',
    concepto: 'intereses',
    valor_cobrado: 1_600_000,
    valor_pagado: 0,
    fecha_pago: '',
    estado_pago: 'pendiente',
    monto_a_la_fecha: 8_200_000,
    observaciones: '',
    created_at: '2025-03-15',
  },
];

const MOCK_CUENTAS: Cuenta[] = [
  {
    id: 'cu1',
    cliente_id: 'c1',
    propiedad_id: 'p1',
    numero_cuenta: 'CTA-2025-001',
    tipo: 'juridica',
    estado: 'activa',
    etapa_proceso: 'notificacion',
    created_at: '2025-03-01',
  },
  {
    id: 'cu2',
    cliente_id: 'c2',
    propiedad_id: 'p3',
    numero_cuenta: 'CTA-2025-002',
    tipo: 'extrajudicial',
    estado: 'en_proceso',
    etapa_proceso: 'conciliacion',
    created_at: '2025-02-15',
  },
  {
    id: 'cu3',
    cliente_id: 'c2',
    propiedad_id: 'p4',
    numero_cuenta: 'CTA-2025-003',
    tipo: 'acuerdo_de_pago',
    estado: 'activa',
    etapa_proceso: 'inicial',
    created_at: '2025-04-01',
  },
  {
    id: 'cu4',
    cliente_id: 'c3',
    numero_cuenta: 'CTA-2025-004',
    tipo: 'extrajudicial',
    estado: 'cerrada',
    etapa_proceso: 'ejecucion',
    created_at: '2025-01-20',
  },
];

const MOCK_GESTIONES: Gestion[] = [
  {
    id: 'g1',
    propiedad_id: 'p1',
    fecha: '2025-01-15',
    estado: 'recibido',
    descripcion: 'Se recibe para cobro prejurídico',
    created_at: '2025-01-15',
  },
  {
    id: 'g2',
    propiedad_id: 'p1',
    fecha: '2025-02-01',
    estado: 'enviado',
    descripcion: 'Se envía recordatorio de pago vía correo electrónico',
    created_at: '2025-02-01',
  },
  {
    id: 'g3',
    propiedad_id: 'p1',
    fecha: '2025-02-15',
    estado: 'contactado',
    descripcion: 'Se recibe abono de $850.000',
    created_at: '2025-02-15',
  },
  {
    id: 'g4',
    propiedad_id: 'p1',
    fecha: '2025-03-10',
    estado: 'contactado',
    descripcion: 'Se realiza llamada telefónica, cliente solicita plazo',
    created_at: '2025-03-10',
  },
  {
    id: 'g5',
    propiedad_id: 'p1',
    fecha: '2025-03-20',
    estado: 'acordado',
    descripcion: 'Se recibe abono parcial de $400.000',
    created_at: '2025-03-20',
  },
  {
    id: 'g6',
    propiedad_id: 'p3',
    fecha: '2025-02-20',
    estado: 'recibido',
    descripcion: 'Se recibe para cobro extrajudicial',
    created_at: '2025-02-20',
  },
  {
    id: 'g7',
    propiedad_id: 'p3',
    fecha: '2025-03-05',
    estado: 'enviado',
    descripcion: 'Se envía comunicación formal de cobro',
    created_at: '2025-03-05',
  },
  {
    id: 'g8',
    propiedad_id: 'p3',
    fecha: '2025-03-20',
    estado: 'programado',
    descripcion: 'Se programa audiencia de conciliación',
    created_at: '2025-03-20',
  },
];

@Injectable({ providedIn: 'root' })
export class DataService {
  readonly mockClientes = MOCK_CLIENTES;
  readonly mockPropiedades = MOCK_PROPIEDADES;
  readonly mockHistorial = MOCK_HISTORIAL;
  readonly mockCuentas = MOCK_CUENTAS;
  readonly mockGestiones = MOCK_GESTIONES;

  readonly conceptoLabels: Record<string, string> = {
    administracion: 'Administración',
    intereses: 'Intereses',
    extraordinaria: 'Extraordinaria',
    otros: 'Otros',
  };
  readonly estadoPagoLabels: Record<string, string> = {
    pendiente: 'Pendiente',
    parcial: 'Parcial',
    pagado: 'Pagado',
    vencido: 'Vencido',
  };
  readonly tipoCuentaLabels: Record<string, string> = {
    juridica: 'Jurídica',
    extrajudicial: 'Extrajudicial',
    acuerdo_de_pago: 'Acuerdo de Pago',
  };
  readonly estadoCuentaLabels: Record<string, string> = {
    activa: 'Activa',
    cerrada: 'Cerrada',
    en_proceso: 'En Proceso',
  };
  readonly etapaProcesoLabels: Record<string, string> = {
    inicial: 'Inicial',
    notificacion: 'Notificación',
    conciliacion: 'Conciliación',
    demanda: 'Demanda',
    ejecucion: 'Ejecución',
  };
  readonly estadoGestionLabels: Record<string, string> = {
    recibido: 'Recibido',
    enviado: 'Enviado',
    contactado: 'Contactado',
    acordado: 'Acordado',
    programado: 'Programado',
    pendiente: 'Pendiente',
  };
  readonly tipoPropiedadLabels: Record<string, string> = {
    apartamento: 'Apartamento',
    local: 'Local',
    parqueadero: 'Parqueadero',
    otro: 'Otro',
  };

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  getClienteById(id: string): Cliente | undefined {
    return MOCK_CLIENTES.find((c) => c.id === id);
  }

  getPropiedadesByCliente(clienteId: string): Propiedad[] {
    return MOCK_PROPIEDADES.filter((p) => p.cliente_id === clienteId);
  }

  getPropiedadById(id: string): Propiedad | undefined {
    return MOCK_PROPIEDADES.find((p) => p.id === id);
  }

  getHistorialByPropiedad(propiedadId: string): HistorialPago[] {
    return MOCK_HISTORIAL.filter((h) => h.propiedad_id === propiedadId);
  }

  getCuentasByCliente(clienteId: string): Cuenta[] {
    return MOCK_CUENTAS.filter((c) => c.cliente_id === clienteId);
  }

  getGestionesByPropiedad(propiedadId: string): Gestion[] {
    return MOCK_GESTIONES.filter((g) => g.propiedad_id === propiedadId)
      .slice()
      .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  }

  calcularMontoALaFecha(propiedadId: string): number {
    const historial = this.getHistorialByPropiedad(propiedadId);
    const totalCobrado = historial.reduce((sum, h) => sum + h.valor_cobrado, 0);
    const totalPagado = historial.reduce((sum, h) => sum + h.valor_pagado, 0);
    return totalCobrado - totalPagado;
  }

  getTotalCartera(): number {
    return MOCK_PROPIEDADES.reduce((sum, p) => sum + p.monto_a_la_fecha, 0);
  }
}
