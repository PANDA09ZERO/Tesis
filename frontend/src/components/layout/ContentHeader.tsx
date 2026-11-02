import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutGrid, List, Search } from 'lucide-react';

interface ContentHeaderProps {
  title?: string;
}

export default function ContentHeader({ title }: ContentHeaderProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get('search') || '';
  const resultados = searchParams.get('total') || '0';
  const viewMode = (searchParams.get('view') as 'grid' | 'list') || 'grid';

  const handleSearch = (value: string) => {
    if (value) {
      setSearchParams({ search: value, page: '1' });
    } else {
      setSearchParams({});
    }
  };

  return (
    <header className="border-b border-gray-200 bg-white px-3 py-3 sm:px-6 sm:py-4">
      <div className="mb-3 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold text-gray-900 sm:text-2xl">{title || 'Cursos'}</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión académica</p>
        </div>
        <a href="#" className="self-start text-sm font-medium text-primary-600 hover:text-primary-700">
          Catálogo de cursos
        </a>
      </div>

      {/* Toolbar */}
      <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
        {/* Search */}
        <div className="relative w-full flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Busque sus cursos..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm outline-hidden focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Active Filter Chip */}
        {searchQuery && (
          <div className="flex max-w-full items-center gap-2 rounded-full bg-primary-50 px-3 py-1.5">
            <span className="min-w-0 break-all text-xs font-medium text-primary-700">
              {searchQuery} ✕
            </span>
            <button
              type="button"
              onClick={() => handleSearch('')}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-primary-500 hover:text-primary-700"
              aria-label="Limpiar búsqueda"
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
