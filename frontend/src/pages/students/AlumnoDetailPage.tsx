import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, BookOpen, CheckCircle } from 'lucide-react';
import Badge from '../../components/ui/Badge';
import { alumnosApi } from '../../api/endpoints';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export default function AlumnoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [alumno, setAlumno] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) loadAlumno(parseInt(id));
  }, [id]);

  const loadAlumno = async (alumnoId: number) => {
    try {
      const res = await alumnosApi.getById(alumnoId);
      setAlumno(res.data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="card animate-pulse h-64" />;
  }

  if (!alumno) {
    return <div className="text-center py-12 text-gray-500">Alumno no encontrado</div>;
  }

  const chartData = alumno.calificaciones?.map((c: any) => ({
    name: c.curso_nombre?.substring(0, 15),
    nota: c.nota
  })) || [];

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div className="card">
        <div className="flex flex-col md:flex-row gap-6">
          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-3xl font-bold text-primary-700">{alumno.nombre?.[0]}{alumno.apellido?.[0]}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{alumno.nombre} {alumno.apellido}</h2>
                <p className="text-gray-500 font-mono">{alumno.codigo_alumno}</p>
              </div>
              <Badge variant={alumno.estado === 'matriculado' ? 'success' : 'danger'}>{alumno.estado}</Badge>
            </div>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {alumno.email && <div className="flex items-center gap-2 text-gray-600"><Mail className="w-4 h-4" /> {alumno.email}</div>}
              {alumno.telefono && <div className="flex items-center gap-2 text-gray-600"><Phone className="w-4 h-4" /> {alumno.telefono}</div>}
              {alumno.fecha_nacimiento && <div className="flex items-center gap-2 text-gray-600"><Calendar className="w-4 h-4" /> {alumno.fecha_nacimiento}</div>}
              {alumno.grado && <div className="flex items-center gap-2 text-gray-600"><BookOpen className="w-4 h-4" /> {alumno.grado} - {alumno.seccion}</div>}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h3 className="text-lg font-semibold mb-4">Calificaciones</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <XAxis dataKey="name" fontSize={10} />
                <YAxis domain={[0, 20]} />
                <Tooltip />
                <Bar dataKey="nota" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">Sin calificaciones registradas</p>
          )}
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Resumen de Asistencia</h3>
          {alumno.resumenAsistencia ? (
            <div className="space-y-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary-600">
                  {alumno.resumenAsistencia.total > 0
                    ? Math.round((alumno.resumenAsistencia.presentes / alumno.resumenAsistencia.total) * 100)
                    : 0}%
                </div>
                <p className="text-sm text-gray-500">Asistencia</p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Presentes:</span><span className="font-medium">{alumno.resumenAsistencia.presentes || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Ausentes:</span><span className="font-medium text-red-600">{alumno.resumenAsistencia.ausentes || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tardanzas:</span><span className="font-medium text-yellow-600">{alumno.resumenAsistencia.tardanzas || 0}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Justificados:</span><span className="font-medium">{alumno.resumenAsistencia.justificados || 0}</span></div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Sin datos de asistencia</p>
          )}
        </div>
      </div>
    </div>
  );
}
