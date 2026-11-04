import React, { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export default function Modal({ isOpen, onClose, title, children, size = 'md', className = '' }: ModalProps) {
  const titleId = useId();
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') onCloseRef.current();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    } else {
      document.body.style.overflow = '';
    }
    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-md sm:max-w-md',
    md: 'max-w-lg sm:max-w-lg',
    lg: 'max-w-2xl sm:max-w-2xl',
    xl: 'max-w-4xl sm:max-w-4xl'
  };

  return (
    <div className="app-surface app-modal-overlay fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-gray-900/45 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby={titleId} className={`app-dialog relative flex w-full min-w-0 flex-col rounded-3xl border border-gray-200 bg-white shadow-xl dark:border-gray-700 dark:bg-gray-900 ${sizeClasses[size]} ${className}`}>
        <div className="flex shrink-0 min-w-0 items-center justify-between gap-3 border-b border-gray-200 py-3 pl-5 pr-3 sm:py-4 sm:pl-6 sm:pr-4">
          <h2 id={titleId} className="min-w-0 break-words text-lg font-bold leading-snug text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900"
            aria-label="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {children}
        </div>
      </div>
    </div>
  );
}
