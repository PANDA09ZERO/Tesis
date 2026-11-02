import StudentRecordsPanel from './StudentRecordsPanel';
import PageHeading from '../../components/ui/PageHeading';
import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  Archive, Download, Eye, FileText, FileUp, FormInput, Plus, Send, Trash2
} from 'lucide-react';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import { documentosApi } from '../../api/endpoints';
import { useDebounce } from '../../hooks/useDebounce';
import { usePagination } from '../../hooks/usePagination';
import { useAuth } from '../../context/AuthContext';
import type {
  Documento,
  DocumentoCategoria,
  FormularioCampo,
  FormularioCampoTipo,
  FormularioDocumental,
  FormularioEnvio
} from '../../types';
import toast from 'react-hot-toast';

type Section = 'archivos' | 'expedientes' | 'formularios';
type FieldDraft = FormularioCampo & { optionsText?: string };

const FIELD_TYPES: Array<{ value: FormularioCampoTipo; label: string }> = [
  { value: 'texto', label: 'Texto corto' },
  { value: 'parrafo', label: 'Texto largo' },
  { value: 'numero', label: 'Número' },
  { value: 'fecha', label: 'Fecha' },
  { value: 'correo', label: 'Correo electrónico' },
  { value: 'seleccion', label: 'Selección' },
  { value: 'casilla', label: 'Casilla' }
];

function errorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message || 'No se pudo completar la solicitud';
  }
  return error instanceof Error ? error.message : 'No se pudo completar la solicitud';
}

function emptyField(index: number): FieldDraft {
  return {
    id: `campo_${Date.now()}_${index}`,
    etiqueta: '',
    tipo: 'texto',
    requerido: false,
    optionsText: ''
  };
}

