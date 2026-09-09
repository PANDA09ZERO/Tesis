import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { asistenciasApi, alumnosApi, cursosApi } from '../../api/endpoints';
import type { Alumno, Curso } from '../../types';
import toast from 'react-hot-toast';

type EstadoAsistencia = 'presente' | 'ausente' | 'tardanza' | 'justificado';

export default function AsistenciasPage() {
  const [alumnos, setAlumnos] = useState<Alumno[]>([]);
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [selectedCurso, setSelectedCurso] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
  const [registros, setRegistros] = useState<Record<number, { estado: EstadoAsistencia; minutos: number }>>({});

  useEffect(() => {
    Promise.all([
      alumnosApi.getAll({ limit: 100 }),
      cursosApi.getAll({ limit: 100 })
    ]).then(([a, c]) => {
      setAlumnos(a.data.data || []);
      setCursos(c.data.data || []);
    });
  }, []);

  const setEstado = (alumnoId: number, estado: EstadoAsistencia) => {
    setRegistros(prev => ({
      ...prev,
      [alumnoId]: { estado, minutos: prev[alumnoId]?.minutos || 0 }
    }));
  };

  const setMinutos = (alumnoId: number, minutos: number) => {
    setRegistros(prev => ({
      ...prev,
      [alumnoId]: { ...prev[alumnoId], minutos }
    }));
  };

  const handleSave = async () => {
    const asistencias = Object.entries(registros).map(([id, reg]) => ({
      alumno_id: parseInt(id),
      curso_id: selectedCurso ? parseInt(selectedCurso) : null,
      fecha,
      estado: reg.estado,
      minutos_tardanza: reg.estado === 'tardanza' ? reg.minutos : 0
    }));

    if (asistencias.length === 0) {
      toast.error('No hay registros para guardar');
      return;
    }

    try {
      await asistenciasApi.bulkRegister(asistencias);
      toast.success(`${asistencias.length} asistencias registradas`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error');
    }
  };

  const estadoButtons: { estado: EstadoAsistencia; icon: any; color: string; label: string }[] = [
    { estado: 'presente', icon: CheckCircle, color: 'text-green-600 bg-green-50 hover:bg-green-100', label: 'Presente' },
    { estado: 'ausente', icon: XCircle, color: 'text-red-600 bg-red-50 hover:bg-red-100', label: 'Ausente' },
    { estado: 'tardanza', icon: Clock, color: 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100', label: 'Tardanza' },
    { estado: 'justificado', icon: AlertCircle, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100', label: 'Justificado' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <select value={selectedCurso} onChange={e => setSelectedCurso(e.target.value)} className="input-field w-64">
            <option value="">Todos los cursos</option>
            {cursos.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
          <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className="input-field w-44" />
        </div>
        <button onClick={handleSave} disabled={Object.keys(registros).length === 0} className="btn-success disabled:opacity-50">
          Guardar Asistencias ({Object.keys(registros).length})
        </button>
      </div>

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="table-header px-4 py-3">Alumno</th>
                <th className="table-header px-4 py-3">Estado</th>
                <th className="table-header px-4 py-3">Min. Tardanza</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {alumnos.map(alumno => (
                <tr key={alumno.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{alumno.nombre} {alumno.apellido}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {estadoButtons.map(({ estado, icon: Icon, color, label }) => (
                        <button key={estado} onClick={() => setEstado(alumno.id, estado)}
                          title={label}
                          className={`p-1.5 rounded-lg transition-colors ${color} ${registros[alumno.id]?.estado === estado ? 'ring-2 ring-offset-1 ring-current' : ''}`}>
                          <Icon className="w-4 h-4" />
                        </button>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {registros[alumno.id]?.estado === 'tardanza' && (
                      <input type="number" min="1" max="120" value={registros[alumno.id]?.minutos || 0}
                        onChange={e => setMinutos(alumno.id, parseInt(e.target.value) || 0)}
                        className="input-field w-20" placeholder="Min" />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
