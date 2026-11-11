import './students.css';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, CheckCircle2, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import Badge from '../../components/ui/Badge';
import { alumnosApi } from '../../api/endpoints';
import { ESTADOS_ALUMNO } from '../tramites/tramites';

const COLUMNAS: [string, string, boolean][] = [
  ['dni', 'DNI del alumno (8 dígitos). Muy recomendado para ubicarlo después.', false],
  ['nombres', 'Nombres del alumno.', true],
  ['apellidos', 'Apellidos del alumno.', true],
  ['fecha_nacimiento', 'DD/MM/AAAA.', false],
  ['genero', 'M o F.', false],
  ['estado', 'egresado, retirado o trasladado. Si está vacío: egresado.', false],
  ['anio_ingreso', 'Año en que empezó en el colegio. Ej.: 2015.', false],
  ['anio_ultimo_estudio', 'Último año que estudió en el colegio. Ej.: 2023.', false],
  ['ultimo_grado', 'Último grado cursado. Ej.: 5.° de secundaria.', false],
  ['telefono', '', false], ['direccion', '', false], ['observaciones', '', false],
  ['apoderado_dni', 'Si el apoderado ya existe en el sistema, se vincula; si no, se registra sin cuenta de acceso.', false],
  ['apoderado_nombres', 'Obligatorio si el apoderado es nuevo.', false],
  ['apoderado_apellidos', 'Obligatorio si el apoderado es nuevo.', false],
  ['apoderado_telefono', '', false], ['parentesco', 'Ej.: madre, padre, tutor.', false]
];

interface Fila { fila: number; errores: string[]; advertencias: string[]; datos: any }
interface Vista { total: number; validas: number; con_errores: number; columnas_ignoradas: string[]; filas: Fila[] }

