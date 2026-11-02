import { useState } from 'react';
import { Printer } from 'lucide-react';
import { PrintableReport } from './ReportPresentation';
import { reportCourses, type StudentRecord, type AcademicGroup, type CalculatedReport, loadLibretaInstitucion } from './academic-record';

const demoRecord: StudentRecord = {
  alumno: { id: 999, nombre: 'María', apellido: 'Gómez Pérez', codigo_alumno: 'DEMO-001', estado: 'matriculado', dni: '12345678', email: 'maria.gomez@example.invalid', telefono: '999888777', direccion: 'Av. Ejemplo 123, Lima', fecha_nacimiento: '2012-05-10' },
  matriculas: [{ periodo_academico_id: 1, periodo_activo: 1, periodo: '2026-I', grado_id: 1, grado: '3er Grado', inscripciones: [
    { id: 1, curso_id: 1, curso: 'Matemáticas', codigo: 'MAT', estado: 'activa', fecha_matricula: '2026-03-01' },
    { id: 2, curso_id: 2, curso: 'Comunicación', codigo: 'COM', estado: 'activa', fecha_matricula: '2026-03-01' },
    { id: 3, curso_id: 3, curso: 'Ciencia y Tecnología', codigo: 'CYT', estado: 'activa', fecha_matricula: '2026-03-01' },
  ] }],
  calificaciones: [
    { id: 1, periodo_id: 1, periodo: '2026-I', grado_id: 1, grado: '3er Grado', curso_id: 1, curso: 'Matemáticas', evaluacion_id: 1, evaluacion: 'Práctica 1', nota: 17, escala_maxima: 20, fecha: '2026-03-15', observaciones: 'Buen desempeño' },
    { id: 2, periodo_id: 1, periodo: '2026-I', grado_id: 1, grado: '3er Grado', curso_id: 1, curso: 'Matemáticas', evaluacion_id: 2, evaluacion: 'Trabajo 1', nota: 18, escala_maxima: 20, fecha: '2026-03-22', observaciones: null },
    { id: 3, periodo_id: 1, periodo: '2026-I', grado_id: 1, grado: '3er Grado', curso_id: 1, curso: 'Matemáticas', evaluacion_id: 3, evaluacion: 'Examen bimestral', nota: 16, escala_maxima: 20, fecha: '2026-04-10', observaciones: 'Reforzar fracciones' },
    { id: 4, periodo_id: 1, periodo: '2026-I', grado_id: 1, grado: '3er Grado', curso_id: 2, curso: 'Comunicación', evaluacion_id: 4, evaluacion: 'Práctica 1', nota: 19, escala_maxima: 20, fecha: '2026-03-18', observaciones: null },
    { id: 5, periodo_id: 1, periodo: '2026-I', grado_id: 1, grado: '3er Grado', curso_id: 2, curso: 'Comunicación', evaluacion_id: 5, evaluacion: 'Examen bimestral', nota: 17, escala_maxima: 20, fecha: '2026-04-12', observaciones: null },
    { id: 6, periodo_id: 1, periodo: '2026-I', grado_id: 1, grado: '3er Grado', curso_id: 3, curso: 'Ciencia y Tecnología', evaluacion_id: 6, evaluacion: 'Práctica 1', nota: 15, escala_maxima: 20, fecha: '2026-03-20', observaciones: 'Participa activamente' },
  ],
  evaluaciones: [
    { id: 1, periodo_id: 1, periodo: '2026-I', grado_id: 1, grado: '3er Grado', curso_id: 1, curso: 'Matemáticas', nombre: 'Práctica 1', fecha: '2026-03-15', nota_maxima: 20, estado: 'cerrada' },
    { id: 2, periodo_id: 1, periodo: '2026-I', grado_id: 1, grado: '3er Grado', curso_id: 1, curso: 'Matemáticas', nombre: 'Trabajo 1', fecha: '2026-03-22', nota_maxima: 20, estado: 'cerrada' },
    { id: 3, periodo_id: 1, periodo: '2026-I', grado_id: 1, grado: '3er Grado', curso_id: 1, curso: 'Matemáticas', nombre: 'Examen bimestral', fecha: '2026-04-10', nota_maxima: 20, estado: 'cerrada' },
    { id: 4, periodo_id: 1, periodo: '2026-I', grado_id: 1, grado: '3er Grado', curso_id: 2, curso: 'Comunicación', nombre: 'Práctica 1', fecha: '2026-03-18', nota_maxima: 20, estado: 'cerrada' },
    { id: 5, periodo_id: 1, periodo: '2026-I', grado_id: 1, grado: '3er Grado', curso_id: 2, curso: 'Comunicación', nombre: 'Examen bimestral', fecha: '2026-04-12', nota_maxima: 20, estado: 'cerrada' },
    { id: 6, periodo_id: 1, periodo: '2026-I', grado_id: 1, grado: '3er Grado', curso_id: 3, curso: 'Ciencia y Tecnología', nombre: 'Práctica 1', fecha: '2026-03-20', nota_maxima: 20, estado: 'cerrada' },
  ],
  asistencia: [{ periodo_id: 1, grado_id: 1, periodo: '2026-I', grado: '3er Grado', estado: 'presente', total: 18 }],
  apoderados: [{ id: 1, nombre: 'Carlos', apellido: 'Gómez', email: 'carlos.gomez@example.invalid', telefono: '999777666', parentesco: 'Padre' }],
  documentos: [],
};

