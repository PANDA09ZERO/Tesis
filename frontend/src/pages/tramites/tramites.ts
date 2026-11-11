import type { EstadoTramite, TipoTramite } from '../../api/endpoints';
import { loadLibretaInstitucion, type StudentRecord } from '../documents/academic-record';

export const TIPOS_TRAMITE: { value: TipoTramite; label: string; ayuda: string }[] = [
  { value: 'traslado', label: 'Traslado a otro colegio', ayuda: 'Indica el colegio de destino. El traslado oficial se registra también en SIAGIE.' },
  { value: 'certificado_estudios', label: 'Certificado de estudios', ayuda: 'El certificado oficial se emite en SIAGIE; aquí se registra el pedido y se guarda el PDF entregado.' },
  { value: 'constancia_estudios', label: 'Constancia de estudios', ayuda: 'La genera el sistema con los años y grados cursados.' },
  { value: 'constancia_matricula', label: 'Constancia de matrícula', ayuda: 'La genera el sistema si el alumno tiene matrícula vigente.' },
  { value: 'constancia_conducta', label: 'Constancia de conducta', ayuda: 'La genera el sistema; revisa el texto antes de imprimir.' },
  { value: 'otro', label: 'Otro trámite', ayuda: 'Describe el trámite en observaciones.' }
];
export const tipoTramiteLabel = (tipo: string) => TIPOS_TRAMITE.find(t => t.value === tipo)?.label || tipo;

export const ESTADOS_TRAMITE: Record<EstadoTramite, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default' }> = {
  solicitado: { label: 'Solicitado', variant: 'warning' },
  en_proceso: { label: 'En proceso', variant: 'info' },
  listo: { label: 'Listo para entregar', variant: 'success' },
  entregado: { label: 'Entregado', variant: 'default' },
  anulado: { label: 'Anulado', variant: 'danger' }
};
export const SIGUIENTE_ESTADO: Partial<Record<EstadoTramite, { estado: EstadoTramite; accion: string }>> = {
  solicitado: { estado: 'en_proceso', accion: 'Empezar' },
  en_proceso: { estado: 'listo', accion: 'Marcar listo' },
  listo: { estado: 'entregado', accion: 'Marcar entregado' }
};

export const ESTADOS_ALUMNO: Record<string, string> = {
  matriculado: 'Matriculado', egresado: 'Egresado', retirado: 'Retirado', trasladado: 'Trasladado'
};

export const fechaCorta = (valor: string | null | undefined) => valor ? new Date(valor).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const esc = (valor: unknown) => String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

export type TipoConstancia = 'constancia_estudios' | 'constancia_matricula' | 'constancia_conducta';
export const CONSTANCIAS: { value: TipoConstancia; label: string }[] = [
  { value: 'constancia_estudios', label: 'Constancia de estudios' },
  { value: 'constancia_matricula', label: 'Constancia de matrícula' },
  { value: 'constancia_conducta', label: 'Constancia de conducta' }
];

