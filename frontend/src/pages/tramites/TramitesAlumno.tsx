import React, { useEffect, useRef, useState } from 'react';
import { FileCheck, Plus, Printer, Upload, Download, Ban } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { alumnosApi, documentosApi, tramitesApi, type Tramite, type TipoTramite } from '../../api/endpoints';
import { TIPOS_TRAMITE, ESTADOS_TRAMITE, SIGUIENTE_ESTADO, CONSTANCIAS, tipoTramiteLabel, fechaCorta, imprimirConstancia, type TipoConstancia } from './tramites';

const VACIO = { tipo: 'certificado_estudios' as TipoTramite, solicitante: '', destino: '', observaciones: '' };

/** Sección "Trámites y certificados" de la ficha del alumno (solo administración). */
export default function TramitesAlumno({ alumnoId, nombre }: { alumnoId: number; nombre: string }) {
  const [tramites, setTramites] = useState<Tramite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nuevo, setNuevo] = useState(false);
  const [form, setForm] = useState(VACIO);
  const [saving, setSaving] = useState(false);
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [generando, setGenerando] = useState(false);
  const archivoPara = useRef<Tramite | null>(null);
  const inputArchivo = useRef<HTMLInputElement>(null);

  const cargar = async () => {
    setLoading(true); setError('');
    try { setTramites((await tramitesApi.getAll({ alumno_id: alumnoId })).data.data || []); }
    catch (e: any) { setError(e.response?.data?.message || 'No se pudieron cargar los trámites'); }
    finally { setLoading(false); }
  };
  useEffect(() => { void cargar(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [alumnoId]);

  const crear = async (e: React.FormEvent) => {
    e.preventDefault(); if (saving) return;
    setSaving(true);
    try {
      await tramitesApi.create({ alumno_id: alumnoId, tipo: form.tipo, solicitante: form.solicitante || undefined, destino: form.destino || undefined, observaciones: form.observaciones || undefined });
      toast.success('Trámite registrado'); setNuevo(false); setForm(VACIO); void cargar();
    } catch (e: any) { toast.error(e.response?.data?.message || 'No se pudo registrar el trámite'); }
    finally { setSaving(false); }
  };

  const actualizar = async (t: Tramite, data: Parameters<typeof tramitesApi.update>[1], mensaje: string) => {
    setOcupado(t.id);
    try { await tramitesApi.update(t.id, data); toast.success(mensaje); void cargar(); }
    catch (e: any) { toast.error(e.response?.data?.message || 'No se pudo actualizar el trámite'); }
    finally { setOcupado(null); }
  };

  const subirArchivo = async (archivo: File) => {
    const t = archivoPara.current; if (!t) return;
    setOcupado(t.id);
    try {
      const fd = new FormData();
      fd.append('archivo', archivo);
      fd.append('titulo', `${tipoTramiteLabel(t.tipo)} - ${nombre}`.slice(0, 255));
      fd.append('descripcion', `Documento del trámite #${t.id}${t.destino ? ' · Destino: ' + t.destino : ''}`);
      fd.append('alumno_id', String(alumnoId));
      const subido = await documentosApi.upload(fd);
      await tramitesApi.update(t.id, { documento_id: subido.data.data!.id, ...(t.estado === 'solicitado' || t.estado === 'en_proceso' ? { estado: 'listo' as const } : {}) });
      toast.success('Documento adjuntado'); void cargar();
    } catch (e: any) { toast.error(e.response?.data?.message || 'No se pudo subir el documento'); }
    finally { setOcupado(null); archivoPara.current = null; }
  };

  const descargar = async (t: Tramite) => {
    if (!t.documento_id) return;
    try {
      const res = await documentosApi.download(t.documento_id);
      const url = URL.createObjectURL(res.data);
      window.open(url, '_blank'); setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { toast.error('No se pudo abrir el documento'); }
  };

  const generar = async (tipo: TipoConstancia) => {
    if (generando) return;
    setGenerando(true);
    try {
      const record = (await alumnosApi.getExpediente(alumnoId)).data.data!;
      const problema = imprimirConstancia(record, tipo);
      if (problema) toast.error(problema);
    } catch (e: any) { toast.error(e.response?.data?.message || 'No se pudo cargar el expediente'); }
    finally { setGenerando(false); }
  };

  const ayuda = TIPOS_TRAMITE.find(t => t.value === form.tipo)?.ayuda;

  return (
    <section className="card space-y-4" aria-labelledby="tramites-alumno-titulo">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="tramites-alumno-titulo" className="flex items-center gap-2 text-lg font-semibold"><FileCheck className="h-5 w-5 text-primary-600" /> Trámites y certificados</h3>
        <button type="button" className="btn-primary flex items-center gap-2" onClick={() => { setForm(VACIO); setNuevo(true); }}><Plus className="h-4 w-4" /> Nuevo trámite</button>
      </div>

      <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
        <p className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-200">Generar constancia para imprimir</p>
        <div className="flex flex-wrap gap-2">
          {CONSTANCIAS.map(c => <button key={c.value} type="button" disabled={generando} onClick={() => void generar(c.value)} className="btn-secondary flex items-center gap-2 text-sm"><Printer className="h-4 w-4" /> {c.label}</button>)}
        </div>
        <p className="mt-2 text-xs text-gray-500">Se abre en una ventana nueva, donde puedes corregir el texto antes de imprimir. El certificado de estudios oficial se emite en SIAGIE.</p>
      </div>

      <input ref={inputArchivo} type="file" hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void subirArchivo(f); }} />

      {loading ? <div className="h-16 animate-pulse rounded-lg bg-gray-100 dark:bg-gray-800" />
        : error ? <div role="alert" className="text-sm text-red-600">{error} <button className="btn-secondary ml-2" onClick={() => void cargar()}>Reintentar</button></div>
        : !tramites.length ? <p className="py-6 text-center text-sm text-gray-500">Sin trámites registrados. Registra uno cuando el alumno o su familia pidan un traslado, certificado o constancia.</p>
        : <ul className="space-y-3">{tramites.map(t => {
          const estado = ESTADOS_TRAMITE[t.estado]; const siguiente = SIGUIENTE_ESTADO[t.estado]; const abierto = !['entregado', 'anulado'].includes(t.estado);
          return <li key={t.id} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-medium">{tipoTramiteLabel(t.tipo)}</p>
                <p className="text-xs text-gray-500">Pedido el {fechaCorta(t.created_at)}{t.solicitante ? ` por ${t.solicitante}` : ''}{t.entregado_en ? ` · Entregado el ${fechaCorta(t.entregado_en)}` : ''}</p>
              </div>
              <Badge variant={estado.variant}>{estado.label}</Badge>
            </div>
            {t.destino && <p className="mt-2 text-sm"><span className="text-gray-500">Destino:</span> {t.destino}</p>}
            {t.observaciones && <p className="mt-1 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{t.observaciones}</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {t.documento_id && <button type="button" className="btn-secondary flex items-center gap-1 text-sm" onClick={() => void descargar(t)}><Download className="h-4 w-4" /> Ver documento</button>}
              {abierto && <button type="button" disabled={ocupado === t.id} className="btn-secondary flex items-center gap-1 text-sm" onClick={() => { archivoPara.current = t; inputArchivo.current?.click(); }}><Upload className="h-4 w-4" /> {t.documento_id ? 'Reemplazar archivo' : 'Adjuntar archivo'}</button>}
              {siguiente && <button type="button" disabled={ocupado === t.id} className="btn-primary text-sm" onClick={() => void actualizar(t, { estado: siguiente.estado }, ESTADOS_TRAMITE[siguiente.estado].label)}>{siguiente.accion}</button>}
              {abierto && <button type="button" disabled={ocupado === t.id} className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-gray-800" onClick={() => { if (window.confirm('¿Anular este trámite?')) void actualizar(t, { estado: 'anulado' }, 'Trámite anulado'); }}><Ban className="h-4 w-4" /> Anular</button>}
            </div>
          </li>;
        })}</ul>}

      <Modal isOpen={nuevo} onClose={() => { if (!saving) setNuevo(false); }} title="Nuevo trámite" size="md" className="student-dialog">
        <form onSubmit={crear} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">{nombre}</p>
          <div>
            <label htmlFor="tramite-tipo" className="mb-1 block text-sm font-medium">Tipo de trámite *</label>
            <select id="tramite-tipo" className="input-field" value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value as TipoTramite })}>
              {TIPOS_TRAMITE.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {ayuda && <p className="mt-1 text-xs text-gray-500">{ayuda}</p>}
          </div>
          <div>
            <label htmlFor="tramite-solicitante" className="mb-1 block text-sm font-medium">Quién lo pide</label>
            <input id="tramite-solicitante" className="input-field" maxLength={150} placeholder="Ej.: madre, el mismo exalumno" value={form.solicitante} onChange={e => setForm({ ...form, solicitante: e.target.value })} />
          </div>
          <div>
            <label htmlFor="tramite-destino" className="mb-1 block text-sm font-medium">{form.tipo === 'traslado' ? 'Colegio de destino' : 'Para qué institución'}</label>
            <input id="tramite-destino" className="input-field" maxLength={200} placeholder={form.tipo === 'traslado' ? 'Nombre del colegio' : 'Ej.: universidad, instituto'} value={form.destino} onChange={e => setForm({ ...form, destino: e.target.value })} />
          </div>
          <div>
            <label htmlFor="tramite-obs" className="mb-1 block text-sm font-medium">Observaciones{form.tipo === 'otro' ? ' *' : ''}</label>
            <textarea id="tramite-obs" className="input-field" rows={3} maxLength={2000} required={form.tipo === 'otro'} value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} />
          </div>
          <div className="form-actions">
            <button type="button" className="btn-secondary" disabled={saving} onClick={() => setNuevo(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Registrar trámite'}</button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
