import type { ReactNode } from 'react';
import { Eye, Edit, UserPlus, Mail, GraduationCap } from 'lucide-react';
import type { Alumno } from '../../types';

interface Props {
  alumno: Alumno;
  status: ReactNode;
  onView: () => void;
  onEdit?: () => void;
  onReenroll?: () => void;
}

export default function StudentMobileCard({ alumno, status, onView, onEdit, onReenroll }: Props) {
  const name = `${alumno.nombre} ${alumno.apellido}`;
  return <article aria-label={name} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
    <div className="flex min-w-0 items-start gap-3">
      <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-50 font-semibold text-primary-700 dark:bg-gray-800 dark:text-gray-100">{alumno.nombre?.[0]}{alumno.apellido?.[0]}</span>
      <div className="min-w-0 flex-1"><h2 className="break-words font-semibold text-gray-900 dark:text-gray-100">{name}</h2><p className="mt-1 break-all font-mono text-xs text-gray-500 dark:text-gray-400">{alumno.codigo_alumno}</p></div>
    </div>
    <div className="mt-3 flex flex-wrap gap-2">{status}</div>
    <dl className="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-300">
      <div className="flex items-start gap-2"><dt className="flex shrink-0 items-center gap-1"><GraduationCap className="h-4 w-4" aria-hidden="true"/><span className="sr-only">Grado</span></dt><dd className="min-w-0 break-words">{alumno.grado || 'Sin grado en la matrícula consultada'}</dd></div>
      <div className="flex items-start gap-2"><dt className="flex shrink-0 items-center gap-1"><Mail className="h-4 w-4" aria-hidden="true"/><span className="sr-only">Correo</span></dt><dd className="min-w-0 break-all">{alumno.email}</dd></div>
    </dl>
    <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">
      <button type="button" onClick={onView} aria-label={`Ver detalle de ${name}`} className="btn-primary flex-1 gap-2 text-sm"><Eye className="h-4 w-4" aria-hidden="true"/>Ver detalle</button>
      {onEdit && <button type="button" onClick={onEdit} aria-label={`Editar a ${name}`} className="btn-secondary gap-2 text-sm"><Edit className="h-4 w-4" aria-hidden="true"/>Editar</button>}
      {onReenroll && <button type="button" onClick={onReenroll} aria-label={`Rematricular a ${name}`} className="btn-secondary w-full gap-2 text-sm"><UserPlus className="h-4 w-4" aria-hidden="true"/>Rematricular</button>}
    </div>
  </article>;
}
