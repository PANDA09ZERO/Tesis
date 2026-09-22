import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  BookOpen, Calendar, Users, FileText, ChevronDown, ChevronUp, ChevronRight,
  ArrowLeft, CheckCircle, Clock, Star, Mail, GraduationCap
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cursosApi, calificacionesApi } from '../../api/endpoints';
import type { Curso, Calificacion } from '../../types';
import toast from 'react-hot-toast';

interface Modulo {
  titulo: string;
  descripcion: string;
  documentos: { nombre: string; tipo: string; fecha: string }[];
  desplegado: boolean;
}

interface Profesor {
  nombre: string;
  apellido: string;
  email: string;
  especialidad: string;
}

export default function CursoDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [curso, setCurso] = useState<Curso>({ id: 0, nombre: '', codigo: '', descripcion: '' });
  const [loading, setLoading] = useState(true);
  const [modulos, setModulos] = useState<Modulo[]>([
    {
      titulo: 'Bienvenida al Periodo',
      descripcion: 'Mensaje inicial del docente. Sea bienvenido/a al período académico vigente.',
      documentos: [],
      desplegado: true
    },
    {
      titulo: 'Información del Curso',
      descripcion: 'Instrucciones sobre la secuencia de revisión de archivos.',
      documentos: [],
      desplegado: false
    },
    {
      titulo: 'Syllabus y Planificación',
      descripcion: 'Planificación del curso, objetivos, metodología y evaluación.',
      documentos: [],
      desplegado: false
    }
  ]);

  const [profesores, setProfesores] = useState<Profesor[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await cursosApi.getById(parseInt(id || '1'));
        console.log('Respuesta completa:', res);
        console.log('Respuesta data:', res.data);
        console.log('Curso data:', res.data.data);
        const cursoData = res.data.data || res.data;
        console.log('Profesores:', (cursoData as any)?.profesores);
        setCurso(cursoData);
        setProfesores((cursoData as any)?.profesores || []);
      } catch (error) {
        console.error('Error al cargar curso:', error);
        toast.error('Error al cargar curso');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [id]);
  const [activeTab, setActiveTab] = useState<'contenido' | 'calendario' | 'calificaciones'>('contenido');
  const [notificacion, setNotificacion] = useState(1);

  const promedio = 10.0;

  const toggleModulo = (index: number) => {
    setModulos(prev => prev.map((m, i) =>
      i === index ? { ...m, desplegado: !m.desplegado } : m
    ));
  };

  const tabs = [
    { key: 'contenido', label: 'Contenido', active: activeTab === 'contenido' },
    { key: 'calendario', label: 'Calendario', active: activeTab === 'calendario' },
    { key: 'calificaciones', label: `Libro de calificaciones ${notificacion > 0 ? `(${notificacion})` : ''}` }
  ];

  return (
    <div className="space-y-4">
      {/* Botón volver */}
      <button
        onClick={() => navigate('/cursos')}
        className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-700 font-medium"
      >
        <ArrowLeft className="w-4 h-4" /> Volver a Cursos
      </button>

      {/* Barra de Navegación Superior */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-sm font-mono bg-slate-600 px-2 py-0.5 rounded">
                {curso.codigo}
              </span>
              <h2 className="text-lg font-bold mt-1">{curso.nombre}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-500 px-2 py-1 rounded-full font-medium">ABIERTO</span>
          </div>
        </div>

        {/* Pestañas */}
        <div className="flex items-center gap-1 px-5 border-b border-gray-200 bg-gray-50">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-3 text-sm font-medium transition-colors relative ${
                tab.active
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
              {tab.key === 'calificaciones' && notificacion > 0 && (
                <span className="absolute -top-1 right-2 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                  {notificacion}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

{/* Banner Institucional */}
        <div className="relative h-36 bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-primary-600/20 to-primary-800/20" />
          <div className="absolute inset-0 flex items-center justify-center text-white">
            <h1 className="text-2xl font-bold">{curso.nombre}</h1>
          </div>
        </div>

      <div className="flex gap-4">
        {/* Área Central */}
        <div className="flex-1 space-y-4">
          {/* Contenido / Calendario / Calificaciones */}
          {activeTab === 'contenido' && (
            <div className="space-y-3">
              {modulos.map((modulo, index) => (
                <div key={index} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => toggleModulo(index)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {modulo.desplegado ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}
                      <div>
                        <h3 className="font-semibold text-gray-900">{modulo.titulo}</h3>
                        <p className="text-xs text-gray-500">{modulo.documentos.length} documento(s)</p>
                      </div>
                    </div>
                    {modulo.desplegado && (
                      <CheckCircle className="w-5 h-5 text-primary-500" />
                    )}
                  </button>
                  {modulo.desplegado && (
                    <div className="px-5 pb-4 border-t border-gray-100 pt-3">
                      <p className="text-sm text-gray-600 mb-3">{modulo.descripcion}</p>
                      {modulo.documentos.length > 0 && (
                        <div className="space-y-2">
                          {modulo.documentos.map((doc, i) => (
                            <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                              <FileText className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-700">{doc.nombre}</span>
                              <span className="text-xs text-gray-400">{doc.tipo}</span>
                              <span className="text-xs text-gray-400 ml-auto">{doc.fecha}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'calendario' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="font-semibold text-gray-900 mb-2">Calendario de Evaluaciones</h3>
              <div className="space-y-3 mt-4">
                {[
                  { fecha: '2026-04-10', evento: 'Parcial - Matemáticas IV', tipo: 'Evaluación' },
                  { fecha: '2026-05-15', evento: 'Final - Comunicación IV', tipo: 'Evaluación' },
                  { fecha: '2026-05-22', evento: 'Entrega Proyecto Integrador', tipo: 'Tarea' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <span className="text-sm font-medium text-gray-900">{item.evento}</span>
                      <p className="text-xs text-gray-500">{item.tipo}</p>
                    </div>
                    <span className="text-sm text-gray-600 font-mono">{item.fecha}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'calificaciones' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h3 className="font-semibold text-gray-900">Libro de Calificaciones</h3>
              {[
                { curso: 'MAT-4', nota: 10.0, estado: 'Aprobado' },
                { curso: 'COM-4', nota: 11.0, estado: 'Aprobado' },
                { curso: 'CYT-4', nota: 9.5, estado: 'En revisión' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-900">{item.curso}</span>
                    <p className="text-xs text-gray-500">{item.estado}</p>
                  </div>
                  <span className={`text-lg font-bold ${item.nota >= 11 ? 'text-green-600' : 'text-orange-600'}`}>
                    {item.nota}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel Lateral Derecho */}
        <div className="w-72 flex-shrink-0 space-y-4">
          {/* Profesores */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary-600" /> Profesores
              </h3>
            </div>
            <div className="p-3 space-y-3">
              {profesores.map((prof, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary-700">
                      {prof.nombre[0]}{prof.apellido[0]}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{prof.nombre} {prof.apellido}</p>
                    <p className="text-xs text-gray-500">{prof.especialidad}</p>
                    <p className="text-xs text-primary-600 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" /> {prof.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary-600" /> Acciones Rápidas
              </h3>
            </div>
            <div className="p-3 space-y-2">
              <button className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-primary-600 hover:bg-primary-50 rounded-lg transition-colors font-medium">
                <Users className="w-4 h-4" /> Lista de participantes
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium">
                <Calendar className="w-4 h-4" /> Registrar asistencia
              </button>
              <button className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-green-600 hover:bg-green-50 rounded-lg transition-colors font-medium">
                <FileText className="w-4 h-4" /> Ver asistencia
              </button>
              {user?.rol === 'administrador' && (
                <>
                  <button className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-purple-600 hover:bg-purple-50 rounded-lg transition-colors font-medium">
                    <Star className="w-4 h-4" /> Ver promedios
                  </button>
                  <button className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium">
                    <Clock className="w-4 h-4" /> Gestionar evaluaciones
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Info del Curso */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Información</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <GraduationCap className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">{curso.grado_nombre || '4to Grado'}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-gray-600">Estado: Activo</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Periodo: 202620</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