function descargarPlantilla() {
  // CSV con ";" y BOM: Excel en español lo abre en columnas y con tildes correctas.
  const contenido = '﻿' + COLUMNAS.map(c => c[0]).join(';') + '\r\n';
  const url = URL.createObjectURL(new Blob([contenido], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'plantilla_exalumnos.csv'; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const MAX_VISIBLES = 300;

export default function ImportarExalumnosPage() {
  const navigate = useNavigate();
  const [archivo, setArchivo] = useState<File | null>(null);
  const [vista, setVista] = useState<Vista | null>(null);
  const [cargando, setCargando] = useState<'revisar' | 'importar' | null>(null);
  const [error, setError] = useState('');
  const [soloProblemas, setSoloProblemas] = useState(false);
  const [resultado, setResultado] = useState<{ importados: number; apoderados_creados: number } | null>(null);

  const revisar = async () => {
    if (!archivo || cargando) return;
    setCargando('revisar'); setError(''); setVista(null); setResultado(null);
    try {
      const res = await alumnosApi.importarHistoricos(archivo, 'vista_previa');
      setVista(res.data.data); setSoloProblemas(res.data.data.con_errores > 0);
    } catch (e: any) { setError(e.response?.data?.message || 'No se pudo leer el archivo'); }
    finally { setCargando(null); }
  };

  const importar = async () => {
    if (!archivo || !vista || vista.con_errores || cargando) return;
    if (!window.confirm(`Se registrarán ${vista.validas} exalumnos. ¿Continuar?`)) return;
    setCargando('importar'); setError('');
    try {
      const res = await alumnosApi.importarHistoricos(archivo, 'confirmar');
      setResultado(res.data.data); setVista(null); setArchivo(null);
      toast.success(res.data.message || 'Importación completa');
    } catch (e: any) {
      setError(e.response?.data?.message || 'No se importó ningún alumno');
      if (e.response?.data?.data?.filas) setVista(e.response.data.data);
    } finally { setCargando(null); }
  };

  const filas = vista ? vista.filas.filter(f => !soloProblemas || f.errores.length || f.advertencias.length) : [];

  return (
    <div className="students-surface space-y-5">
      <button onClick={() => navigate('/exalumnos')} className="flex min-h-11 items-center gap-2 text-gray-600 hover:text-gray-900 dark:text-gray-300"><ArrowLeft className="h-4 w-4" /> Exalumnos</button>
      <div>
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Importar exalumnos desde Excel</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Carga a los alumnos que estudiaron antes del sistema. Solo se guardan sus datos: no se crean matrículas, notas ni cuentas de acceso.</p>
      </div>

      {resultado && <div className="card flex items-start gap-3 border-green-200 bg-green-50 dark:bg-green-950" role="status">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-600" />
        <div className="space-y-2">
          <p className="font-medium text-green-900 dark:text-green-100">{resultado.importados} exalumnos importados{resultado.apoderados_creados ? ` y ${resultado.apoderados_creados} apoderados registrados` : ''}.</p>
          <button type="button" className="btn-primary" onClick={() => navigate('/exalumnos')}>Ver exalumnos</button>
        </div>
      </div>}

      <section className="card space-y-3">
        <h2 className="font-semibold">1. Prepara el archivo</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300">Descarga la plantilla, ábrela en Excel y pega una fila por alumno. Puedes guardarla como Excel (.xlsx) o CSV. Solo <b>nombres</b> y <b>apellidos</b> son obligatorios; los encabezados deben quedar en la primera fila.</p>
        <button type="button" className="btn-secondary flex items-center gap-2" onClick={descargarPlantilla}><Download className="h-4 w-4" /> Descargar plantilla</button>
        <details className="text-sm">
          <summary className="cursor-pointer text-primary-600">Ver qué va en cada columna</summary>
          <dl className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
            {COLUMNAS.map(([c, ayuda, req]) => <div key={c}><dt className="inline font-mono text-xs">{c}{req ? ' *' : ''}</dt>{ayuda && <dd className="inline text-gray-500"> — {ayuda}</dd>}</div>)}
          </dl>
        </details>
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">2. Revisa antes de importar</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <label className="btn-secondary flex cursor-pointer items-center justify-center gap-2">
            <FileSpreadsheet className="h-4 w-4" /> {archivo ? 'Cambiar archivo' : 'Elegir archivo'}
            <input type="file" accept=".xlsx,.csv" className="sr-only" onChange={e => { setArchivo(e.target.files?.[0] || null); setVista(null); setError(''); setResultado(null); e.target.value = ''; }} />
          </label>
          {archivo && <span className="truncate text-sm text-gray-600">{archivo.name}</span>}
          <button type="button" className="btn-primary sm:ml-auto" disabled={!archivo || !!cargando} onClick={() => void revisar()}>{cargando === 'revisar' ? 'Revisando…' : 'Revisar archivo'}</button>
        </div>
        {error && <p role="alert" className="rounded-lg border border-red-200 p-3 text-sm text-red-600">{error}</p>}
      </section>

      {vista && <section className="card space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="info">{vista.total} filas</Badge>
          <Badge variant="success">{vista.validas} listas</Badge>
          {vista.con_errores > 0 && <Badge variant="danger">{vista.con_errores} con errores</Badge>}
        </div>
        {vista.columnas_ignoradas.length > 0 && <p className="text-sm text-amber-700">Columnas no reconocidas (se ignoran): {vista.columnas_ignoradas.join(', ')}</p>}
        {vista.con_errores > 0
          ? <p className="flex items-start gap-2 text-sm text-red-700"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> Corrige las filas con errores en tu Excel y vuelve a elegir el archivo. No se importa nada hasta que todas estén bien.</p>
          : <p className="text-sm text-green-700">Todo listo. Las advertencias no impiden importar.</p>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={soloProblemas} onChange={e => setSoloProblemas(e.target.checked)} className="rounded" /> Mostrar solo filas con errores o advertencias</label>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead><tr className="border-b text-left text-gray-500"><th className="py-2 pr-3">Fila</th><th className="py-2 pr-3">Alumno</th><th className="py-2 pr-3">DNI</th><th className="py-2 pr-3">Situación</th><th className="py-2 pr-3">Último año / grado</th><th className="py-2">Revisión</th></tr></thead>
            <tbody>{filas.slice(0, MAX_VISIBLES).map(f => <tr key={f.fila} className={`border-b align-top ${f.errores.length ? 'bg-red-50 dark:bg-red-950/40' : ''}`}>
              <td className="py-2 pr-3 font-mono text-xs">{f.fila}</td>
              <td className="py-2 pr-3">{f.datos.apellido}, {f.datos.nombre}</td>
              <td className="py-2 pr-3">{f.datos.dni || '—'}</td>
              <td className="py-2 pr-3">{ESTADOS_ALUMNO[f.datos.estado] || f.datos.estado}</td>
              <td className="py-2 pr-3">{[f.datos.anio_ultimo_estudio, f.datos.ultimo_grado_cursado].filter(Boolean).join(' · ') || '—'}</td>
              <td className="py-2">
                {f.errores.map(m => <p key={m} className="text-red-700 dark:text-red-300">✕ {m}</p>)}
                {f.advertencias.map(m => <p key={m} className="text-amber-700 dark:text-amber-300">! {m}</p>)}
                {!f.errores.length && !f.advertencias.length && <span className="text-green-700">OK</span>}
              </td>
            </tr>)}</tbody>
          </table>
          {filas.length > MAX_VISIBLES && <p className="mt-2 text-xs text-gray-500">Se muestran las primeras {MAX_VISIBLES} de {filas.length} filas.</p>}
          {!filas.length && <p className="py-4 text-center text-sm text-gray-500">No hay filas con problemas.</p>}
        </div>

        <div className="form-actions">
          <button type="button" className="btn-primary" disabled={!!vista.con_errores || !vista.validas || !!cargando} onClick={() => void importar()}>
            {cargando === 'importar' ? 'Importando…' : `Importar ${vista.validas} exalumnos`}
          </button>
        </div>
      </section>}
    </div>
  );
}
