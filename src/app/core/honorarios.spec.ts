import { describe, expect, it } from 'vitest';
import {
  calcularHonorarios,
  porcentajeHonorarios,
  resolverProcesoParaCuenta,
} from './honorarios';
import type { ProcesoLegal } from './models';

describe('honorarios', () => {
  describe('porcentajeHonorarios', () => {
    it('acuerdo y pre-jurídico son 10%', () => {
      expect(porcentajeHonorarios('acuerdo_de_pago', 'radicacion')).toBe(10);
      expect(porcentajeHonorarios('extrajudicial', 'sentencia')).toBe(10);
    });

    it('aplica tabla jurídica por etapa', () => {
      expect(porcentajeHonorarios('juridica', 'radicacion')).toBe(15);
      expect(porcentajeHonorarios('juridica', 'inadmision')).toBe(15);
      expect(porcentajeHonorarios('juridica', 'subsanacion')).toBe(15);
      expect(porcentajeHonorarios('juridica', 'mandamiento_de_pago')).toBe(15);
      expect(porcentajeHonorarios('juridica', 'medidas_radicadas')).toBe(15);
      expect(porcentajeHonorarios('juridica', 'notificacion')).toBe(15);
      expect(porcentajeHonorarios('juridica', 'rechazado')).toBe(15);
      expect(porcentajeHonorarios('juridica', 'sentencia')).toBe(20);
      expect(porcentajeHonorarios('juridica', 'liquidacion_de_costas')).toBe(20);
      expect(porcentajeHonorarios('juridica', 'ejecucion')).toBe(20);
      expect(porcentajeHonorarios('juridica', 'liquidacion_del_credito')).toBe(20);
      expect(porcentajeHonorarios('juridica', 'remate')).toBe(20);
    });

    it('terminacion y sin tipo no tienen %', () => {
      expect(porcentajeHonorarios('juridica', 'terminacion')).toBeNull();
      expect(porcentajeHonorarios(null, 'radicacion')).toBeNull();
    });
  });

  describe('calcularHonorarios', () => {
    it('calcula monto como % de la deuda (no suma)', () => {
      const r = calcularHonorarios({
        deuda: 1_000_000,
        tipo: 'juridica',
        etapa: 'radicacion',
      });
      expect(r.monto).toBe(150_000);
      expect(r.porcentaje).toBe(15);
      expect(r.fuente).toBe('sugerido');
      expect(r.etiqueta).toContain('15%');
    });

    it('prefiere override manual', () => {
      const r = calcularHonorarios({
        deuda: 1_000_000,
        tipo: 'extrajudicial',
        etapa: 'radicacion',
        overrideMonto: 50_000,
      });
      expect(r.monto).toBe(50_000);
      expect(r.fuente).toBe('manual');
      expect(r.etiqueta).toBe('manual');
    });

    it('acepta override Decimal/string del API (no revierte al sugerido)', () => {
      const r = calcularHonorarios({
        deuda: 1_000_000,
        tipo: 'juridica',
        etapa: 'radicacion',
        overrideMonto: '75000.00',
      });
      expect(r.monto).toBe(75_000);
      expect(r.fuente).toBe('manual');
    });

    it('sin % ni override ni mora devuelve sin_dato', () => {
      const r = calcularHonorarios({ deuda: 100, tipo: 'juridica', etapa: 'terminacion' });
      expect(r.monto).toBeNull();
      expect(r.fuente).toBe('sin_dato');
    });

    it('usa etapa de edad en mora si no hay radicado', () => {
      const pre = calcularHonorarios({ deuda: 1_000_000, edadMoraDias: 45 });
      expect(pre.porcentaje).toBe(10);
      expect(pre.monto).toBe(100_000);
      expect(pre.etiqueta).toContain('Pre-jurídico');

      const jur = calcularHonorarios({ deuda: 1_000_000, edadMoraDias: 120 });
      expect(jur.porcentaje).toBe(15);
      expect(jur.monto).toBe(150_000);
      expect(jur.etiqueta).toContain('Jurídico');
    });

    it('el radicado gana sobre la mora', () => {
      const r = calcularHonorarios({
        deuda: 1_000_000,
        tipo: 'juridica',
        etapa: 'sentencia',
        edadMoraDias: 20,
      });
      expect(r.porcentaje).toBe(20);
      expect(r.etiqueta).toContain('SENTENCIA');
    });
  });

  describe('resolverProcesoParaCuenta', () => {
    const base = {
      cliente_id: 'c1',
      numero_cuenta: 'R-1',
      tipo: 'juridica' as const,
      etapa_proceso: 'radicacion' as const,
    };

    it('elige el vinculado en proceso más reciente', () => {
      const procesos: ProcesoLegal[] = [
        {
          ...base,
          id: 'old',
          cuenta_id: 'u1',
          estado: 'en_proceso',
          created_at: '2024-01-01',
        },
        {
          ...base,
          id: 'new',
          cuenta_id: 'u1',
          estado: 'activa',
          created_at: '2025-06-01',
          etapa_proceso: 'sentencia',
        },
        {
          ...base,
          id: 'other',
          cuenta_id: 'u2',
          estado: 'en_proceso',
          created_at: '2026-01-01',
        },
      ];
      expect(resolverProcesoParaCuenta('u1', procesos)?.id).toBe('new');
    });

    it('si no hay en curso, usa cerrados vinculados', () => {
      const procesos: ProcesoLegal[] = [
        {
          ...base,
          id: 'closed',
          cuenta_id: 'u1',
          estado: 'cerrada',
          created_at: '2025-01-01',
        },
      ];
      expect(resolverProcesoParaCuenta('u1', procesos)?.id).toBe('closed');
    });

    it('si no hay vínculo, usa radicado del cliente sin cuenta', () => {
      const procesos: ProcesoLegal[] = [
        {
          ...base,
          id: 'client',
          estado: 'en_proceso',
          created_at: '2025-01-01',
          etapa_proceso: 'mandamiento_de_pago',
        },
      ];
      expect(resolverProcesoParaCuenta('u1', procesos)?.id).toBe('client');
    });

    it('prefiere no vinculado antes que uno de otra unidad', () => {
      const procesos: ProcesoLegal[] = [
        {
          ...base,
          id: 'other-unit',
          cuenta_id: 'u2',
          estado: 'en_proceso',
          created_at: '2026-01-01',
        },
        {
          ...base,
          id: 'unlinked',
          estado: 'en_proceso',
          created_at: '2024-01-01',
        },
      ];
      expect(resolverProcesoParaCuenta('u1', procesos)?.id).toBe('unlinked');
    });

    it('null si no hay radicados', () => {
      expect(resolverProcesoParaCuenta('u1', [])).toBeNull();
    });
  });
});
