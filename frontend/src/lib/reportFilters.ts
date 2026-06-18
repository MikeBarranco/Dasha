import type { Report, Severity } from '../data/mockReports';

export type ReportFilters = {
  species: 'perro' | 'gato' | null;
  severity: Severity | null;
  condition: string | null;
  hideAggressive: boolean;
};

export const emptyFilters: ReportFilters = {
  species: null,
  severity: null,
  condition: null,
  hideAggressive: false,
};

export function filtersActive(filters: ReportFilters): boolean {
  return (
    filters.species !== null ||
    filters.severity !== null ||
    filters.condition !== null ||
    filters.hideAggressive
  );
}

export function applyReportFilters(reports: Report[], filters: ReportFilters): Report[] {
  return reports.filter((report) => {
    if (filters.species && report.species !== filters.species) return false;
    if (filters.severity && report.severity !== filters.severity) return false;
    if (filters.condition && !report.condition.startsWith(filters.condition)) return false;
    if (filters.hideAggressive && report.condition.toLowerCase().includes('agresiv')) return false;
    return true;
  });
}
