import type { Cuenta, Gestion } from '../models';
import type { DataService } from '../services/data.service';

export const GESTION_EXPORT_HEADERS = ['Fecha', 'Estado', 'Tipo', 'Descripción'] as const;
export const GESTION_EXPORT_HEADERS_CON_UNIDAD = [
  'Unidad',
  'Fecha',
  'Estado',
  'Tipo',
  'Descripción',
] as const;

export function gestionExportCells(data: DataService, g: Gestion): string[] {
  return [
    data.formatGestionFecha(g),
    data.formatGestionEstadoLabel(g),
    data.formatGestionTipo(g),
    data.getGestionDescripcion(g) || '—',
  ];
}

export function buildGestionExportRows(data: DataService, cuentaId: string): string[][] {
  return data.getGestionesByCuenta(cuentaId).map((g) => gestionExportCells(data, g));
}

export function buildUnidadGestionExportRows(data: DataService, cuentas: Cuenta[]): string[][] {
  const rows: string[][] = [];
  for (const p of cuentas) {
    for (const g of data.getGestionesByCuenta(p.id)) {
      rows.push([p.identificador, ...gestionExportCells(data, g)]);
    }
  }
  return rows;
}
