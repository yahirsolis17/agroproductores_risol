import { describe, expect, it } from 'vitest';

import { breadcrumbRoutes } from '../breadcrumbRoutes';

describe('breadcrumbRoutes', () => {
  it('temporadasList preserva el contexto principal en query params', () => {
    const crumbs = breadcrumbRoutes.temporadasList(7, 'Huerta Norte', 'rentada', 'Juan Perez');

    expect(crumbs).toHaveLength(2);
    expect(crumbs[1].path).toContain('/temporadas?');
    expect(crumbs[1].path).toContain('huerta_id=7');
    expect(crumbs[1].path).toContain('tipo=rentada');
    expect(crumbs[1].path).toContain('huerta_nombre=Huerta%20Norte');
    expect(crumbs[1].path).toContain('propietario=Juan%20Perez');
  });

  it('reporteCosecha omite valores indefinidos y conserva ids necesarios', () => {
    const crumbs = breadcrumbRoutes.reporteCosecha(3, 'Huerta Sur', 2026, 11, 99, {
      tipo: 'propia',
      cosechaNombre: 'Cosecha 1',
    });

    expect(crumbs[2].path).toContain('temporada_id=11');
    expect(crumbs[2].path).toContain('huerta_id=3');
    expect(crumbs[2].path).not.toContain('propietario=');
    expect(crumbs[3].label).toBe('Reporte de Cosecha: Cosecha 1');
  });

  it('precosechasList preserva el contexto y deja el ultimo crumb sin path', () => {
    const crumbs = breadcrumbRoutes.precosechasList(8, 'Huerta Futura', 2027, 12, {
      tipo: 'propia',
      propietario: 'Ana Lopez',
    });

    expect(crumbs).toHaveLength(3);
    expect(crumbs[1].label).toBe('Temporada 2027');
    expect(crumbs[1].path).toContain('/temporadas?');
    expect(crumbs[1].path).toContain('huerta_id=8');
    expect(crumbs[1].path).toContain('tipo=propia');
    expect(crumbs[1].path).toContain('huerta_nombre=Huerta%20Futura');
    expect(crumbs[1].path).toContain('propietario=Ana%20Lopez');
    expect(crumbs[2]).toEqual({ label: 'PreCosecha', path: '' });
  });
});
