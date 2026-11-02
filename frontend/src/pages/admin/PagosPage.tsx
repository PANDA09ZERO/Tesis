import PageHeading from '../../components/ui/PageHeading';
import { FormEvent, useEffect, useState } from 'react';
import axios from 'axios';
import { mensualidadesApi, pagosMatriculaApi, sueldosApi, profesoresApi, alumnosApi } from '../../api/endpoints';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DataTable from '../../components/ui/DataTable';
import SearchInput from '../../components/ui/SearchInput';
import toast from 'react-hot-toast';
import { usePeriodo } from '../../context/PeriodoContext';

type Tab = 'matriculas' | 'mensualidades' | 'sueldos';
type Pago = { id: number; [key: string]: any };
type Persona = { id: number; nombre: string; apellido: string; codigo_alumno?: string; activo?: number | boolean };
const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const apis = { matriculas: pagosMatriculaApi, mensualidades: mensualidadesApi, sueldos: sueldosApi };
const labels = { matriculas: 'Matrícula', mensualidades: 'Mensualidad', sueldos: 'Pago de profesor' };
const dinero = (v: unknown) => `S/ ${Number(v || 0).toFixed(2)}`;
const hoy = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima' }).format(new Date());
function mensaje(error: unknown) {
  return axios.isAxiosError(error) ? error.response?.data?.message || 'No se pudo conectar con el servidor' : error instanceof Error ? error.message : 'No se pudo completar la operación';
}
async function personas(api: typeof alumnosApi | typeof profesoresApi, params: Record<string, boolean> = {}): Promise<Persona[]> {
  const result: Persona[] = []; let page = 1, pages = 1;
  do { const res = await api.getAll({page, limit:100, ...params}); result.push(...res.data.data); pages = res.data.totalPages; page++; } while (page <= pages);
  return result;
}
export default function PagosPage() {
  const [tab, setTab] = useState<Tab>('matriculas');
  const [data, setData] = useState<Pago[]>([]), [resumen, setResumen] = useState<any[]>([]), [deudas, setDeudas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [listError, setListError] = useState(''), [loadingLists, setLoadingLists] = useState(true);
  const [alumnos, setAlumnos] = useState<Persona[]>([]), [profesores, setProfesores] = useState<Persona[]>([]);
  // Contexto global de periodo académico (vigente por defecto) — reemplaza el filtro local
  const { periodoId: periodo, periodos } = usePeriodo();
  const [search, setSearch] = useState(''), [debouncedSearch, setDebouncedSearch] = useState(''), [estado, setEstado] = useState(''), [mes, setMes] = useState(''), [año, setAño] = useState(hoy().slice(0,4));
  const [page, setPage] = useState(1), [total, setTotal] = useState(0), [pages, setPages] = useState(1), [reload, setReload] = useState(0);
  const [show, setShow] = useState(false), [editing, setEditing] = useState<Pago|null>(null), [saving, setSaving] = useState(false), [formError, setFormError] = useState('');
  const [form, setForm] = useState({persona:'', periodo:'', matricula:'', mensual:'', monto:'', estado:'pendiente', fecha:''});
  const [deleteId, setDeleteId] = useState<number|null>(null), [payment, setPayment] = useState<Pago|null>(null), [paymentDate, setPaymentDate] = useState(hoy());
  const [matriculaOptions, setMatriculaOptions] = useState<{id:number;periodoId:number;periodo:string;grados:string}[]>([]);
  const [loadingMatriculas, setLoadingMatriculas] = useState(false);
  const [matriculaError, setMatriculaError] = useState('');
  useEffect(() => {
    let active = true;
    if (!show || tab !== 'matriculas' || !form.persona) { setMatriculaOptions([]); setMatriculaError(''); setLoadingMatriculas(false); return; }
    setLoadingMatriculas(true); setMatriculaOptions([]); setMatriculaError('');
    alumnosApi.getMatriculas(Number(form.persona)).then(response => {
      if (!active) return;
      const grouped = new Map<number, {id:number;periodoId:number;periodo:string;grados:Set<string>}>();
      for (const m of response.data.data || []) {
        if (!grouped.has(m.periodo_academico_id)) grouped.set(m.periodo_academico_id, {id:m.id,periodoId:m.periodo_academico_id,periodo:m.periodo,grados:new Set()});
        const option = grouped.get(m.periodo_academico_id)!;
        option.id = Math.min(option.id,m.id); if (m.grado) option.grados.add(m.grado);
      }
      const options = [...grouped.values()].map(m=>({...m,grados:[...m.grados].join(', ')}));
      const available = editing ? options.filter(m=>m.periodoId === Number(editing.periodo_academico_id)) : options;
      setMatriculaOptions(available);
      setForm(current=>({...current,matricula:available.length === 1 ? String(available[0].id) : ''}));
      if (!available.length) setMatriculaError('El alumno no tiene una matrícula académica disponible. Registra primero su matrícula.');
    }).catch(e=>{if(active)setMatriculaError(mensaje(e));}).finally(()=>{if(active)setLoadingMatriculas(false);});
    return ()=>{active=false;};
  }, [show,tab,form.persona,editing]);
  const matriculaElegida = matriculaOptions.find(m=>String(m.id) === form.matricula);
  const estados = tab === 'mensualidades' ? ['pendiente','pagado','vencido','descuento'] : tab === 'sueldos' ? ['pendiente','pagado','rechazado'] : ['pendiente','pagado'];
  useEffect(() => {
    let active = true;
    Promise.all([personas(alumnosApi), personas(profesoresApi, {incluir_inactivos:true})]).then(([a,p]) => {
      if (active) { setAlumnos(a); setProfesores(p); }
    }).catch(e => { if (active) setListError(mensaje(e)); }).finally(() => { if (active) setLoadingLists(false); });
    return () => { active = false; };
  }, []);
  useEffect(() => { setPage(1); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [periodo]);
  useEffect(() => { const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); },300); return () => clearTimeout(timer); }, [search]);
  useEffect(() => {
    let active = true;
    const params = { search:debouncedSearch || undefined, estado:estado || undefined,
      ...(tab !== 'sueldos' ? {periodo_academico_id:periodo || undefined} : {}), ...(tab !== 'matriculas' ? {mes:mes || undefined, año} : {}) };
    setLoading(true); setError(''); setData([]); setResumen([]); setDeudas([]);
    Promise.all([apis[tab].getAll({...params,page,limit:15}), apis[tab].getResumen(params),
      tab === 'mensualidades' && (!estado || ['pendiente','vencido'].includes(estado)) ? mensualidadesApi.getAlumnosConDeuda(params) : Promise.resolve(null)
    ]).then(([rows,summary,debt]) => { if (active) { setData(rows.data.data); setTotal(rows.data.total); setPages(Math.max(1,rows.data.totalPages)); setResumen(summary.data.data || []); setDeudas(debt?.data.data || []); } })
      .catch(e => { if (active) setError(mensaje(e)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tab,debouncedSearch,estado,periodo,mes,año,page,reload]);
  function cambiarTab(next:Tab) { setTab(next); setEstado(''); setMes(''); setSearch(''); setDebouncedSearch(''); setPage(1); setShow(false); setPayment(null); setDeleteId(null); }
  function abrir(row:Pago|null = null) {
    setEditing(row); setFormError('');
    setForm({matricula:'', persona:String(row?.profesor_id || row?.alumno_id || ''), periodo:String(row?.periodo_academico_id || periodo || ''),
      mensual:row?.mes ? `${row.año}-${String(meses.indexOf(row.mes)+1).padStart(2,'0')}` : `${año}-${String(meses.indexOf(mes)+1 || Number(hoy().slice(5,7))).padStart(2,'0')}`,
      monto:String(row ? (tab === 'sueldos' ? row.monto_total : row.monto) : ''), estado:row?.estado || 'pendiente', fecha:row?.fecha_pago?.slice(0,10) || ''}); setShow(true);
  }
  async function submit(e:FormEvent) {
    e.preventDefault(); if(saving) return; setFormError('');
    const amount = Number(form.monto), [year,month] = form.mensual.split('-').map(Number);
    if (!form.persona || (tab === 'mensualidades' && !form.periodo)) { setFormError('Seleccione la persona y el periodo académico'); return; }
    if (tab === 'matriculas' && !matriculaElegida) { setFormError('Seleccione una matrícula académica existente'); return; }
    if (!/^\d+(\.\d{1,2})?$/.test(form.monto) || !Number.isFinite(amount) || amount < 0 || amount > 99999999.99) { setFormError('Indique un monto válido con hasta dos decimales'); return; }
    if (tab !== 'matriculas' && (!Number.isInteger(year) || year < 1901 || year > 2155 || !meses[month-1])) { setFormError('Seleccione un mes y año válidos'); return; }
    if (tab !== 'sueldos' && form.estado === 'pagado' && !form.fecha) { setFormError('Indique la fecha de pago'); return; }
    const body = { [tab === 'sueldos' ? 'profesor_id' : 'alumno_id']:Number(form.persona), monto:amount,
      ...(tab !== 'sueldos' ? {estado:form.estado, fecha_pago:form.estado === 'pagado' ? form.fecha : null} : {}),
      ...(tab === 'mensualidades' ? {periodo_academico_id:Number(form.periodo)} : {}),
      ...(tab === 'matriculas' ? {matricula_id:Number(form.matricula)} : {}),
      ...(tab !== 'matriculas' ? {mes:meses[month-1], año:year} : {}) };
    setSaving(true);
    try { if (editing) await apis[tab].update(editing.id,body); else await apis[tab].create(body);
      toast.success(editing ? 'Pago actualizado' : tab === 'sueldos' ? 'Pago de profesor registrado como pagado' : 'Concepto de pago registrado'); setShow(false); setReload(v=>v+1);
    } catch(e) { setFormError(mensaje(e)); } finally { setSaving(false); }
  }
  async function eliminar() {
    if (!deleteId || saving) return; setSaving(true);
    try { await apis[tab].delete(deleteId); toast.success('Pago eliminado'); setDeleteId(null); setPage(1); setReload(v=>v+1); }
    catch(e) { toast.error(mensaje(e)); } finally { setSaving(false); }
  }
  async function pagar(e:FormEvent) {
    e.preventDefault(); if (!payment || !paymentDate || saving) return; setSaving(true); setFormError('');
    try { await apis[tab].update(payment.id,{estado:'pagado',fecha_pago:paymentDate}); toast.success('Pago confirmado'); setPayment(null); setReload(v=>v+1); }
    catch(e) { setFormError(mensaje(e)); } finally { setSaving(false); }
  }
  const sum = (key:string) => resumen.reduce((n,r)=>n+Number(r[key] || 0),0);
  const columns = [
    {key:'persona',label:tab === 'sueldos' ? 'Profesor' : 'Alumno',render:(r:Pago)=>tab === 'sueldos' ? `${r.profesor_nombre} ${r.profesor_apellido}` : `${r.alumno_nombre} ${r.alumno_apellido} (${r.codigo_alumno})`},
    ...(tab !== 'sueldos' ? [{key:'periodo',label:'Periodo académico'}] : []),
    ...(tab !== 'matriculas' ? [{key:'mes',label:'Mes/año',render:(r:Pago)=>`${r.mes} ${r.año}`}] : []),
    {key:'monto',label:'Monto',render:(r:Pago)=>dinero(tab === 'sueldos' ? r.monto_total : r.monto)},
    {key:'estado',label:'Estado',render:(r:Pago)=><Badge variant={r.estado === 'pagado' ? 'success' : r.estado === 'pendiente' ? 'warning' : 'danger'}>{r.estado}</Badge>},
    {key:'fecha_pago',label:'Fecha de pago',render:(r:Pago)=>r.fecha_pago?.slice(0,10) || '—'},
    ...(tab === 'sueldos' ? [{key:'historial',label:'Detalle histórico',render:(r:Pago)=><span className="text-xs text-gray-500">{[r.curso_nombre,`Base histórica: ${dinero(r.salario_base)}`,Number(r.horas_clase) ? `${r.horas_clase} horas` : '',Number(r.monto_extra) ? `Extra: ${dinero(r.monto_extra)}` : '',r.observaciones].filter(Boolean).join(' · ') || '—'}</span>}] : []),
    {key:'actions',label:'Acciones',render:(r:Pago)=><div className="flex flex-wrap gap-2"><button disabled={loadingLists || !!listError} className="text-primary-600" onClick={()=>abrir(r)}>Editar</button>{r.estado !== 'pagado' && <button className="text-green-700" onClick={()=>{setPayment(r);setPaymentDate(hoy());setFormError('');}}>Registrar pago</button>}<button className="text-red-600" onClick={()=>setDeleteId(r.id)}>Eliminar</button></div>}
  ];
  return <div className="space-y-4">
      <PageHeading title="Pagos" description="Consulta matrículas, mensualidades y pagos de profesores por separado."/>
    <div className="card space-y-4"><div className="flex flex-col justify-between gap-3 sm:flex-row"><div className="flex flex-wrap gap-2">{(['matriculas','mensualidades','sueldos'] as Tab[]).map(t=><button key={t} disabled={saving} onClick={()=>cambiarTab(t)} className={tab === t ? 'btn-primary' : 'btn-secondary'}>{t === 'matriculas' ? 'Matrículas' : t === 'mensualidades' ? 'Mensualidades' : 'Pagos de profesores'}</button>)}</div><button disabled={loadingLists || !!listError} className="btn-primary disabled:opacity-50" onClick={()=>abrir()}>{tab === 'sueldos' ? 'Registrar pago' : 'Nuevo concepto'}</button></div>
      <p className="text-sm text-gray-500">{tab === 'matriculas' ? 'Un pago de matrícula por alumno y periodo académico, independiente de los cursos y las mensualidades.' : tab === 'mensualidades' ? 'Una mensualidad por alumno, periodo académico y mes/año.' : 'Profesor, mes/año y monto: el registro confirma el pago con la fecha de hoy.'}</p>
      {loadingLists && <p>Cargando listas…</p>}{listError && <p role="alert" className="text-red-600">No se pudieron cargar las listas: {listError}. Recarga para reintentar.</p>}
      <div className="flex flex-col flex-wrap gap-3 sm:flex-row"><SearchInput value={search} onChange={setSearch} placeholder={tab === 'sueldos' ? 'Buscar profesor…' : 'Buscar alumno…'} />
        <select aria-label="Estado" className="input-field sm:w-auto" value={estado} onChange={e=>{setEstado(e.target.value);setPage(1);}}><option value="">Todos los estados</option>{estados.map(s=><option key={s}>{s}</option>)}</select>
        {tab !== 'matriculas' && <><select aria-label="Mes" className="input-field sm:w-auto" value={mes} onChange={e=>{setMes(e.target.value);setPage(1);}}><option value="">Todos los meses</option>{meses.map(m=><option key={m}>{m}</option>)}</select><input aria-label="Año" type="number" min="1901" max="2155" className="input-field sm:w-28" value={año} onChange={e=>{setAño(e.target.value);setPage(1);}} /></>}
      </div>
    </div>
    {error ? <div role="alert" className="card text-red-600">{error}<button className="btn-secondary ml-3" onClick={()=>setReload(v=>v+1)}>Reintentar</button></div> : <>
      <section className="card"><h3 className="mb-3 font-semibold">Resumen de {labels[tab].toLowerCase()} — filtros actuales</h3>{loading ? <p>Cargando resumen…</p> : <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{[['Importe registrado',dinero(sum('total_mes'))],[`Pagado (${sum('pagados')})`,dinero(sum('total_pagado'))],[`Pendiente o vencido (${sum('pendientes')})`,dinero(sum('total_pendiente'))]].map(([k,v])=><div key={k} className="rounded-lg bg-gray-50 p-3"><p className="text-sm text-gray-500">{k}</p><p className="text-lg font-bold">{v}</p></div>)}</div>}</section>
      {tab === 'mensualidades' && !loading && <section className="card"><h3 className="mb-3 font-semibold">Alumnos con mensualidades pendientes o vencidas</h3>{deudas.length ? <div className="space-y-2">{deudas.map(a=><div key={a.alumno_id} className="flex flex-wrap justify-between gap-2 rounded-lg bg-gray-50 p-3"><span>{a.alumno_nombre} {a.alumno_apellido} ({a.codigo_alumno})</span><span>{a.mensualidades_pendientes} mensualidades · {dinero(a.total_deuda)}</span></div>)}</div> : <p className="text-gray-500">Sin deudas para los filtros actuales.</p>}</section>}
      <DataTable columns={columns} data={data} isLoading={loading} page={page} total={total} totalPages={pages} onPageChange={setPage} emptyMessage="No hay pagos para los filtros actuales" />
    </>}
    <Modal isOpen={show} onClose={()=>{if(!saving)setShow(false);}} title={`${editing ? 'Editar' : 'Registrar'} ${labels[tab].toLowerCase()}`} size="md"><form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium">{tab === 'sueldos' ? 'Profesor' : 'Alumno'}<select required className="input-field mt-1" value={form.persona} disabled={tab === 'matriculas' && !!editing} onChange={e=>setForm({...form,persona:e.target.value,matricula:'',...(tab === 'matriculas' ? {periodo:''} : {})})}><option value="">Seleccionar…</option>{(tab === 'sueldos' ? profesores : alumnos).map(p=><option key={p.id} value={p.id}>{p.nombre} {p.apellido}{p.codigo_alumno ? ` (${p.codigo_alumno})` : ''}{tab === 'sueldos' && p.activo === 0 ? ' (inactivo)' : ''}</option>)}</select></label>
      {tab === 'mensualidades' && <label className="block text-sm font-medium">Periodo académico<select required className="input-field mt-1" value={form.periodo} onChange={e=>setForm({...form,periodo:e.target.value})}><option value="">Seleccionar…</option>{periodos.map(p=><option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>}
      {tab === 'matriculas' && <div className="space-y-2">
        <label className="block text-sm font-medium">Matrícula académica<select required disabled={loadingMatriculas || !form.persona || !!editing} className="input-field mt-1" value={form.matricula} onChange={e=>setForm({...form,matricula:e.target.value})}><option value="">Seleccionar matrícula…</option>{matriculaOptions.map(m=><option key={m.periodoId} value={m.id}>{m.periodo} · {m.grados || 'Sin grado registrado'}</option>)}</select></label>
        {loadingMatriculas && <p className="text-sm text-gray-500">Cargando matrículas…</p>}
        {matriculaError && <p role="alert" className="text-red-600">{matriculaError}</p>}
        {matriculaElegida && <p className="text-sm text-gray-600">Periodo: {matriculaElegida.periodo}. Grado: {matriculaElegida.grados || 'Sin grado registrado'}. Un pago por alumno y periodo, independiente del número de cursos.</p>}
      </div>}
      {tab !== 'matriculas' && <label className="block text-sm font-medium">Mes y año<input required type="month" min="1901-01" max="2155-12" className="input-field mt-1" value={form.mensual} onChange={e=>setForm({...form,mensual:e.target.value})} /></label>}
      <label className="block text-sm font-medium">Monto (S/)<input required type="number" min="0" max="99999999.99" step="0.01" className="input-field mt-1" value={form.monto} onChange={e=>setForm({...form,monto:e.target.value})} /></label>
      {tab !== 'sueldos' && <><label className="block text-sm font-medium">Estado<select className="input-field mt-1" value={form.estado} onChange={e=>setForm({...form,estado:e.target.value,fecha:e.target.value === 'pagado' ? form.fecha || hoy() : ''})}>{estados.map(s=><option key={s}>{s}</option>)}</select></label>{form.estado === 'pagado' && <label className="block text-sm font-medium">Fecha de pago<input required type="date" className="input-field mt-1" value={form.fecha} onChange={e=>setForm({...form,fecha:e.target.value})} /></label>}</>}
      {tab === 'sueldos' && <p className="text-sm text-gray-500">{editing ? `Estado: ${editing.estado}. Fecha: ${editing.fecha_pago?.slice(0,10) || 'sin pago registrado'}.` : 'Se registrará como pagado con la fecha de hoy.'}</p>}
      {formError && <p role="alert" className="text-red-600">{formError}</p>}<div className="flex justify-end gap-3"><button type="button" disabled={saving} className="btn-secondary" onClick={()=>setShow(false)}>Cancelar</button><button disabled={saving || loadingLists || !!listError || (tab === 'matriculas' && (loadingMatriculas || !!matriculaError))} className="btn-primary">{saving ? 'Guardando…' : 'Guardar'}</button></div>
    </form></Modal>
    <Modal isOpen={!!payment} onClose={()=>{if(!saving)setPayment(null);}} title="Confirmar pago realizado" size="sm"><form onSubmit={pagar} className="space-y-4"><p>{labels[tab]}: {dinero(tab === 'sueldos' ? payment?.monto_total : payment?.monto)}</p><label className="block text-sm font-medium">Fecha de pago<input required type="date" className="input-field mt-1" value={paymentDate} onChange={e=>setPaymentDate(e.target.value)} /></label>{formError && <p role="alert" className="text-red-600">{formError}</p>}<button disabled={saving} className="btn-primary">{saving ? 'Registrando…' : 'Confirmar pago'}</button></form></Modal>
    <ConfirmDialog isOpen={!!deleteId} onClose={()=>{if(!saving)setDeleteId(null);}} onConfirm={eliminar} isLoading={saving} title="Eliminar pago" message="¿Eliminar este registro de pago?" />
  </div>;
}
