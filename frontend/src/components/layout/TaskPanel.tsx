import React, { useState } from 'react';
import { Calendar, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronUp } from 'lucide-react';

interface Tarea {
  titulo: string;
  modulo: string;
  fechaLimite: string;
  restriccion?: string;
}

interface TareaSeccion {
  title: string;
  icon: React.ReactNode;
  color: string;
  tareas: Tarea[];
}

export default function TaskPanel() {
  const [openSections, setOpenSections] = useState<string[]>(['vence-pronto']);

  const secciones: TareaSeccion[] = [
    {
      title: 'Vencida',
      icon: <AlertCircle className="w-4 h-4" />,
      color: 'text-red-500',
      tareas: []
    },
    {
      title: 'Vence hoy',
      icon: <Clock className="w-4 h-4" />,
      color: 'text-orange-500',
      tareas: []
    },
    {
      title: 'Vence pronto',
      icon: <Calendar className="w-4 h-4" />,
      color: 'text-blue-500',
      tareas: [
        { titulo: 'Entregar Proyecto Integrador', modulo: 'Matemáticas', fechaLimite: '20 Ene 2026', restriccion: 'Sin extensión' },
        { titulo: 'Reporte de Laboratorio', modulo: 'Ciencia y Tecnología', fechaLimite: '22 Ene 2026' },
        { titulo: 'Ensayo Literario', modulo: 'Comunicación', fechaLimite: '25 Ene 2026' },
      ]
    }
  ];

  const toggleSection = (title: string) => {
    setOpenSections(prev =>
      prev.includes(title) ? prev.filter(s => s !== title) : [...prev, title]
    );
  };

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col overflow-hidden flex-shrink-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-900">Tareas Pendientes</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-3 px-3 space-y-2">
        {secciones.map((seccion) => (
          <div key={seccion.title} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleSection(seccion.title)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className={seccion.color}>{seccion.icon}</span>
                <span className="font-medium text-sm text-gray-700">{seccion.title}</span>
                {seccion.tareas.length > 0 && (
                  <span className="bg-gray-200 text-gray-600 text-xs px-2 py-0.5 rounded-full">{seccion.tareas.length}</span>
                )}
              </div>
              {openSections.includes(seccion.title) ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>
            {openSections.includes(seccion.title) && (
              <div className="p-3 space-y-3">
                {seccion.tareas.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">
                    {seccion.title === 'Vencida' ? '¡Sin entregas atrasadas!' : '¡Sin entregas para hoy!'}
                  </p>
                ) : (
                  seccion.tareas.map((tarea, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer">
                      <Calendar className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{tarea.titulo}</p>
                        <p className="text-xs text-gray-500">{tarea.modulo}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-600">{tarea.fechaLimite}</span>
                          {tarea.restriccion && (
                            <span className="text-xs text-red-500 bg-red-50 px-1.5 py-0.5 rounded">{tarea.restriccion}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
