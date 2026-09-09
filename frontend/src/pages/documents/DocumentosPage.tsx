import React, { useEffect, useState, useRef } from 'react';
import { Upload, FileText, Download, Trash2, Eye, Filter } from 'lucide-react';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import SearchInput from '../../components/ui/SearchInput';
import Badge from '../../components/ui/Badge';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import { documentosApi } from '../../api/endpoints';
import { usePagination } from '../../hooks/usePagination';
import { useDebounce } from '../../hooks/useDebounce';
import type { Documento } from '../../types';
import toast from 'react-hot-toast';

const categorias = ['Personal', 'Académico', 'Administrativo', 'Médico', 'Certificado', 'Otro'];

export default function DocumentosPage() {
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const { page, totalPages, total, updateFromResponse, setPage } = usePagination();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [uploadData, setUploadData] = useState({ titulo: '', descripcion: '', categoria: '', obligatorio: false });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { loadData(); }, [page, debouncedSearch, filtroCategoria]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: 20, search: debouncedSearch };
      if (filtroCategoria) params.categoria = filtroCategoria;
      const res = await documentosApi.getAll(params);
      setDocumentos(res.data.data || []);
      updateFromResponse(res.data.total || 0, res.data.totalPages || 1);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) { toast.error('Seleccione un archivo'); return; }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('archivo', selectedFile);
      formData.append('titulo', uploadData.titulo);
      formData.append('descripcion', uploadData.descripcion);
      formData.append('categoria', uploadData.categoria);
      formData.append('obligatorio', uploadData.obligatorio.toString());
      await documentosApi.upload(formData);
      toast.success('Documento subido');
      setShowUploadModal(false);
      setSelectedFile(null);
      setUploadData({ titulo: '', descripcion: '', categoria: '', obligatorio: false });
      loadData();
    } catch (error: any) { toast.error(error.response?.data?.message || 'Error al subir'); }
    finally { setUploading(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try { await documentosApi.delete(deleteId); toast.success('Documento eliminado'); setDeleteId(null); loadData(); }
    catch (error: any) { toast.error(error.response?.data?.message || 'Error'); }
  };

  const columns = [
    { key: 'titulo', label: 'Título', render: (d: Documento) => (
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-gray-400" />
        <span className="font-medium">{d.titulo}</span>
      </div>
    )},
    { key: 'categoria', label: 'Categoría', render: (d: Documento) => d.categoria ? <Badge variant="info">{d.categoria}</Badge> : '-' },
    { key: 'tipo_archivo', label: 'Tipo', render: (d: Documento) => <Badge variant="default">{d.tipo_archivo.toUpperCase()}</Badge> },
    { key: 'estado', label: 'Estado', render: (d: Documento) => (
      <Badge variant={d.estado === 'activo' ? 'success' : d.estado === 'pendiente' ? 'warning' : 'default'}>{d.estado}</Badge>
    )},
    { key: 'obligatorio', label: 'Obligatorio', render: (d: Documento) => d.obligatorio ? <Badge variant="danger">Sí</Badge> : <Badge variant="default">No</Badge> },
    { key: 'acciones', label: '', render: (d: Documento) => (
      <div className="flex gap-1">
        <a href={d.archivo_url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
          className="p-1 text-blue-600 hover:bg-blue-50 rounded"><Eye className="w-4 h-4" /></a>
        <button onClick={(e) => { e.stopPropagation(); setDeleteId(d.id); }}
          className="p-1 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
      </div>
    )}
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <SearchInput value={search} onChange={setSearch} placeholder="Buscar documento..." className="w-full sm:w-64" />
          <select value={filtroCategoria} onChange={e => setFiltroCategoria(e.target.value)} className="input-field w-44">
            <option value="">Todas las categorías</option>
            {categorias.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <button onClick={() => setShowUploadModal(true)} className="btn-primary flex items-center gap-2 whitespace-nowrap">
          <Upload className="w-4 h-4" /> Subir Documento
        </button>
      </div>

      <DataTable columns={columns} data={documentos} page={page} totalPages={totalPages} total={total}
        onPageChange={setPage} isLoading={loading} emptyMessage="No hay documentos" />

      <Modal isOpen={showUploadModal} onClose={() => setShowUploadModal(false)} title="Subir Documento" size="lg">
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Archivo *</label>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx"
              onChange={e => setSelectedFile(e.target.files?.[0] || null)}
              className="input-field file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100" />
            {selectedFile && <p className="text-sm text-gray-500 mt-1">{selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)</p>}
          </div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Título *</label>
            <input type="text" value={uploadData.titulo} onChange={e => setUploadData({...uploadData, titulo: e.target.value})} className="input-field" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea value={uploadData.descripcion} onChange={e => setUploadData({...uploadData, descripcion: e.target.value})} className="input-field" rows={2} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select value={uploadData.categoria} onChange={e => setUploadData({...uploadData, categoria: e.target.value})} className="input-field">
                <option value="">Seleccionar...</option>
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select></div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={uploadData.obligatorio} onChange={e => setUploadData({...uploadData, obligatorio: e.target.checked})} className="rounded" />
                <span className="text-sm text-gray-700">Documento obligatorio</span>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={() => setShowUploadModal(false)} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={uploading || !selectedFile} className="btn-primary disabled:opacity-50">
              {uploading ? 'Subiendo...' : 'Subir'}
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={handleDelete}
        title="Eliminar Documento" message="¿Está seguro de eliminar este documento?" />
    </div>
  );
}