import { describe, expect, it } from 'vitest';

import { adaptTemporadaToUI } from '../reportesAdapters';

describe('adaptTemporadaToUI', () => {
  it('mantiene precosechas como bloque separado en tablas y series', () => {
    const adapted = adaptTemporadaToUI({
      metadata: {
        entidad: { id: 7, nombre: 'Huerta Futura', tipo: 'temporada' },
      },
      resumen_ejecutivo: {
        kpis: [],
      },
      comparativo_cosechas: [],
      series: {},
      precosechas: {
        total: 180,
        detalle: [
          {
            id: 21,
            fecha: '2026-05-15',
            categoria: 'Preparacion',
            descripcion: 'Abonado previo',
            gastos_insumos: 100,
            gastos_mano_obra: 80,
            total: 180,
          },
        ],
      },
    });

    expect(adapted.tablas.precosechas).toEqual([
      {
        id: 21,
        categoria: 'Preparacion',
        descripcion: 'Abonado previo',
        monto: 180,
        fecha: '2026-05-15',
      },
    ]);
    expect(adapted.series.precosechas).toEqual([
      {
        fecha: '2026-05-15',
        valor: 180,
      },
    ]);
    expect(adapted.tablas.comparativo_cosechas).toEqual([]);
  });

  it('mapea recuperación de precosecha y usa los KPIs de raw.ui', () => {
    const adapted = adaptTemporadaToUI({
      metadata: {
        entidad: { id: 9, nombre: 'Temporada 2026', tipo: 'temporada' },
      },
      ui: {
        kpis: [
          { label: 'Recuperado PreCosecha', value: 35, format: 'currency' },
          { label: 'Avance Recuperacion', value: 35, format: 'percentage' },
        ],
      },
      resumen_ejecutivo: {},
      comparativo_cosechas: [],
      series: {},
      recuperacion_precosecha: {
        tiene_precosecha: true,
        total_invertido: 100,
        ganancia_operativa_acumulada: 35,
        recuperado: 35,
        pendiente: 65,
        porcentaje: 35,
        excedente: 0,
        estado: 'recuperando',
        estado_label: 'Recuperando inversion inicial',
        formula: 'Recuperacion calculada con la ganancia operativa acumulada de la temporada.',
      },
    });

    expect(adapted.kpis).toEqual([
      { label: 'Recuperado PreCosecha', value: 35, format: 'currency' },
      { label: 'Avance Recuperacion', value: 35, format: 'percentage' },
    ]);
    expect(adapted.recuperacion_precosecha).toEqual({
      tiene_precosecha: true,
      total_invertido: 100,
      ganancia_operativa_acumulada: 35,
      recuperado: 35,
      pendiente: 65,
      porcentaje: 35,
      excedente: 0,
      estado: 'recuperando',
      estado_label: 'Recuperando inversion inicial',
      formula: 'Recuperacion calculada con la ganancia operativa acumulada de la temporada.',
    });
  });
});
