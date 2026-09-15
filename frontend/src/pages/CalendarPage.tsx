import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus, Settings,
  Bell, Clock, Flag, AlertCircle, BookOpen
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { calificacionesApi, cursosApi } from '../api/endpoints';
import type { Calificacion, Curso } from '../types';
import toast from 'react-hot-toast';

interface Evento {
  id: number;
  titulo: string;
  hora: string;
  curso: string;
  tipo: 'clase' | 'evaluacion' | 'tarea' | 'reposo';
  fecha: string;
}

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function generarEventos(): Evento[] {
  return [
    { id: 1, titulo: 'Matemáticas IV', hora: '09:00', curso: 'MAT-4', tipo: 'clase', fecha: '2026-02-14' },
    { id: 2, titulo: 'Comunicación IV', hora: '10:00', curso: 'COM-4', tipo: 'clase', fecha: '2026-02-14' },
    { id: 3, titulo: 'Entrega Proyecto Integrador', hora: '11:00', curso: 'MAT-4', tipo: 'tarea', fecha: '2026-02-14' },
    { id: 4, titulo: 'Ciencia y Tecnología', hora: '14:00', curso: 'CYT-4', tipo: 'clase', fecha: '2026-02-14' },
    { id: 5, titulo: 'Evaluación Parcial Comunicación', hora: '15:00', curso: 'COM-4', tipo: 'evaluacion', fecha: '2026-02-14' },
    { id: 6, titulo: 'Educación Física', hora: '16:00', curso: 'EF-4', tipo: 'clase', fecha: '2026-02-14' },
    { id: 7, titulo: 'Matemáticas IV', hora: '08:00', curso: 'MAT-4', tipo: 'clase', fecha: '2026-02-12' },
    { id: 8, titulo: 'Historia IV', hora: '10:00', curso: 'HIS-4', tipo: 'clase', fecha: '2026-02-12' },
    { id: 9, titulo: 'Entrega Ensayo Literario', hora: '12:00', curso: 'COM-4', tipo: 'tarea', fecha: '2026-02-12' },
    { id: 10, titulo: 'Inglés IV', hora: '09:00', curso: 'ING-4', tipo: 'clase', fecha: '2026-02-13' },
    { id: 11, titulo: 'Arte IV', hora: '11:00', curso: 'ART-4', tipo: 'clase', fecha: '2026-02-13' },
  ];
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date(2026, 1, 14));
  const [viewMode, setViewMode] = useState<'dia' | 'mes'>('mes');
  const [contentMode, setContentMode] = useState<'programar' | 'vencimiento'>('programar');
  const [selectedDay, setSelectedDay] = useState(14);
  const [eventos] = useState<Evento[]>(generarEventos());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfMonth = new Date(year, month, 1).getDay();

  const daysGrid = useMemo(() => {
    const grid: (number | null)[] = [];
    const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    for (let i = 0; i < startDay; i++) grid.push(null);
    for (let d = 1; d <= daysInMonth; d++) grid.push(d);
    while (grid.length % 7 !== 0) grid.push(null);
    return grid;
  }, [firstDayOfMonth, daysInMonth]);

  const getEventsForDay = (day: number): Evento[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return eventos.filter(e => e.fecha === dateStr);
  };

  const navigateMonth = (direction: number) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const today = new Date();
  const todayDate = today.getDate();
  const todayMonth = today.getMonth();
  const todayYear = today.getFullYear();

  const eventosDia = getEventsForDay(selectedDay);
  const eventosVencimiento = eventos.filter(e => e.tipo === 'tarea' || e.tipo === 'evaluacion');

  const contentToShow = contentMode === 'programar'
    ? eventosDia.filter(e => e.tipo === 'clase' || e.tipo === 'tarea')
    : eventosDia.filter(e => e.tipo === 'evaluacion');

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Filtros Superiores */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary-600" />
            <h1 className="text-xl font-bold text-gray-900">Calendario</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setContentMode('programar')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                contentMode === 'programar' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Programar
            </button>
            <button
              onClick={() => setContentMode('vencimiento')}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                contentMode === 'vencimiento' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Fechas de vencimiento
            </button>
            <button onClick={() => setViewMode('dia')} className={`p-2 rounded-lg transition-colors ${viewMode === 'dia' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}>
              <Clock className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('mes')} className={`p-2 rounded-lg transition-colors ${viewMode === 'mes' ? 'bg-primary-100 text-primary-700' : 'text-gray-500 hover:bg-gray-100'}`}>
              <CalendarIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => { setCurrentDate(new Date()); setSelectedDay(today.getDate()); }}
              className="px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors font-medium"
            >
              Hoy
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <Plus className="w-4 h-4" />
            </button>
            <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navegación Semanal */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigateMonth(-1)} className="p-1 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100">
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-lg font-semibold text-gray-900 min-w-[160px] text-center">
            {MESES[month]} de {year}
          </span>
          <button onClick={() => navigateMonth(1)} className="p-1 text-gray-500 hover:text-gray-700 rounded hover:bg-gray-100">
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Barra de días */}
          <div className="flex gap-1 ml-4">
            {DIAS_SEMANA.map(d => (
              <span key={d} className="w-7 h-7 flex items-center justify-center text-xs font-medium text-gray-400">{d}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Cuerpo: Calendario + Agenda */}
      <div className="flex flex-1 overflow-hidden">
        {/* Grid de Calendario */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
            {daysGrid.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="bg-white aspect-square" />;

              const isToday = day === todayDate && month === todayMonth && year === todayYear;
              const isSelected = day === selectedDay;
              const dayEvents = getEventsForDay(day);
              const hasEventos = dayEvents.length > 0;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`bg-white aspect-square p-1.5 relative hover:bg-gray-50 transition-colors ${
                    isSelected ? 'bg-primary-50 ring-2 ring-primary-500 inset-0 rounded-none' : ''
                  } ${isToday && !isSelected ? 'bg-blue-50' : ''}`}
                >
                  <span className={`text-sm ${isToday && !isSelected ? 'font-bold text-blue-600' : isSelected ? 'font-bold text-primary-700' : 'text-gray-700'}`}>
                    {day}
                  </span>
                  {hasEventos && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map(e => (
                        <div
                          key={e.id}
                          className={`w-1.5 h-1.5 rounded-full ${
                            e.tipo === 'evaluacion' ? 'bg-red-400' :
                            e.tipo === 'tarea' ? 'bg-orange-400' : 'bg-primary-400'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Panel de Agenda */}
        <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-hidden flex-shrink-0">
          {/* Encabezado de Agenda */}
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-sm font-semibold text-gray-900">
                {currentDate.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-600">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>1 elemento con fecha de entrega</span>
            </div>
          </div>

          {/* Timeline de Horas */}
          <div className="flex-1 overflow-y-auto py-2">
            {contentToShow.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Clock className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-400">
                  {contentMode === 'programar'
                    ? 'No hay actividades programadas para este día'
                    : 'No hay evaluaciones pendientes para este día'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 px-3">
                {contentToShow.map((evento) => (
                  <div key={evento.id} className={`rounded-lg border p-3 transition-colors cursor-pointer ${
                    evento.tipo === 'evaluacion'
                      ? 'border-red-200 bg-red-50 hover:bg-red-100'
                      : evento.tipo === 'tarea'
                      ? 'border-orange-200 bg-orange-50 hover:bg-orange-100'
                      : 'border-primary-200 bg-primary-50 hover:bg-primary-100'
                  }`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${
                        evento.tipo === 'clase' ? 'bg-primary-100 text-primary-700' :
                        evento.tipo === 'evaluacion' ? 'bg-red-100 text-red-700' :
                        'bg-orange-100 text-orange-700'
                      }`}>
                        {evento.hora}
                      </span>
                      <span className="text-xs text-gray-500">{evento.curso}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{evento.titulo}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {evento.tipo === 'clase' && <BookOpen className="w-3 h-3 text-primary-500" />}
                      {evento.tipo === 'evaluacion' && <Flag className="w-3 h-3 text-red-500" />}
                      {evento.tipo === 'tarea' && <AlertCircle className="w-3 h-3 text-orange-500" />}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Timeline vacío para horas restantes */}
            <div className="mt-4 space-y-3">
              {['14:00', '15:00', '16:00'].map(hora => (
                <div key={hora} className="px-3 py-2 border-l-2 border-gray-200 ml-3">
                  <span className="text-xs text-gray-400 font-mono">{hora}</span>
                  <p className="text-xs text-gray-300 mt-0.5">Sin actividades</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
