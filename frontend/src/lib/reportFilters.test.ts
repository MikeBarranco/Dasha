import { describe, it, expect } from 'vitest';
import { emptyFilters, filtersActive, applyReportFilters, type ReportFilters } from './reportFilters';
import type { Report } from '../data/mockReports';

// Construye un Report mínimo para las pruebas: solo importan los campos que el
// filtro consulta (species, severity, condition). El resto no afecta al filtrado.
function makeReport(partial: Partial<Report>): Report {
  return {
    id: 'x',
    lng: 0,
    lat: 0,
    colonia: 'Centro',
    species: 'perro',
    condition: 'Estable',
    severity: 'baja',
    photo: '',
    description: '',
    reportedAgo: 'hoy',
    status: 'activo',
    ...partial,
  };
}

describe('emptyFilters / filtersActive', () => {
  it('los filtros vacíos no están activos', () => {
    expect(filtersActive(emptyFilters)).toBe(false);
  });

  it('se activa con cualquier criterio', () => {
    expect(filtersActive({ ...emptyFilters, species: 'gato' })).toBe(true);
    expect(filtersActive({ ...emptyFilters, severity: 'critica' })).toBe(true);
    expect(filtersActive({ ...emptyFilters, condition: 'Herido' })).toBe(true);
    expect(filtersActive({ ...emptyFilters, hideAggressive: true })).toBe(true);
  });
});

describe('applyReportFilters', () => {
  const reports: Report[] = [
    makeReport({ id: 'a', species: 'perro', severity: 'critica', condition: 'Herido en la calle' }),
    makeReport({ id: 'b', species: 'gato', severity: 'baja', condition: 'Estable' }),
    makeReport({ id: 'c', species: 'perro', severity: 'media', condition: 'Perro agresivo' }),
  ];

  it('sin filtros devuelve todo', () => {
    expect(applyReportFilters(reports, emptyFilters)).toHaveLength(3);
  });

  it('filtra por especie', () => {
    const out = applyReportFilters(reports, { ...emptyFilters, species: 'gato' });
    expect(out.map((r) => r.id)).toEqual(['b']);
  });

  it('filtra por severidad', () => {
    const out = applyReportFilters(reports, { ...emptyFilters, severity: 'critica' });
    expect(out.map((r) => r.id)).toEqual(['a']);
  });

  it('filtra por condición usando prefijo (startsWith)', () => {
    const out = applyReportFilters(reports, { ...emptyFilters, condition: 'Herido' });
    expect(out.map((r) => r.id)).toEqual(['a']);
  });

  it('oculta los agresivos cuando hideAggressive está activo', () => {
    const filters: ReportFilters = { ...emptyFilters, hideAggressive: true };
    const out = applyReportFilters(reports, filters);
    expect(out.map((r) => r.id)).toEqual(['a', 'b']);
  });
});
