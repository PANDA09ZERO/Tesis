import React, { useState } from 'react';
import { LayoutGrid, List, Search, SlidersHorizontal } from 'lucide-react';

interface ContentHeaderProps {
  title?: string;
}

export default function ContentHeader({ title }: ContentHeaderProps) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

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
        {/* View Toggle */}
        <div className="flex items-center bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-primary-600' : 'text-gray-500'}`}
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Busque sus cursos..."
            className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Filters */}
        <select className="px-3 py-2 bg-gray-100 border-none rounded-lg text-sm text-gray-600 outline-none cursor-pointer">
          <option>Período: Cursos actuales</option>
          <option>Período: Todos</option>
        </select>

        <select className="px-3 py-2 bg-gray-100 border-none rounded-lg text-sm text-gray-600 outline-none cursor-pointer">
          <option>Tipo: Todos los cursos</option>
          <option>Formación Profesional</option>
          <option>Educación General</option>
        </select>

        <select className="px-3 py-2 bg-gray-100 border-none rounded-lg text-sm text-gray-600 outline-none cursor-pointer">
          <option>25 por página</option>
          <option>50 por página</option>
          <option>100 por página</option>
        </select>

        {/* Active Filter Chip */}
        <div className="flex items-center gap-2 bg-primary-50 px-3 py-1.5 rounded-full">
          <span className="text-xs font-medium text-primary-700">Cursos actuales</span>
          <button className="text-primary-500 hover:text-primary-700">✕</button>
        </div>

        {/* Results count */}
        <span className="text-sm text-gray-500">12 resultados</span>
      </div>
    </header>
  );
}
