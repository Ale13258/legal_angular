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

export interface Propiedad {
  id: string;
  cliente_id: string;
  tipo_propiedad: TipoPropiedad;
  identificador: string;
  direccion: string;
  notas: string;
  monto_a_la_fecha: number;
  created_at: string;
  /** Por esta unidad (apartamento/local); backend autoritativo. */
  edad_mora_dias?: number | null;
  /** Backend: día en que se dio de alta la propiedad en la plataforma (`propiedades.created_at`, parte fecha). */
  fecha_inicio_cobro?: string | null;
  /** Backend: fecha en que `monto_a_la_fecha` vuelve a coincidir con el saldo inicial de referencia. */
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
  /** Opcional por movimiento (backend). La UI de cobro/mora por unidad usa solo `Propiedad`. */
  dias_en_mora?: number | null;
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
