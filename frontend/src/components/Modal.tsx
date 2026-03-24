import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      dialog.showModal();
    } else {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === dialogRef.current) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <dialog
        ref={dialogRef}
        className="bg-surface-bright/80 backdrop-blur-2xl border border-outline-variant/10 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] max-w-lg w-[90vw] max-h-[85vh] overflow-hidden p-0 m-auto"
      >
        <div className="flex flex-col max-h-[80vh] text-on-surface">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/5">
            <h2 className="text-lg font-headline font-extrabold text-on-surface tracking-tight">{title}</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-surface-container-highest/30 text-on-surface-variant hover:bg-surface-container-highest/50 hover:text-on-surface transition-all duration-300"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
            {children}
          </div>
        </div>
      </dialog>
    </div>
  );
}