function bytesLabel(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('es-PE', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function DocumentosPage() {
  const { user } = useAuth();
  const isAdmin = user?.rol === 'administrador';
  const canUpload = isAdmin || user?.rol === 'profesor';
  const [section, setSection] = useState<Section>('archivos');
  const [documents, setDocuments] = useState<Documento[]>([]);
  const [forms, setForms] = useState<FormularioDocumental[]>([]);
  const [categories, setCategories] = useState<DocumentoCategoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryError, setCategoryError] = useState('');
  const [listError, setListError] = useState('');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { page, totalPages, total, updateFromResponse, setPage } = usePagination();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadStudent, setUploadStudent] = useState<{id: number; name: string} | null>(null);
  const [recordVersion, setRecordVersion] = useState(0);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [showFillModal, setShowFillModal] = useState(false);
  const [showSubmissionsModal, setShowSubmissionsModal] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Documento | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewType, setPreviewType] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [deleteDocumentId, setDeleteDocumentId] = useState<number | null>(null);
  const [uploadData, setUploadData] = useState({ titulo: '', descripcion: '', categoria_id: '', obligatorio: true });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);
  const [editingForm, setEditingForm] = useState<FormularioDocumental | null>(null);
  const [formData, setFormData] = useState({ titulo: '', descripcion: '', categoria_id: '' });
  const [fieldDrafts, setFieldDrafts] = useState<FieldDraft[]>([emptyField(1)]);
  const [savingForm, setSavingForm] = useState(false);
  const [activeForm, setActiveForm] = useState<FormularioDocumental | null>(null);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [sendingAnswers, setSendingAnswers] = useState(false);
  const [submissions, setSubmissions] = useState<FormularioEnvio[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [submissionsPage, setSubmissionsPage] = useState(1);
  const [submissionsTotalPages, setSubmissionsTotalPages] = useState(1);
  const [submissionsTotal, setSubmissionsTotal] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const previewRequestId = useRef(0);

  useEffect(() => {
    return () => {
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (section === 'expedientes') return;
    setLoading(true);
    setListError('');
    const params = {
      page,
      limit: 20,
      search: debouncedSearch,
      ...(categoryFilter ? { categoria_id: Number(categoryFilter) } : {})
    };
    if (section === 'archivos') {
      documentosApi.getAll({ ...params, ...(statusFilter ? { estado: statusFilter } : {}) })
        .then(response => {
          setDocuments(response.data.data || []);
          updateFromResponse(response.data.total || 0, response.data.totalPages || 1);
        })
        .catch(error => {
          setListError(errorMessage(error));
          setDocuments([]);
        })
        .finally(() => setLoading(false));
    } else {
      documentosApi.getFormularios({ ...params, ...(isAdmin && statusFilter ? { estado: statusFilter } : {}) })
        .then(response => {
          setForms(response.data.data || []);
          updateFromResponse(response.data.total || 0, response.data.totalPages || 1);
        })
        .catch(error => {
          setListError(errorMessage(error));
          setForms([]);
        })
        .finally(() => setLoading(false));
    }
  }, [page, debouncedSearch, categoryFilter, statusFilter, section, isAdmin, updateFromResponse]);

  useEffect(() => {
    let active = true;
    documentosApi.getCategorias(isAdmin)
      .then(response => {
        if (active) {
          setCategories(response.data.data || []);
          setCategoryError('');
        }
      })
      .catch(error => {
        if (active) setCategoryError(errorMessage(error));
      });
    return () => { active = false; };
  }, [isAdmin]);

  useEffect(() => {
    setPage(1);
  }, [section, categoryFilter, statusFilter, debouncedSearch, setPage]);

  const refreshCategories = async () => {
    const response = await documentosApi.getCategorias(isAdmin);
    setCategories(response.data.data || []);
    setCategoryError('');
  };

  const refreshList = async () => {
    if (section === 'expedientes') return;
    const params = {
      page,
      limit: 20,
      search: debouncedSearch,
      ...(categoryFilter ? { categoria_id: Number(categoryFilter) } : {})
    };
    if (section === 'archivos') {
      const response = await documentosApi.getAll({ ...params, ...(statusFilter ? { estado: statusFilter } : {}) });
      setDocuments(response.data.data || []);
      updateFromResponse(response.data.total || 0, response.data.totalPages || 1);
    } else {
      const response = await documentosApi.getFormularios({
        ...params,
        ...(isAdmin && statusFilter ? { estado: statusFilter } : {})
      });
      setForms(response.data.data || []);
      updateFromResponse(response.data.total || 0, response.data.totalPages || 1);
    }
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFile) {
      toast.error('Seleccione un archivo');
      return;
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('El archivo supera el límite de 10 MB');
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('archivo', selectedFile);
      if (uploadStudent) body.append('alumno_id', String(uploadStudent.id));
      body.append('titulo', uploadData.titulo);
      body.append('descripcion', uploadData.descripcion);
      body.append('categoria_id', uploadData.categoria_id);
      body.append('obligatorio', String(uploadData.obligatorio));
      await documentosApi.upload(body);
      toast.success('Documento subido');
      setRecordVersion(n => n + 1);
      setUploadStudent(null);
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadData({ titulo: '', descripcion: '', categoria_id: '', obligatorio: true });
      if (fileRef.current) fileRef.current.value = '';
      await refreshList();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: Documento) => {
    try {
      const response = await documentosApi.download(document.id);
      const url = window.URL.createObjectURL(response.data);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = document.titulo;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const handlePreview = async (document: Documento) => {
    const requestId = ++previewRequestId.current;
    setPreviewDocument(document);
    setPreviewUrl('');
    setPreviewType('');
    setLoadingPreview(true);
    try {
      const response = await documentosApi.download(document.id);
      if (requestId !== previewRequestId.current) return;
      setPreviewType(response.data.type);
      setPreviewUrl(window.URL.createObjectURL(response.data));
    } catch (error) {
      if (requestId === previewRequestId.current) {
        setPreviewDocument(null);
        toast.error(errorMessage(error));
      }
    } finally {
      if (requestId === previewRequestId.current) setLoadingPreview(false);
    }
  };

  const closePreview = () => {
    previewRequestId.current += 1;
    setPreviewDocument(null);
    setPreviewUrl('');
    setPreviewType('');
    setLoadingPreview(false);
  };

  const handleDeleteDocument = async () => {
    if (!deleteDocumentId) return;
    try {
      await documentosApi.delete(deleteDocumentId);
      setDeleteDocumentId(null);
      toast.success('Documento archivado');
      await refreshList();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const handleCreateCategory = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingCategory(true);
    try {
      await documentosApi.createCategoria(categoryName);
      setCategoryName('');
      await refreshCategories();
      toast.success('Categoría creada');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingCategory(false);
    }
  };

  const renameCategory = async (category: DocumentoCategoria) => {
    const nombre = window.prompt('Nuevo nombre de la categoría', category.nombre);
    if (nombre === null || nombre.trim() === category.nombre) return;
    try {
      await documentosApi.updateCategoria(category.id, { nombre });
      await refreshCategories();
      toast.success('Categoría actualizada');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const archiveCategory = async (category: DocumentoCategoria) => {
    if (!window.confirm(`¿Archivar la categoría "${category.nombre}"? Los documentos y formularios conservarán su categoría.`)) return;
    try {
      await documentosApi.updateCategoria(category.id, { estado: 'archivada' });
      await refreshCategories();
      toast.success('Categoría archivada');
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const openCreateForm = () => {
    setEditingForm(null);
    setFormData({ titulo: '', descripcion: '', categoria_id: '' });
    setFieldDrafts([emptyField(1)]);
    setShowFormModal(true);
  };

  const openEditForm = async (form: FormularioDocumental) => {
    try {
      const response = await documentosApi.getFormulario(form.id);
      const fullForm = response.data.data!;
      setEditingForm(fullForm);
      setFormData({
        titulo: fullForm.titulo,
        descripcion: fullForm.descripcion || '',
        categoria_id: fullForm.categoria_id ? String(fullForm.categoria_id) : ''
      });
      setFieldDrafts((fullForm.campos || []).map(field => ({
        ...field,
        optionsText: field.opciones?.join('\n') || ''
      })));
      setShowFormModal(true);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const handleSaveForm = async (event: React.FormEvent) => {
    event.preventDefault();
    const fields: FormularioCampo[] = fieldDrafts.map(field => ({
      id: field.id,
      etiqueta: field.etiqueta.trim(),
      tipo: field.tipo,
      requerido: field.requerido,
      ...(field.tipo === 'seleccion'
        ? { opciones: (field.optionsText || '').split('\n').map(option => option.trim()).filter(Boolean) }
        : {}),
      ...(field.tipo === 'numero' && field.minimo !== undefined ? { minimo: field.minimo } : {}),
      ...(field.tipo === 'numero' && field.maximo !== undefined ? { maximo: field.maximo } : {})
    }));
    const payload = {
      titulo: formData.titulo.trim(),
      descripcion: formData.descripcion.trim(),
      categoria_id: formData.categoria_id ? Number(formData.categoria_id) : null,
      campos: fields
    };
    setSavingForm(true);
    try {
      if (editingForm) await documentosApi.updateFormulario(editingForm.id, payload);
      else await documentosApi.createFormulario(payload);
      setShowFormModal(false);
      toast.success(editingForm ? 'Borrador actualizado' : 'Borrador creado');
      await refreshList();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSavingForm(false);
    }
  };

  const publishForm = async (form: FormularioDocumental) => {
    try {
      await documentosApi.updateFormularioEstado(form.id, 'publicada');
      toast.success('Formulario publicado');
      await refreshList();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const archiveForm = async (form: FormularioDocumental) => {
    if (!window.confirm(`¿Archivar el formulario "${form.titulo}"? Ya no aceptará respuestas nuevas.`)) return;
    try {
      await documentosApi.updateFormularioEstado(form.id, 'archivada');
      toast.success('Formulario archivado');
      await refreshList();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const openForm = async (form: FormularioDocumental) => {
    try {
      const response = await documentosApi.getFormulario(form.id);
      setActiveForm(response.data.data!);
      setAnswers({});
      setShowFillModal(true);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const submitForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeForm) return;
    setSendingAnswers(true);
    try {
      await documentosApi.submitFormulario(activeForm.id, answers);
      toast.success('Formulario enviado');
      setShowFillModal(false);
      setActiveForm(null);
      setAnswers({});
      await refreshList();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSendingAnswers(false);
    }
  };

  const openSubmissions = async (form: FormularioDocumental) => {
    setActiveForm(form);
    setSubmissionsPage(1);
    setShowSubmissionsModal(true);
    await loadSubmissions(form, 1);
  };

  const loadSubmissions = async (form: FormularioDocumental, requestedPage: number) => {
    setLoadingSubmissions(true);
    try {
      const response = await documentosApi.getEnviosFormulario(form.id, { page: requestedPage, limit: 20 });
      setSubmissions(response.data.data || []);
      setSubmissionsTotal(response.data.total || 0);
      setSubmissionsTotalPages(response.data.totalPages || 1);
    } catch (error) {
      setSubmissions([]);
      toast.error(errorMessage(error));
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const changeSubmissionsPage = (requestedPage: number) => {
    if (!activeForm || requestedPage < 1 || requestedPage > submissionsTotalPages) return;
    setSubmissionsPage(requestedPage);
    void loadSubmissions(activeForm, requestedPage);
  };

  const documentColumns = [
    {
      key: 'titulo',
      label: 'Archivo',
      render: (document: Documento) => (
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400 shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{document.titulo}</p>
            <p className="text-xs text-gray-500">{bytesLabel(document.tamano_bytes || 0)}</p>
          </div>
        </div>
      )
    },
    {
      key: 'categoria',
      label: 'Categoría',
      render: (document: Documento) => document.categoria ? <Badge variant="info">{document.categoria}</Badge> : '-'
    },
    {
      key: 'tipo_archivo',
      label: 'Tipo',
      render: (document: Documento) => <Badge variant="default">{document.tipo_archivo.toUpperCase()}</Badge>
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (document: Documento) => <Badge variant={document.estado === 'activo' ? 'success' : 'warning'}>{document.estado}</Badge>
    },
    {
      key: 'acciones',
      label: '',
      render: (document: Documento) => (
        <div className="flex gap-1">
          {document.estado !== 'archivado' && (
            <>
              <button
                onClick={event => { event.stopPropagation(); void handlePreview(document); }}
                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                aria-label="Ver archivo"
                title="Ver archivo"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={event => { event.stopPropagation(); void handleDownload(document); }}
                className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                aria-label="Descargar archivo"
                title="Descargar archivo"
              >
                <Download className="w-4 h-4" />
              </button>
            </>
          )}
          {isAdmin && document.estado !== 'archivado' && (
            <button
              onClick={event => { event.stopPropagation(); setDeleteDocumentId(document.id); }}
              className="p-1 text-red-600 hover:bg-red-50 rounded"
              aria-label="Archivar documento"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      )
    }
  ];

  const formColumns = [
    {
      key: 'titulo',
      label: 'Formulario',
      render: (form: FormularioDocumental) => (
        <div className="flex items-center gap-2">
          <FormInput className="w-4 h-4 text-gray-400 shrink-0" />
          <div>
            <p className="font-medium">{form.titulo}</p>
            <p className="text-xs text-gray-500">{form.cantidad_campos || 0} campos</p>
          </div>
        </div>
      )
    },
    {
      key: 'categoria',
      label: 'Categoría',
      render: (form: FormularioDocumental) => form.categoria ? <Badge variant="info">{form.categoria}</Badge> : '-'
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (form: FormularioDocumental) => (
        <Badge variant={form.estado === 'publicada' ? 'success' : form.estado === 'borrador' ? 'warning' : 'default'}>
          {form.estado}
        </Badge>
      )
    },
    {
      key: 'acciones',
      label: '',
      render: (form: FormularioDocumental) => (
        <div className="flex flex-wrap gap-1">
          {form.estado === 'publicada' && (
            <button
              onClick={event => { event.stopPropagation(); void openForm(form); }}
              className="btn-secondary py-1 px-2 text-xs"
            >
              Completar
            </button>
          )}
          {isAdmin && form.estado === 'borrador' && (
            <>
              <button
                onClick={event => { event.stopPropagation(); void openEditForm(form); }}
                className="btn-secondary py-1 px-2 text-xs"
              >
                Editar
              </button>
              <button
                onClick={event => { event.stopPropagation(); void publishForm(form); }}
                className="btn-primary py-1 px-2 text-xs"
              >
                Publicar
              </button>
            </>
          )}
          {isAdmin && form.estado === 'publicada' && (
            <button
              onClick={event => { event.stopPropagation(); void openSubmissions(form); }}
              className="btn-secondary py-1 px-2 text-xs"
            >
              Respuestas ({form.envios_count || 0})
            </button>
          )}
          {isAdmin && form.estado !== 'archivada' && (
            <button
              onClick={event => { event.stopPropagation(); void archiveForm(form); }}
              className="p-1 text-gray-500 hover:bg-gray-100 rounded"
              aria-label="Archivar formulario"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
          {isAdmin && form.estado === 'archivada' && (
            <button
              onClick={event => { event.stopPropagation(); void openSubmissions(form); }}
              className="btn-secondary py-1 px-2 text-xs"
            >
              Ver respuestas
            </button>
          )}
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <PageHeading title="Documentos y expedientes" description="Archivos, trayectoria estudiantil y libretas de notas por grado y periodo."/>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-0 flex-wrap rounded-lg bg-gray-100 p-1">
            <button
              onClick={() => setSection('archivos')}
              className={`px-3 py-1.5 text-sm rounded-md ${section === 'archivos' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-600'}`}
            >
              Archivos
            </button>
            <button
              type="button"
              onClick={() => setSection('expedientes')}
              aria-pressed={section === 'expedientes'}
              className={`px-3 py-1.5 text-sm rounded-md ${section === 'expedientes' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-600'}`}
            >
              Expediente estudiantil
            </button>
            <button
              onClick={() => setSection('formularios')}
              className={`px-3 py-1.5 text-sm rounded-md ${section === 'formularios' ? 'bg-white shadow-sm text-primary-700' : 'text-gray-600'}`}
            >
              Solicitudes
            </button>
          </div>
          {isAdmin && section !== 'expedientes' && (
            <button onClick={() => setShowCategoryModal(true)} className="btn-secondary py-2 text-sm">
              Categorías
            </button>
          )}
        </div>
        {section !== 'expedientes' && <div className="flex flex-wrap items-center gap-2">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar..." className="w-full sm:w-52" />
          <select
            value={categoryFilter}
            onChange={event => setCategoryFilter(event.target.value)}
            className="input-field w-44"
            aria-label="Filtrar por categoría"
          >
            <option value="">Todas las categorías</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.nombre}</option>)}
          </select>
          {isAdmin && (
            <select value={statusFilter} onChange={event => setStatusFilter(event.target.value)} className="input-field w-36">
              <option value="">{section === 'archivos' ? 'No archivados' : 'Todos'}</option>
              {section === 'archivos' ? (
                <>
                  <option value="activo">Activo</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="vencido">Vencido</option>
                  <option value="archivado">Archivado</option>
                </>
              ) : (
                <>
                  <option value="borrador">Borrador</option>
                  <option value="publicada">Publicada</option>
                  <option value="archivada">Archivada</option>
                </>
              )}
            </select>
          )}
          {canUpload && section === 'archivos' && (
            <button onClick={() => { setUploadStudent(null); setShowUploadModal(true); }} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <FileUp className="w-4 h-4" /> Subir archivo
            </button>
          )}
          {isAdmin && section === 'formularios' && (
            <button onClick={openCreateForm} className="btn-primary flex items-center gap-2 whitespace-nowrap">
              <Plus className="w-4 h-4" /> Crear formulario
            </button>
          )}
        </div>}
      </div>

      {section !== 'expedientes' && categoryError && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{categoryError}</div>}
      {section !== 'expedientes' && listError && <div role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{listError}</div>}

      {section === 'expedientes' ? <StudentRecordsPanel version={recordVersion} onUploadDocument={(id, name) => { setUploadStudent({id, name}); setShowUploadModal(true); }}/> : section === 'archivos' ? (
        <DataTable
          columns={documentColumns}
          data={documents}
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          isLoading={loading}
          emptyMessage="No hay archivos para estos filtros"
        />
      ) : (
        <DataTable
          columns={formColumns}
          data={forms}
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          isLoading={loading}
          emptyMessage="No hay formularios para estos filtros"
        />
      )}

      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Subir documento" size="lg">
        <form onSubmit={handleUpload} className="space-y-4">
          {uploadStudent && <p className="rounded-xl bg-gray-100 p-3 text-sm dark:bg-gray-800">Se guardará en el expediente de <strong>{uploadStudent.name}</strong>.</p>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Archivo *</label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
              onChange={event => setSelectedFile(event.target.files?.[0] || null)}
              className="input-field"
              required
            />
            <p className="mt-1 text-xs text-gray-500">PDF, JPG, PNG, GIF, DOC o DOCX. Máximo 10 MB.</p>
            {selectedFile && <p className="text-sm text-gray-600 mt-1">{selectedFile.name} ({bytesLabel(selectedFile.size)})</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              value={uploadData.titulo}
              onChange={event => setUploadData(current => ({ ...current, titulo: event.target.value }))}
              className="input-field"
              maxLength={255}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={uploadData.descripcion}
              onChange={event => setUploadData(current => ({ ...current, descripcion: event.target.value }))}
              className="input-field"
              rows={2}
              maxLength={5000}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría *</label>
            <select
              value={uploadData.categoria_id}
              onChange={event => setUploadData(current => ({ ...current, categoria_id: event.target.value }))}
              className="input-field"
              required
            >
              <option value="">Seleccionar...</option>
              {categories.filter(category => category.estado === 'activa').map(category => (
                <option key={category.id} value={category.id}>{category.nombre}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={uploadData.obligatorio}
              onChange={event => setUploadData(current => ({ ...current, obligatorio: event.target.checked }))}
            />
            Marcar como documento obligatorio
          </label>
          <div className="form-actions">
            <button type="button" onClick={() => setShowUploadModal(false)} className="btn-secondary" disabled={uploading}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={uploading}>
              {uploading ? 'Subiendo...' : 'Subir archivo'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={previewDocument !== null}
        onClose={closePreview}
        title={previewDocument?.titulo || 'Vista previa'}
        size="xl"
      >
        {loadingPreview ? (
          <p className="py-12 text-center text-sm text-gray-500">Cargando archivo...</p>
        ) : previewUrl && previewType === 'application/pdf' ? (
          <iframe
            src={previewUrl}
            title={`Vista previa de ${previewDocument?.titulo || 'documento'}`}
            className="document-preview-frame border"
          />
        ) : previewUrl && previewType.startsWith('image/') ? (
          <div className="flex min-w-0 items-center justify-center">
            <img
              src={previewUrl}
              alt={previewDocument?.titulo || 'Archivo subido'}
              className="document-preview-image"
            />
          </div>
        ) : previewDocument ? (
          <div className="py-8 text-center">
            <FileText className="mx-auto mb-3 h-10 w-10 text-gray-400" />
            <p className="text-sm text-gray-600">
              Este formato no admite vista previa en el navegador. Descarga el archivo para abrirlo.
            </p>
            <button
              type="button"
              onClick={() => void handleDownload(previewDocument)}
              className="btn-primary mt-4 inline-flex items-center gap-2"
            >
              <Download className="h-4 w-4" /> Descargar archivo
            </button>
          </div>
        ) : null}
      </Modal>

      <Modal isOpen={showCategoryModal} onClose={() => setShowCategoryModal(false)} title="Categorías de documentos">
        <form onSubmit={handleCreateCategory} className="flex gap-2 mb-5">
          <input
            value={categoryName}
            onChange={event => setCategoryName(event.target.value)}
            className="input-field"
            placeholder="Nueva categoría"
            maxLength={100}
            required
          />
          <button type="submit" className="btn-primary whitespace-nowrap" disabled={savingCategory}>
            {savingCategory ? 'Guardando...' : 'Crear'}
          </button>
        </form>
        <div className="space-y-2">
          {categories.length === 0 ? (
            <p className="text-sm text-gray-500">No hay categorías. Crea una para clasificar documentos y formularios.</p>
          ) : categories.map(category => (
            <div key={category.id} className="flex items-center justify-between gap-2 border rounded-lg p-3">
              <div>
                <p className="text-sm font-medium">{category.nombre}</p>
                {category.estado === 'archivada' && <p className="text-xs text-gray-500">Archivada</p>}
              </div>
              {category.estado === 'activa' && (
                <div className="flex gap-2">
                  <button onClick={() => void renameCategory(category)} className="btn-secondary py-1 px-2 text-xs">Renombrar</button>
                  <button onClick={() => void archiveCategory(category)} className="p-1 text-gray-500 hover:bg-gray-100 rounded" aria-label="Archivar categoría">
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Modal>

      <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={editingForm ? 'Editar borrador' : 'Crear formulario'} size="xl">
        <form onSubmit={handleSaveForm} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input
              value={formData.titulo}
              onChange={event => setFormData(current => ({ ...current, titulo: event.target.value }))}
              className="input-field"
              maxLength={150}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              value={formData.descripcion}
              onChange={event => setFormData(current => ({ ...current, descripcion: event.target.value }))}
              className="input-field"
              rows={2}
              maxLength={5000}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={formData.categoria_id}
              onChange={event => setFormData(current => ({ ...current, categoria_id: event.target.value }))}
              className="input-field"
            >
              <option value="">Sin categoría</option>
              {categories.filter(category => category.estado === 'activa').map(category => (
                <option key={category.id} value={category.id}>{category.nombre}</option>
              ))}
            </select>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-gray-900">Campos</h3>
              <button
                type="button"
                onClick={() => setFieldDrafts(current => [...current, emptyField(current.length + 1)])}
                disabled={fieldDrafts.length >= 40}
                className="btn-secondary py-1 px-2 text-sm"
              >
                <Plus className="inline w-4 h-4 mr-1" /> Añadir campo
              </button>
            </div>
            {fieldDrafts.map((field, index) => (
              <div key={field.id} className="border rounded-lg p-3 space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <input
                    value={field.etiqueta}
                    onChange={event => setFieldDrafts(current => current.map(item =>
                      item.id === field.id ? { ...item, etiqueta: event.target.value } : item))}
                    className="input-field"
                    placeholder={`Etiqueta del campo ${index + 1}`}
                    maxLength={120}
                    required
                  />
                  <select
                    value={field.tipo}
                    onChange={event => setFieldDrafts(current => current.map(item =>
                      item.id === field.id
                        ? { ...item, tipo: event.target.value as FormularioCampoTipo, opciones: undefined, optionsText: '' }
                        : item))}
                    className="input-field"
                  >
                    {FIELD_TYPES.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
                  </select>
                </div>
                {field.tipo === 'seleccion' && (
                  <textarea
                    value={field.optionsText || ''}
                    onChange={event => setFieldDrafts(current => current.map(item =>
                      item.id === field.id ? { ...item, optionsText: event.target.value } : item))}
                    className="input-field"
                    placeholder="Una opción por línea"
                    rows={3}
                    required
                  />
                )}
                {field.tipo === 'numero' && (
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="number"
                      value={field.minimo ?? ''}
                      onChange={event => setFieldDrafts(current => current.map(item =>
                        item.id === field.id ? { ...item, minimo: event.target.value === '' ? undefined : Number(event.target.value) } : item))}
                      className="input-field"
                      placeholder="Mínimo (opcional)"
                    />
                    <input
                      type="number"
                      value={field.maximo ?? ''}
                      onChange={event => setFieldDrafts(current => current.map(item =>
                        item.id === field.id ? { ...item, maximo: event.target.value === '' ? undefined : Number(event.target.value) } : item))}
                      className="input-field"
                      placeholder="Máximo (opcional)"
                    />
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={field.requerido}
                      onChange={event => setFieldDrafts(current => current.map(item =>
                        item.id === field.id ? { ...item, requerido: event.target.checked } : item))}
                    />
                    Obligatorio
                  </label>
                  {fieldDrafts.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setFieldDrafts(current => current.filter(item => item.id !== field.id))}
                      className="text-sm text-red-600"
                    >
                      Quitar campo
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="form-actions">
            <button type="button" onClick={() => setShowFormModal(false)} className="btn-secondary" disabled={savingForm}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={savingForm}>
              {savingForm ? 'Guardando...' : 'Guardar borrador'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={showFillModal} onClose={() => setShowFillModal(false)} title={activeForm?.titulo || 'Completar formulario'} size="lg">
        {activeForm && (
          <form onSubmit={submitForm} className="space-y-4">
            {activeForm.descripcion && <p className="text-sm text-gray-600">{activeForm.descripcion}</p>}
            {(activeForm.campos || []).map(field => (
              <div key={field.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {field.etiqueta}{field.requerido ? ' *' : ''}
                </label>
                {field.tipo === 'seleccion' ? (
                  <select
                    value={String(answers[field.id] ?? '')}
                    onChange={event => setAnswers(current => ({ ...current, [field.id]: event.target.value }))}
                    className="input-field"
                    required={field.requerido}
                  >
                    <option value="">Seleccionar...</option>
                    {field.opciones?.map(option => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : field.tipo === 'casilla' ? (
                  <input
                    type="checkbox"
                    checked={Boolean(answers[field.id])}
                    onChange={event => setAnswers(current => ({ ...current, [field.id]: event.target.checked }))}
                    required={field.requerido}
                  />
                ) : field.tipo === 'parrafo' ? (
                  <textarea
                    value={String(answers[field.id] ?? '')}
                    onChange={event => setAnswers(current => ({ ...current, [field.id]: event.target.value }))}
                    className="input-field"
                    rows={3}
                    maxLength={5000}
                    required={field.requerido}
                  />
                ) : (
                  <input
                    type={field.tipo === 'texto' ? 'text' : field.tipo === 'correo' ? 'email' : field.tipo}
                    value={String(answers[field.id] ?? '')}
                    onChange={event => setAnswers(current => ({
                      ...current,
                      [field.id]: field.tipo === 'numero' && event.target.value !== ''
                        ? Number(event.target.value)
                        : event.target.value
                    }))}
                    className="input-field"
                    required={field.requerido}
                    min={field.tipo === 'numero' ? field.minimo : undefined}
                    max={field.tipo === 'numero' ? field.maximo : undefined}
                    maxLength={field.tipo === 'texto' ? 500 : undefined}
                  />
                )}
              </div>
            ))}
            <div className="form-actions">
              <button type="button" onClick={() => setShowFillModal(false)} className="btn-secondary" disabled={sendingAnswers}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={sendingAnswers}>
                <Send className="inline w-4 h-4 mr-1" />{sendingAnswers ? 'Enviando...' : 'Enviar respuestas'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      <Modal isOpen={showSubmissionsModal} onClose={() => setShowSubmissionsModal(false)} title={`Respuestas: ${activeForm?.titulo || ''}`} size="xl">
        {loadingSubmissions ? (
          <p className="text-sm text-gray-500">Cargando respuestas...</p>
        ) : submissions.length === 0 ? (
          <p className="text-sm text-gray-500">Aún no hay respuestas.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-gray-500">{submissionsTotal} respuestas</p>
            {submissions.map(submission => (
              <article key={submission.id} className="border rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-3">
                  {submission.usuario_nombre} {submission.usuario_apellido}
                  {submission.alumno_nombre ? ` · ${submission.alumno_nombre} ${submission.alumno_apellido}` : ''}
                  {' · '}{formatDate(submission.created_at)}
                </p>
                <dl className="space-y-2">
                  {(activeForm?.campos || []).map(field => (
                    <div key={field.id} className="grid sm:grid-cols-[12rem_1fr] gap-1 text-sm">
                      <dt className="font-medium text-gray-700">{field.etiqueta}</dt>
                      <dd className="text-gray-600 break-words">
                        {String(submission.respuestas[field.id] ?? '—')}
                      </dd>
                    </div>
                  ))}
                </dl>
              </article>
            ))}
            {submissionsTotalPages > 1 && (
              <div className="flex items-center justify-between border-t pt-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => changeSubmissionsPage(submissionsPage - 1)}
                  disabled={submissionsPage <= 1 || loadingSubmissions}
                >
                  Anterior
                </button>
                <span className="text-sm text-gray-500">Página {submissionsPage} de {submissionsTotalPages}</span>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => changeSubmissionsPage(submissionsPage + 1)}
                  disabled={submissionsPage >= submissionsTotalPages || loadingSubmissions}
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteDocumentId !== null}
        onClose={() => setDeleteDocumentId(null)}
        onConfirm={() => void handleDeleteDocument()}
        title="Archivar documento"
        message="El documento dejará de aparecer en la lista activa. Se conservarán el archivo y su historial."
        confirmLabel="Archivar documento"
      />
    </div>
  );
}
