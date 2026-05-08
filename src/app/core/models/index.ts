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
  /** Valor original registrado al crear la propiedad. */
  saldo_inicial?: number | null;
  monto_a_la_fecha: number;
  created_at: string;
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
