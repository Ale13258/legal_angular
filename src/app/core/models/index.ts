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

export type TipoPropiedad =
  | 'apartamento'
  | 'oficina'
  | 'local'
  | 'casa'
  | 'bodega'
  | 'garaje'
  | 'parqueadero'
  | 'otro';

/** Deudor/propietario a cobrar en una unidad. Puede tener varios correos. */
export interface DeudorCobro {
  nombre: string;
  tipo_persona: TipoPersona;
  documento: string;
  /** Al menos un correo; el primero es el principal del deudor. */
  emails: string[];
}

export interface Propiedad {
  id: string;
  cliente_id: string;
  tipo_propiedad: TipoPropiedad;
  identificador: string;
  direccion: string;
  notas: string;
  /** Valor base de la deuda; editable para corregir inconsistencias. */
  saldo_inicial?: number | null;
  monto_a_la_fecha: number;
  created_at: string;
  /**
   * Fuente de verdad de deudores de la unidad (mín. 1).
   * Si el API solo envía `cobro_*`, el cliente lo sintetiza.
   */
  deudores?: DeudorCobro[];
  /** Espejo de `deudores[0]` para retrocompatibilidad. */
  cobro_nombre: string;
  cobro_tipo_persona: TipoPersona;
  cobro_documento: string;
  /** Espejo de `deudores[0].emails[0]` para retrocompatibilidad. */
  cobro_email: string;
  /**
   * Días de mora agregados por unidad. El backend la calcula al persistir historial:
   * máximo de `dias_en_mora` por movimiento (misma idea que el fallback en el cliente Angular).
   * La regla fina (vencimiento, FIFO) vive en el servidor (`computeDiasEnMora`).
   */
  edad_mora_dias?: number | null;
  /**
   * Opcional: fecha que el backend asocia al inicio de cobro en sistema (no confundir con alta en app).
   */
  fecha_inicio_cobro?: string | null;
  /** Fecha en que la deuda llega a cero según backend o heurística de historial en cliente. */
  fecha_fin_cobro?: string | null;
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
  /**
   * Días en mora del movimiento/periodo, calculados en servidor al crear el historial.
   * El agregado por propiedad (`edad_mora_dias`) es el máximo entre filas del historial.
   */
  dias_en_mora?: number | null;
}

import type { EtapaProceso } from '../proceso-etapas';

export type { EtapaProceso };

export type TipoCuenta = 'juridica' | 'extrajudicial' | 'acuerdo_de_pago';
export type EstadoCuenta = 'activa' | 'cerrada' | 'en_proceso';

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

export type GestionOrigen = 'manual' | 'email_reminder';

export interface Gestion {
  id: string;
  propiedad_id: string;
  fecha: string;
  estado: string;
  descripcion: string;
  created_at: string;
  /** Origen de la gestión; ausente o `manual` = editable. */
  origen?: GestionOrigen | string;
  /** FK al recordatorio cuando `origen === 'email_reminder'`. */
  email_reminder_id?: string | null;
}

export interface EstadoCuentaFile {
  id: string;
  nombre: string;
  tamano_bytes: number;
  mime_type: string;
  fecha_subida: string;
  propiedad_id: string;
  notas?: string;
}

/** Metadata persistible del archivo en almacenamiento local/API. */
export interface EstadoCuentaFileMeta extends Omit<EstadoCuentaFile, 'propiedad_id'> {
  propiedad_id: string;
}

export type PaymentReminderEmailStatus = 'queued' | 'sent' | 'failed';

/** Registro de recordatorio (POST send / GET list / GET detail). */
export interface PaymentReminderEmailRecord {
  id: string;
  propiedad_id: string;
  /** Destinatario principal (un solo email; no CSV). */
  cliente_email: string;
  extra_recipients?: string[];
  subject: string;
  body_html?: string;
  body_text?: string;
  status: PaymentReminderEmailStatus | string;
  provider_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  created_at: string;
  /** Gestión creada al `sent`; null si queued/failed. */
  gestion_id?: string | null;
}
