import React from 'react';
import Modal from './Modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  confirmLabel = 'Eliminar', isLoading
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
      <div>
        <div className="mb-5 flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-700" aria-hidden="true" />
          <p className="text-[0.9375rem] text-gray-700">{message}</p>
        </div>
        <div className="form-actions border-0 pt-0">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={isLoading} className="btn-danger">
            {isLoading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
