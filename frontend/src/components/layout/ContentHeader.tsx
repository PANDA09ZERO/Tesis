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
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title || 'Cursos'}</h1>
          <p className="text-sm text-gray-500 mt-1">Gestión académica</p>
        </div>
        <a href="#" className="text-sm text-primary-600 hover:text-primary-700 font-medium">
          Catálogo de cursos →
        </a>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Busque sus cursos..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Active Filter Chip */}
        {searchQuery && (
          <div className="flex items-center gap-2 bg-primary-50 px-3 py-1.5 rounded-full">
            <span className="text-xs font-medium text-primary-700">
              {searchQuery} ✕
            </span>
            <button onClick={() => handleSearch('')} className="text-primary-500 hover:text-primary-700">✕</button>
          </div>
        )}
      </div>
    </header>
  );
}
