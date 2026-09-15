import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, BookOpen, MapPin } from 'lucide-react';
import { cursosApi } from '../../api/endpoints';
import type { Curso } from '../../types';
import toast from 'react-hot-toast';

export default function CursosPage() {
  const navigate = useNavigate();
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await cursosApi.getAll({ page: 1, limit: 20 });
        setCursos(res.data.data || []);
      } catch (error) {
        toast.error('Error al cargar cursos');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const dummyCursos = [
    { id: 1, nombre: 'MATEMÁTICAS IV', codigo: 'MAT-4', estado: 'Abierto', instructor: 'Ing. María García', image: 'https://picsum.photos/seed/curso1/400/200', grado: '4to Grado' },
    { id: 2, nombre: 'COMUNICACIÓN IV', codigo: 'COM-4', estado: 'Abierto', instructor: 'Lic. Carlos Pérez', image: 'https://picsum.photos/seed/curso2/400/200', grado: '4to Grado' },
    { id: 3, nombre: 'CIENCIA Y TECNOLOGÍA', codigo: 'CYT-4', estado: 'Abierto', instructor: 'Dr. Luis Romero', image: 'https://picsum.photos/seed/curso3/400/200', grado: '4to Grado' },
    { id: 4, nombre: 'HISTORIA IV', codigo: 'HIS-4', estado: 'Abierto', instructor: 'Lic. Ana López', image: 'https://picsum.photos/seed/curso4/400/200', grado: '4to Grado' },
    { id: 5, nombre: 'INGLÉS IV', codigo: 'ING-4', estado: 'Abierto', instructor: 'Sra. Patricia Díaz', image: 'https://picsum.photos/seed/curso5/400/200', grado: '4to Grado' },
    { id: 6, nombre: 'ARTE IV', codigo: 'ART-4', estado: 'Abierto', instructor: 'Prof. Juan Torres', image: 'https://picsum.photos/seed/curso6/400/200', grado: '4to Grado' },
    { id: 7, nombre: 'EDUCACIÓN FÍSICA IV', codigo: 'EF-4', estado: 'Abierto', instructor: 'Prof. Miguel Soto', image: 'https://picsum.photos/seed/curso7/400/200', grado: '4to Grado' },
    { id: 8, nombre: 'FILOSOFÍA IV', codigo: 'FIL-4', estado: 'Cerrado', instructor: 'Lic. Rosa Velez', image: 'https://picsum.photos/seed/curso8/400/200', grado: '4to Grado' },
  ];

  const cursosToShow = cursos.length > 0 ? cursos : dummyCursos;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cohort Header */}
      <div className="bg-white rounded-xl border border-gray-200 px-6 py-4">
        <h2 className="text-lg font-bold text-gray-900">2026-II — Formación Profesional</h2>
        <p className="text-sm text-gray-500 mt-1">Cursos del período académico vigente</p>
      </div>

      {/* Course Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cursosToShow.map((curso) => (
          <div key={curso.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow cursor-pointer group" onClick={() => navigate(`/cursos/${curso.id}`)}>
            {/* Image */}
            <div className="h-36 overflow-hidden relative">
              <img
                src={(curso as any).image || `https://picsum.photos/seed/${curso.codigo}/400/200`}
                alt={curso.nombre}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              <span className={`absolute top-2 right-2 text-xs font-medium px-2 py-1 rounded-full ${
                (curso as any).estado === 'Abierto' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
              }`}>
                {(curso as any).estado || 'Abierto'}
              </span>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-mono text-gray-400">{(curso as any).codigo || curso.nombre?.split(' ').pop()}</span>
              </div>
              <h3 className="font-bold text-sm text-gray-900 uppercase mb-2 line-clamp-2">{curso.nombre}</h3>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{(curso as any).grado_nombre || (curso as any).grado || '4to Grado'}</span>
                <div className="flex items-center gap-1 text-yellow-500">
                  <Star className="w-3.5 h-3.5 fill-current" />
                  <span className="text-xs text-gray-500">Favorito</span>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {(curso as any).instructor || 'Profesor'}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
