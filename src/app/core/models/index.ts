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

/** Tipo de unidad de cartera (ex `TipoPropiedad`). */
export type TipoCuenta =
  | 'apartamento'
  | 'oficina'
  | 'local'
  | 'casa'
  | 'bodega'
  | 'garaje'
  | 'parqueadero'
  | 'otro';

/** @deprecated Use `TipoCuenta`. */
export type TipoPropiedad = TipoCuenta;

/** Deudor/propietario a cobrar en una unidad. Puede tener varios correos y/o un teléfono. */
export interface DeudorCobro {
  nombre: string;
  tipo_persona: TipoPersona;
  documento: string;
  /** Puede estar vacío si hay teléfono. El primero es el principal. */
  emails: string[];
  /** Contacto cuando no hay correo (o además del correo). */
  telefono?: string | null;
}

/** Unidad de cartera (ex `Propiedad`). */
export interface Cuenta {
  id: string;
  cliente_id: string;
  tipo_cuenta: TipoCuenta;
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
   * Días de mora agregados por unidad. El backend los calcula en vivo (plazo día 30,
   * 1 del mes siguiente = 30 días comerciales; MAX del historial).
   */
  edad_mora_dias?: number | null;
  /**
   * Inicio de cobro: valor del API o, si falta, el alta de la cuenta.
   */
  fecha_inicio_cobro?: string | null;
  /** Fecha en que la deuda llega a cero según backend o heurística de historial en cliente. */
  fecha_fin_cobro?: string | null;
}

/** @deprecated Use `Cuenta`. */
export type Propiedad = Cuenta;

export type EstadoPago = 'pendiente' | 'parcial' | 'pagado' | 'vencido';
export type ConceptoPago = 'administracion' | 'intereses' | 'extraordinaria' | 'otros';

export interface HistorialPago {
  id: string;
  cuenta_id: string;
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
   * El agregado por cuenta (`edad_mora_dias`) es el máximo entre filas del historial.
   */
  dias_en_mora?: number | null;
}

import type { EtapaProceso } from '../proceso-etapas';

export type { EtapaProceso };

export type TipoProcesoLegal = 'juridica' | 'extrajudicial' | 'acuerdo_de_pago';
export type EstadoProcesoLegal = 'activa' | 'cerrada' | 'en_proceso';

/** @deprecated Use `TipoProcesoLegal`. */
export type TipoCuentaLegal = TipoProcesoLegal;
/** @deprecated Use `EstadoProcesoLegal`. */
export type EstadoCuentaLegal = EstadoProcesoLegal;

/** Proceso legal (ex entidad `Cuenta` del API viejo `/cuentas`). */
export interface ProcesoLegal {
  id: string;
  cliente_id: string;
  cuenta_id?: string;
  numero_cuenta: string;
  tipo: TipoProcesoLegal;
  estado: EstadoProcesoLegal;
  etapa_proceso: EtapaProceso;
  created_at: string;
}

export type GestionTipo = 'manual' | 'email_reminder';

/** @deprecated Use `GestionTipo`. */
export type GestionOrigen = GestionTipo;

export interface GestionDetalle {
  estado: string;
  descripcion: string;
  /** Presente cuando `tipo === 'email_reminder'`. */
  email_reminder_id?: string | null;
}

/**
 * Gestión / trazabilidad de cobro.
 * Timeline: `tipo`, `estado` y resumen desde `descripcion`
 * (JSON con `summary` en correos; texto plano si es manual).
 * Detalle del correo: `GET /payment-reminders/:gestionId` (id = id de la gestión).
 */
export interface Gestion {
  id: string;
  cuenta_id: string;
  fecha: string;
  created_at: string;
  /** `email_reminder` | `manual` (u omitido en respuestas legacy). */
  tipo?: GestionTipo | string;
  detalle?: GestionDetalle;
  /** Espejo de `detalle.estado` tras normalizar. */
  estado: string;
  /**
   * Espejo de `detalle.descripcion`.
   * En correos puede ser JSON stringificado con `{ summary: string, ... }`.
   */
  descripcion: string;
  /** @deprecated Preferir `tipo`. */
  origen?: GestionTipo | string;
  /** @deprecated Ya no se usa para abrir el detalle; usar `id` de la gestión. */
  email_reminder_id?: string | null;
}

/** Archivo de estado de cuenta (PDF/documento), no confundir con entidad `Cuenta`. */
export interface EstadoCuentaFile {
  id: string;
  nombre: string;
  tamano_bytes: number;
  mime_type: string;
  fecha_subida: string;
  cuenta_id: string;
  notas?: string;
}

/** Metadata persistible del archivo en almacenamiento local/API. */
export interface EstadoCuentaFileMeta extends Omit<EstadoCuentaFile, 'cuenta_id'> {
  cuenta_id: string;
}

export type PaymentReminderEmailStatus = 'queued' | 'sent' | 'failed';

/** Registro de recordatorio (POST send / GET list / GET detail). */
export interface PaymentReminderEmailRecord {
  id: string;
  cuenta_id: string;
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
