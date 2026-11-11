import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, Edit, Trash2, UserPlus } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import DniLookupField from '../../components/ui/DniLookupField';
import SearchInput from '../../components/ui/SearchInput';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { DirectoryHeader, PersonCard } from '../../components/ui/PeopleDirectory';
import { apoderadosApi, alumnosApi } from '../../api/endpoints';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import toast from 'react-hot-toast';
import CreatedCredentialsModal from '../../components/ui/CreatedCredentialsModal';
import type { CreatedAccountCredentials } from '../../types';
const EMPTY = { nombre: '', apellido: '', email: '', password: '', dni: '', telefono: '', direccion: '', fecha_nacimiento: '', genero: 'M', ocupacion: '' };
const message = (e: any) => e.response?.data?.message || e.message || 'No se pudo completar la solicitud';
export default function ApoderadosPage() {
  const [apoderados, setApoderados] = useState<any[]>([]), [loading, setLoading] = useState(true), [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState(''); const debouncedSearch = useDebounce(search);
  const { page, totalPages, total, updateFromResponse, setPage } = usePagination();
  const sequence = useRef(0), detailSequence = useRef(0);
  const [showModal, setShowModal] = useState(false), [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState(EMPTY), [formError, setFormError] = useState(''), [saving, setSaving] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<CreatedAccountCredentials | null>(null);
  const [detailLoading, setDetailLoading] = useState(false), [detailError, setDetailError] = useState('');
  const [deleteId, setDeleteId] = useState<number | null>(null), [deleting, setDeleting] = useState(false);
  const [selectedApoderado, setSelectedApoderado] = useState<any>(null), [assignData, setAssignData] = useState({ alumno_id: '', parentesco: 'Padre/Madre' });
  const [assigned, setAssigned] = useState<any[]>([]), [linksLoading, setLinksLoading] = useState(false), [linksError, setLinksError] = useState(''), [linksAttempt,setLinksAttempt] = useState(0);
  const [students, setStudents] = useState<any[]>([]), [studentsLoading,setStudentsLoading] = useState(false), [studentsError,setStudentsError] = useState('');
  const [studentSearch,setStudentSearch] = useState(''), [studentPage,setStudentPage] = useState(1), [studentPages,setStudentPages] = useState(1), [studentAttempt,setStudentAttempt] = useState(0);
  const debouncedStudent = useDebounce(studentSearch);
  const [assigning,setAssigning] = useState(false), [assignError,setAssignError] = useState('');
  useEffect(()=>{ void loadData(); return()=>{sequence.current++;}; },[page,debouncedSearch]);
  useEffect(()=>()=>{detailSequence.current++;},[]);
  async function loadData() {
    const request = ++sequence.current; setLoading(true); setLoadError(''); setApoderados([]);
    try { const response = await apoderadosApi.getAll({ page, limit: 20, search: debouncedSearch });
      if(request !== sequence.current)return;
      if(!Array.isArray(response.data.data))throw Error('Respuesta inválida del listado de apoderados');
      setApoderados(response.data.data); updateFromResponse(response.data.total || 0,response.data.totalPages || 1);
    } catch(e) { if(request===sequence.current)setLoadError(message(e)); } finally { if(request===sequence.current)setLoading(false); }
  }
  async function openEdit(person:any) {
    const request=++detailSequence.current;setEditing(person);setShowModal(true);setFormError('');setDetailError('');setDetailLoading(true);
    try { const response=await apoderadosApi.getById(person.id);if(request!==detailSequence.current)return;const full=response.data.data;
      if(!full)throw Error('No se pudo obtener el perfil completo');
      setFormData({...EMPTY,...Object.fromEntries(Object.keys(EMPTY).map(key=>[key,full[key]??EMPTY[key as keyof typeof EMPTY]])),password:'',fecha_nacimiento:full.fecha_nacimiento?.slice(0,10)||''});
    } catch(e) { if(request===detailSequence.current)setDetailError(message(e)); } finally {if(request===detailSequence.current)setDetailLoading(false);}
  }
  const closeForm=()=>{if(saving)return;detailSequence.current++;setShowModal(false);setEditing(null);setFormData(EMPTY);setFormError('');setDetailError('');};
  async function handleSubmit(event:FormEvent) {
    event.preventDefault();if(saving||detailLoading||detailError)return;setFormError('');
    if(!editing && new TextEncoder().encode(formData.password).length>72){setFormError('La contraseña no puede superar 72 bytes');return;}
    setSaving(true);
    try {if(editing)await apoderadosApi.update(editing.id,{ocupacion:formData.ocupacion,telefono:formData.telefono,direccion:formData.direccion,fecha_nacimiento:formData.fecha_nacimiento,genero:formData.genero});
      else {
        const { email: _email, password: _password, ...guardian } = formData;
        const response = await apoderadosApi.create({...guardian,dni:formData.dni.trim()||null});
        setCreatedCredentials(response.data.data?.credentials || null);
      }
      toast.success(editing?'Apoderado actualizado':'Apoderado registrado');setShowModal(false);setEditing(null);setFormData(EMPTY);void loadData();
    }catch(e){setFormError(message(e));}finally{setSaving(false);}
  }
  useEffect(()=>{
    if(!selectedApoderado)return;let active=true;setLinksLoading(true);setLinksError('');setAssigned([]);
    apoderadosApi.getAlumnos(selectedApoderado.id).then(r=>{if(active)setAssigned(r.data.data||[]);}).catch(e=>{if(active)setLinksError(message(e));}).finally(()=>{if(active)setLinksLoading(false);});
    return()=>{active=false;};
  },[selectedApoderado,linksAttempt]);
  useEffect(()=>{
    if(!selectedApoderado)return;let active=true;setStudentsLoading(true);setStudentsError('');setStudents([]);setAssignData(d=>({...d,alumno_id:''}));
    alumnosApi.getAll({page:studentPage,limit:20,search:debouncedStudent}).then(r=>{if(active){setStudents(r.data.data||[]);setStudentPages(r.data.totalPages||1);}}).catch(e=>{if(active)setStudentsError(message(e));}).finally(()=>{if(active)setStudentsLoading(false);});
    return()=>{active=false;};
  },[selectedApoderado,studentPage,debouncedStudent,studentAttempt]);
  function openAssign(person:any) {setSelectedApoderado(person);setAssignData({alumno_id:'',parentesco:'Padre/Madre'});setAssignError('');setStudentSearch('');setStudentPage(1);}
  async function handleAssign(event:FormEvent) {
    event.preventDefault();if(assigning||studentsLoading||linksLoading||studentsError||linksError||!selectedApoderado)return;
    if(!students.some(s=>String(s.id)===assignData.alumno_id)||assigned.some(s=>String(s.id)===assignData.alumno_id)){setAssignError('Selecciona un alumno sin vínculo con este apoderado');return;}
    setAssigning(true);setAssignError('');
    try {await apoderadosApi.asignarAlumno(selectedApoderado.id,assignData);toast.success('Alumno asignado exitosamente');setAssignData(d=>({...d,alumno_id:''}));setLinksAttempt(n=>n+1);void loadData();}
    catch(e){setAssignError(message(e));}finally{setAssigning(false);}
  }
  async function handleDelete(){if(!deleteId||deleting)return;setDeleting(true);try{await apoderadosApi.delete(deleteId);toast.success('Apoderado eliminado');setDeleteId(null);void loadData();}catch(e){toast.error(message(e));}finally{setDeleting(false);}}
  const actions=(a:any)=><div className="person-actions flex flex-wrap gap-1"><button type="button" className="inline-flex items-center gap-2 rounded-lg px-2 text-sm text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label={`Editar apoderado ${a.nombre} ${a.apellido}`} onClick={()=>void openEdit(a)}><Edit className="h-4 w-4"/>Editar</button><button type="button" className="inline-flex items-center gap-2 rounded-lg px-2 text-sm text-primary-700 hover:bg-primary-50 dark:hover:bg-gray-800" aria-label={`Vincular alumnos a ${a.nombre} ${a.apellido}`} onClick={()=>openAssign(a)}><UserPlus className="h-4 w-4"/>Alumnos</button><button type="button" className="rounded-lg px-2 text-red-600 dark:text-red-400" aria-label={`Eliminar apoderado ${a.nombre} ${a.apellido}`} onClick={()=>setDeleteId(a.id)}><Trash2 className="h-4 w-4"/></button></div>;
  const columns=[{key:'nombre',label:'Nombre',render:(a:any)=>`${a.nombre} ${a.apellido}`},{key:'alumnos_vinculados',label:'Alumnos a cargo',summary:true,render:(a:any)=>a.alumnos_vinculados||'Sin alumnos vinculados'},{key:'email',label:'Email'},{key:'telefono',label:'Teléfono',render:(a:any)=>a.telefono||'Sin registrar'},{key:'ocupacion',label:'Ocupación',render:(a:any)=>a.ocupacion||'Sin registrar'},{key:'activo',label:'Estado',render:(a:any)=><Badge variant={a.activo?'success':'danger'}>{a.activo?'Activo':'Inactivo'}</Badge>},{key:'acciones',label:'',render:actions}];
  const fields:Array<[keyof typeof EMPTY,string,string,number?]>=[['nombre','Nombre','text',100],['apellido','Apellido','text',100],['email','Email','email',255],['dni','DNI','text',20],['telefono','Teléfono','tel',20],['ocupacion','Ocupación','text',100],['direccion','Dirección','text',500],['fecha_nacimiento','Fecha Nacimiento','date']];
  return <div className="people-directory mx-auto max-w-7xl space-y-5">
    <DirectoryHeader title="Apoderados" description="Gestiona sus perfiles y los vínculos con los alumnos." total={total} loading={loading} error={loadError} refresh={()=>void loadData()}><button type="button" className="btn-primary gap-2" onClick={()=>{setEditing(null);setFormData(EMPTY);setFormError('');setDetailError('');setDetailLoading(false);setShowModal(true);}}><Plus className="h-4 w-4"/>Nuevo Apoderado</button></DirectoryHeader>
    <section className="card"><p className="mb-2 text-sm font-medium">Buscar apoderados</p><SearchInput value={search} onChange={v=>{setSearch(v);setPage(1);}} placeholder="Buscar apoderado o alumno..."/></section>
    {loadError?<div role="alert" className="card text-red-600 dark:text-red-400"><p>{loadError}</p><button className="btn-secondary mt-3" onClick={()=>void loadData()}>Reintentar</button></div>:<DataTable className="people-table" columns={columns} data={apoderados} page={page} totalPages={totalPages} total={total} onPageChange={setPage} isLoading={loading} emptyMessage="No se encontraron apoderados" renderMobileCard={a=><PersonCard name={`${a.nombre} ${a.apellido}`} email={a.email} active={a.activo} fields={[['Alumnos a cargo',a.alumnos_vinculados||'Sin alumnos vinculados'],['Teléfono',a.telefono],['Ocupación',a.ocupacion]]} actions={actions(a)}/>}/>}
    <Modal className="people-dialog" isOpen={showModal} onClose={closeForm} title={editing?'Editar Apoderado':'Registrar Apoderado'} size="lg">
      {detailLoading?<p role="status">Cargando perfil completo…</p>:detailError?<div role="alert"><p>{detailError}</p><button className="btn-secondary mt-3" onClick={()=>void openEdit(editing)}>Reintentar perfil</button></div>:<form onSubmit={handleSubmit} className="space-y-4">
        <fieldset disabled={saving} className="min-w-0 space-y-4">
          {editing&&<p className="text-sm text-gray-500">Nombre, apellido, correo y DNI son de consulta aquí. Las correcciones se gestionan en Usuarios. Los campos personales vacíos conservan el valor anterior según el backend.</p>}
          <div className="grid gap-4 sm:grid-cols-2">{!editing&&<DniLookupField id="guardian-dni-lookup" value={formData.dni} onChange={dni=>setFormData(f=>({...f,dni}))} onFound={p=>setFormData(f=>({...f,nombre:p.nombre,apellido:p.apellido}))}/>}{fields.filter(([key])=>editing||(key!=='email'&&key!=='dni')).map(([key,label,type,max])=><label key={key} className="block text-sm font-medium">{label}{['nombre','apellido'].includes(key)||editing&&key==='email'?' *':''}<input aria-label={label} className="input-field mt-1" type={type} value={formData[key]} maxLength={max} readOnly={!!editing&&['nombre','apellido','email','dni'].includes(key)} required={['nombre','apellido'].includes(key)||!!editing&&key==='email'} onChange={e=>setFormData(d=>({...d,[key]:e.target.value}))}/></label>)}<label className="block text-sm font-medium">Género<select aria-label="Género" className="input-field mt-1" value={formData.genero} onChange={e=>setFormData(d=>({...d,genero:e.target.value}))}><option value="M">Masculino</option><option value="F">Femenino</option><option value="Otro">Otro</option></select></label></div>
          {!editing&&<p className="rounded-lg bg-blue-50 p-3 text-sm text-blue-900 dark:bg-blue-950 dark:text-blue-100">El usuario institucional y la contraseña temporal se generarán al registrar la cuenta. No se crea un buzón de correo.</p>}
        </fieldset>
        {formError&&<p role="alert" className="text-sm text-red-600 dark:text-red-400">{formError}</p>}
        <div className="form-actions"><button type="button" className="btn-secondary" onClick={closeForm} disabled={saving}>Cancelar</button><button type="submit" className="btn-primary" disabled={saving}>{saving?'Guardando…':editing?'Actualizar':'Registrar'}</button></div>
      </form>}
    </Modal>
    <CreatedCredentialsModal credentials={createdCredentials} onClose={()=>setCreatedCredentials(null)} />
    <Modal className="people-dialog" isOpen={!!selectedApoderado} onClose={()=>{if(!assigning)setSelectedApoderado(null);}} title="Asignar Alumno" size="lg">
      <p className="mb-4 font-semibold">{selectedApoderado?.nombre} {selectedApoderado?.apellido}</p>
      <section aria-label="Alumnos vinculados" className="mb-5 rounded-xl border border-gray-200 p-3"><h3 className="mb-2 font-medium">Alumnos vinculados</h3>{linksLoading?<p role="status">Consultando vínculos…</p>:linksError?<div role="alert"><p>{linksError}</p><button className="btn-secondary mt-2" onClick={()=>setLinksAttempt(n=>n+1)}>Reintentar vínculos</button></div>:assigned.length?assigned.map(a=><p key={a.id} className="mb-2 break-words text-sm">{a.nombre} {a.apellido} · {a.codigo_alumno} · {a.parentesco}</p>):<p className="text-sm text-gray-500">Sin alumnos vinculados.</p>}</section>
      <form onSubmit={handleAssign} className="space-y-4"><fieldset disabled={assigning} className="min-w-0 space-y-4">
        <label className="block text-sm font-medium">Buscar alumno<input className="input-field mt-1" type="search" value={studentSearch} onChange={e=>{setStudentSearch(e.target.value);setStudentPage(1);setAssignData(d=>({...d,alumno_id:''}));}} placeholder="Nombre, apellido o código"/></label>
        {studentsLoading?<p role="status">Buscando alumnos…</p>:studentsError?<div role="alert"><p>{studentsError}</p><button type="button" className="btn-secondary mt-2" onClick={()=>setStudentAttempt(n=>n+1)}>Reintentar alumnos</button></div>:<><label className="block text-sm font-medium">Alumno *<select aria-label="Alumno" required className="input-field mt-1" value={assignData.alumno_id} onChange={e=>setAssignData(d=>({...d,alumno_id:e.target.value}))}><option value="">Seleccionar alumno…</option>{students.filter(s=>!assigned.some(a=>a.id===s.id)).map(s=><option key={s.id} value={s.id}>{s.nombre} {s.apellido} ({s.codigo_alumno})</option>)}</select></label>{!students.length&&<p className="text-sm text-gray-500">No hay alumnos para esta búsqueda.</p>}{studentPages>1&&<div className="flex flex-wrap items-center gap-2"><button type="button" className="btn-secondary" disabled={studentPage===1} onClick={()=>setStudentPage(n=>n-1)}>Anteriores</button><span className="text-sm">Página {studentPage} de {studentPages}</span><button type="button" className="btn-secondary" disabled={studentPage>=studentPages} onClick={()=>setStudentPage(n=>n+1)}>Siguientes</button></div>}</>}
        <label className="block text-sm font-medium">Parentesco<select aria-label="Parentesco" className="input-field mt-1" value={assignData.parentesco} onChange={e=>setAssignData(d=>({...d,parentesco:e.target.value}))}>{['Padre/Madre','Tutor','Abuelo/a','Otro'].map(v=><option key={v}>{v}</option>)}</select></label>
      </fieldset>{assignError&&<p role="alert" className="text-sm text-red-600 dark:text-red-400">{assignError}</p>}<div className="form-actions"><button type="button" className="btn-secondary" disabled={assigning} onClick={()=>setSelectedApoderado(null)}>Cerrar</button><button type="submit" className="btn-primary" disabled={assigning||studentsLoading||linksLoading||!!studentsError||!!linksError||!assignData.alumno_id}>{assigning?'Asignando…':'Asignar'}</button></div></form>
    </Modal>
    <ConfirmDialog isOpen={deleteId!==null} onClose={()=>{if(!deleting)setDeleteId(null);}} onConfirm={()=>void handleDelete()} isLoading={deleting} title="Eliminar Apoderado" message="¿Está seguro de eliminar este apoderado? Esta acción no se puede deshacer."/>
  </div>;
}