/** Abre una ventana con la constancia lista para revisar, corregir e imprimir. */
export function imprimirConstancia(record: StudentRecord, tipo: TipoConstancia): string | null {
  const a = record.alumno as StudentRecord['alumno'] & Record<string, any>;
  const inst = loadLibretaInstitucion();
  const nombre = `${a.nombre} ${a.apellido}`.toUpperCase();
  const identificado = a.genero === 'F' ? 'identificada' : a.genero === 'M' ? 'identificado' : 'identificado(a)';
  const documento = a.dni ? `, ${identificado} con DNI N.° ${esc(a.dni)}` : '';
  const periodos = [...record.matriculas]
    .filter(m => m.inscripciones.some(c => c.estado !== 'cancelada'))
    .sort((x, y) => String(x.periodo).localeCompare(String(y.periodo), 'es', { numeric: true }));
  const vigente = record.matriculas.find(m => m.periodo_activo && m.inscripciones.some(c => c.estado === 'activa'));

  let titulo = '', cuerpo = '';
  if (tipo === 'constancia_matricula') {
    if (!vigente) return 'El alumno no tiene una matrícula vigente en el periodo activo.';
    titulo = 'CONSTANCIA DE MATRÍCULA';
    cuerpo = `<p>Que <b>${esc(nombre)}</b>${documento}, con código ${esc(a.codigo_alumno)}, se encuentra <b>matriculado(a)</b> en esta institución educativa
      en el periodo académico <b>${esc(vigente.periodo)}</b>, grado <b>${esc(vigente.grado || 'no registrado')}</b>.</p>`;
  } else {
    const filas = periodos.map(m => `<tr><td>${esc(m.periodo)}</td><td>${esc(m.grado || '—')}</td><td>Sistema</td></tr>`);
    if (a.anio_ingreso || a.anio_ultimo_estudio || a.ultimo_grado_cursado) {
      const anios = a.anio_ingreso && a.anio_ultimo_estudio ? `${a.anio_ingreso} – ${a.anio_ultimo_estudio}` : (a.anio_ultimo_estudio || a.anio_ingreso || '—');
      filas.unshift(`<tr><td>${esc(anios)}</td><td>${esc(a.ultimo_grado_cursado ? 'Hasta ' + a.ultimo_grado_cursado : '—')}</td><td>Archivo del colegio</td></tr>`);
    }
    if (!filas.length) return 'No hay años de estudio registrados. Completa el historial previo (años y último grado) antes de generar la constancia.';
    const situacion = ESTADOS_ALUMNO[a.estado] ? `<p>Situación actual: <b>${esc(ESTADOS_ALUMNO[a.estado])}</b>.</p>` : '';
    if (tipo === 'constancia_estudios') {
      titulo = 'CONSTANCIA DE ESTUDIOS';
      cuerpo = `<p>Que <b>${esc(nombre)}</b>${documento}, con código ${esc(a.codigo_alumno)}, cursó estudios en esta institución educativa según el siguiente detalle:</p>
        <table><thead><tr><th>Año / periodo</th><th>Grado</th><th>Fuente</th></tr></thead><tbody>${filas.join('')}</tbody></table>${situacion}`;
    } else {
      titulo = 'CONSTANCIA DE CONDUCTA';
      cuerpo = `<p>Que <b>${esc(nombre)}</b>${documento}, con código ${esc(a.codigo_alumno)}, estudiante de esta institución educativa,
        ha observado <b>buena conducta</b> durante su permanencia en el plantel.</p>
        <table><thead><tr><th>Año / periodo</th><th>Grado</th><th>Fuente</th></tr></thead><tbody>${filas.join('')}</tbody></table>`;
    }
  }

  const hoy = new Date().toLocaleDateString('es-PE', { day: 'numeric', month: 'long', year: 'numeric' });
  const ventana = window.open('', '_blank');
  if (!ventana) return 'El navegador bloqueó la ventana. Permite las ventanas emergentes para este sitio.';
  ventana.document.write(`<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(titulo)} - ${esc(nombre)}</title>
<style>
  body{font-family:Georgia,'Times New Roman',serif;color:#111;max-width:720px;margin:32px auto;padding:0 24px;line-height:1.6;font-size:15px}
  .aviso{font-family:system-ui,sans-serif;background:#eef6ff;border:1px solid #bcd7f5;border-radius:8px;padding:10px 14px;font-size:13px;margin-bottom:24px;display:flex;gap:12px;align-items:center;justify-content:space-between}
  .aviso button{font:inherit;padding:6px 14px;border-radius:6px;border:0;background:#1d4ed8;color:#fff;cursor:pointer}
  header{text-align:center;border-bottom:2px solid #111;padding-bottom:12px;margin-bottom:28px}
  header .meta{font-size:12px;letter-spacing:.04em;text-transform:uppercase}
  header h1{font-size:20px;margin:6px 0 0}
  h2{text-align:center;font-size:18px;letter-spacing:.12em;margin:28px 0 20px}
  table{border-collapse:collapse;width:100%;margin:12px 0 16px;font-size:14px}
  th,td{border:1px solid #444;padding:6px 10px;text-align:left}
  th{background:#f2f2f2}
  .firma{margin-top:96px;text-align:center}
  .firma div{border-top:1px solid #111;width:260px;margin:0 auto;padding-top:6px}
  [contenteditable]:focus{outline:2px dashed #93c5fd;outline-offset:4px}
  @media print{.aviso{display:none}body{margin:0 auto}}
</style></head><body>
<div class="aviso"><span>Puedes corregir cualquier texto haciendo clic sobre él antes de imprimir. Firma y sella la constancia impresa.</span><button onclick="window.print()">Imprimir</button></div>
<main contenteditable="true" spellcheck="false">
<header><div class="meta">${esc(inst.dre)} · ${esc(inst.ugel)}</div><h1>I.E. «${esc(inst.institucion)}»</h1><div class="meta">Código modular ${esc(inst.codigoModular)}</div></header>
<h2>${esc(titulo)}</h2>
<p>La Dirección de la Institución Educativa «${esc(inst.institucion)}» hace constar:</p>
${cuerpo}
<p>Se expide la presente a solicitud de la parte interesada, para los fines que estime conveniente.</p>
<p style="text-align:right;margin-top:28px">Lima, ${esc(hoy)}.</p>
<div class="firma"><div>Director(a)<br>Firma y sello</div></div>
</main></body></html>`);
  ventana.document.close();
  return null;
}
