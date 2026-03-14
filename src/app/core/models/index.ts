export type TipoPersona = 'natural' | 'juridica';

export interface Cliente {
  id: string;
  nombre: string;
  tipo_persona: TipoPersona;
  documento: string;
  telefono: string;
  email: string;
  direccion: string;
  observaciones: string;
  created_at: string;
}

export type TipoPropiedad = 'apartamento' | 'local' | 'parqueadero' | 'otro';

export interface Propiedad {
  id: string;
  cliente_id: string;
  tipo_propiedad: TipoPropiedad;
  identificador: string;
  direccion: string;
  notas: string;
  monto_a_la_fecha: number;
  created_at: string;
}

export type EstadoPago = 'pendiente' | 'parcial' | 'pagado' | 'vencido';
export type ConceptoPago = 'administracion' | 'intereses' | 'extraordinaria' | 'otros';

export interface HistorialPago {
  id: string;
  propiedad_id: string;
  periodo: string;
  concepto: ConceptoPago;
  valor_cobrado: number;
  valor_pagado: number;
  fecha_pago: string;
  estado_pago: EstadoPago;
  monto_a_la_fecha: number;
  observaciones: string;
  created_at: string;
}

export type TipoCuenta = 'juridica' | 'extrajudicial' | 'acuerdo_de_pago';
export type EstadoCuenta = 'activa' | 'cerrada' | 'en_proceso';
export type EtapaProceso = 'inicial' | 'notificacion' | 'conciliacion' | 'demanda' | 'ejecucion';

export interface Cuenta {
  id: string;
  cliente_id: string;
  propiedad_id?: string;
  numero_cuenta: string;
  tipo: TipoCuenta;
  estado: EstadoCuenta;
  etapa_proceso: EtapaProceso;
  created_at: string;
}

export interface Gestion {
  id: string;
  propiedad_id: string;
  fecha: string;
  estado: string;
  descripcion: string;
  created_at: string;
}

export interface EstadoCuentaFile {
  id: string;
  nombre: string;
  archivo: File;
  fecha_subida: string;
  propiedad_id?: string;
  notas?: string;
}
