import { useEffect } from 'react';
import { X, RotateCcw, CheckCircle, AlertCircle, Info } from 'lucide-react';

export interface ToastItem {
  id: string;
  message: string;
  type: 'info' | 'success' | 'danger';
  undoFn?: () => void;
  duration?: number;
}

interface ToastContainerProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

function ToastIcon({ type }: { type: ToastItem['type'] }) {
  if (type === 'success') return <CheckCircle size={14} />;
  if (type === 'danger') return <AlertCircle size={14} />;
  return <Info size={14} />;
}

function Toast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), toast.duration ?? (toast.undoFn ? 5000 : 3000));
    return () => clearTimeout(t);
  }, [toast.id, toast.duration, toast.undoFn, onDismiss]);

  return (
    <div className={`toast toast--${toast.type}`}>
      <span className="toast-icon"><ToastIcon type={toast.type} /></span>
      <span className="toast-msg">{toast.message}</span>
      {toast.undoFn && (
        <button
          className="toast-undo"
          onClick={() => { toast.undoFn?.(); onDismiss(toast.id); }}
        >
          <RotateCcw size={12} /> Undo
        </button>
      )}
      <button className="toast-close" onClick={() => onDismiss(toast.id)}>
        <X size={12} />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;
  return (
    <div className="toast-container">
      {toasts.map(t => <Toast key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  );
}
