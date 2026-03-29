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
});