const demoGroup: AcademicGroup = { periodo_id: 1, grado_id: 1, periodo: '2026-I', grado: '3er Grado' };

const demoCalculation: CalculatedReport = {
  alumno: demoRecord.alumno,
  periodo_id: 1,
  grado_id: 1,
  periodo: '2026-I',
  grado: '3er Grado',
  listo: true,
  reglas: { escala: 'numerica', maxima: 20, minima: 11, decimales: 2, pesos: { practica: 40, trabajo: 30, examen: 30 }, normalizar: true, excluir_historicas: false, recuperacion: 'mayor', categorias: {}, recuperaciones: {}, niveles: { AD: 18, A: 15, B: 11 } },
  cursos: [
    { id: 1, nombre: 'Matemáticas', estado: 'activa', final: 17.0, valor: '17.00', condicion: 'Aprobado', pendientes: [], categorias: [{ categoria: 'practica', peso: 40, promedio: 17 }, { categoria: 'trabajo', peso: 30, promedio: 18 }, { categoria: 'examen', peso: 30, promedio: 16 }] },
    { id: 2, nombre: 'Comunicación', estado: 'activa', final: 18.0, valor: '18.00', condicion: 'Aprobado', pendientes: [], categorias: [{ categoria: 'practica', peso: 40, promedio: 19 }, { categoria: 'examen', peso: 60, promedio: 17 }] },
    { id: 3, nombre: 'Ciencia y Tecnología', estado: 'activa', final: 15.0, valor: '15.00', condicion: 'Aprobado', pendientes: [], categorias: [{ categoria: 'practica', peso: 100, promedio: 15 }] },
  ],
};

export default function LibretaDemoPreview() {
  const [active, setActive] = useState(false);
  const demoCourses = reportCourses(demoRecord, demoGroup);
  return (
    <section className="card space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold">Vista previa de libreta de notas</h2>
          <p className="mt-1 text-xs text-gray-500">Datos ficticios para ver cómo se verá la versión descargable (imprimible) de la libreta.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => setActive(value => !value)}>{active ? 'Ocultar ejemplo' : 'Mostrar ejemplo'}</button>
          {active && <button type="button" className="btn-primary gap-2" onClick={() => window.print()}><Printer aria-hidden="true" className="h-4 w-4" />Imprimir ejemplo</button>}
        </div>
      </div>
      {active && <PrintableReport record={demoRecord} group={demoGroup} courses={demoCourses} calculation={demoCalculation} institucion={loadLibretaInstitucion()} />}
      {active && <p className="text-xs text-gray-500">Al imprimir, el navegador permite guardar como PDF. Los datos son ficticios y no se guardan en el sistema.</p>}
    </section>
  );
}