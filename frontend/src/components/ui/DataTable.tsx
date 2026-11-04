import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  className?: string;
  /** Muestra la columna bajo el título, visible sin desplegar la tarjeta. */
  summary?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  page?: number;
  totalPages?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  isLoading?: boolean;
  className?: string;
  renderMobileCard?: (item: T) => React.ReactNode;
}

function isActionColumn<T>(col: Column<T>) {
  return !col.label || col.key === 'acciones' || col.key === 'actions';
}

export default function DataTable<T extends { id?: any }>({
  columns, data, page = 1, totalPages = 1, total = 0,
  onPageChange, onRowClick, renderMobileCard, className = '', emptyMessage = 'No hay datos disponibles', isLoading
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="card">
        <div role="status" aria-label="Cargando resultados" className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-gray-100" />
          ))}
        </div>
      </div>
    );
  }

  const infoColumns = columns.filter(col => !isActionColumn(col));
  const actionColumns = columns.filter(col => isActionColumn(col));
  const titleColumn = infoColumns.find(col => ['nombre', 'alumno_nombre', 'titulo', 'curso_nombre', 'curso'].includes(col.key)) ?? infoColumns[0];
  const summaryColumns = infoColumns.filter(col => col !== titleColumn && col.summary);
  const detailColumns = infoColumns.filter(col => col !== titleColumn);

  const cellValue = (item: T, col: Column<T>) =>
    col.render ? col.render(item) : (item as any)[col.key];

  return (
    <div className={`data-table card min-w-0 overflow-hidden p-0 ${className}`}>
      {data.length === 0 ? (
        <p className="px-6 py-14 text-center text-[0.9375rem] text-gray-500">{emptyMessage}</p>
      ) : (
        <>
          <div className="grid grid-cols-1 items-start gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3 sm:p-5">
            {data.map((item, idx) => (
              <details className="mobile-bento-card" key={item.id ?? idx}>
                <summary className="mobile-bento-summary">
                  <span className="mobile-bento-eyebrow">{titleColumn?.label || 'Registro'}</span>
                  <div className="mobile-bento-title">{titleColumn ? cellValue(item, titleColumn) : `Registro ${idx + 1}`}</div>
                  {summaryColumns.map(col => <p key={col.key} className="mt-1 text-[0.875rem] text-gray-600 dark:text-gray-300"><span className="font-semibold text-gray-700 dark:text-gray-200">{col.label}: </span>{cellValue(item, col)}</p>)}
                  <span className="mobile-bento-hint">Toca para ver detalles <ChevronRight aria-hidden="true" className="h-4 w-4" /></span>
                </summary>
                <div className="mobile-bento-content">
                  {renderMobileCard ? renderMobileCard(item) : <>
                    <dl className="mobile-bento-fields">
                      {detailColumns.map(col => <div key={col.key}>
                        <dt>{col.label}</dt>
                        <dd className={col.className}>{cellValue(item, col) ?? 'Sin registrar'}</dd>
                      </div>)}
                    </dl>
                    {actionColumns.length > 0 && <div className="table-card-actions flex flex-wrap gap-2">
                      {actionColumns.map(col => <div key={col.key}>{cellValue(item, col)}</div>)}
                    </div>}
                    {onRowClick && <button type="button" className="btn-primary mt-3 w-full gap-2" onClick={() => onRowClick(item)}>Abrir ficha <ChevronRight aria-hidden="true" className="h-4 w-4" /></button>}
                  </>}
                </div>
              </details>
            ))}
          </div>
        </>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 px-3 py-2 sm:flex-nowrap sm:px-5">
          <span className="min-w-0 text-[0.8125rem] text-gray-500 sm:text-sm">
            Mostrando {((page - 1) * 20) + 1} - {Math.min(page * 20, total)} de {total} registros
          </span>
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
              aria-label="Página anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="hidden items-center gap-1 sm:flex">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = page <= 3 ? i + 1 : page + i - 2;
                if (pageNum < 1 || pageNum > totalPages) return null;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => onPageChange?.(pageNum)}
                    className={`h-10 min-w-10 rounded-lg px-2 text-sm font-semibold tabular-nums ${
                      pageNum === page
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    aria-current={pageNum === page ? 'page' : undefined}
                    aria-label={`Página ${pageNum}`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <span className="text-sm text-gray-600 sm:hidden">{page} / {totalPages}</span>
            <button
              type="button"
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              className="flex h-11 w-11 items-center justify-center rounded-lg text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-40"
              aria-label="Página siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
