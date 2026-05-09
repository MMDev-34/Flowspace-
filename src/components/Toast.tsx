import { X } from 'lucide-react';
import { cn } from '../lib/utils';

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'danger' | 'info';
  undoFn?: () => void;
}

export default function ToastContainer({ toasts, onDismiss }: {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[400] flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg animate-fade-in text-sm font-medium min-w-[280px]',
            toast.type === 'success' && 'bg-green-600 text-white',
            toast.type === 'danger' && 'bg-red-600 text-white',
            toast.type === 'info' && 'bg-zinc-800 text-white',
          )}
        >
          <span className="flex-1">{toast.message}</span>
          {toast.undoFn && (
            <button onClick={toast.undoFn} className="underline text-xs font-bold hover:opacity-80">
              Undo
            </button>
          )}
          <button onClick={() => onDismiss(toast.id)} className="hover:opacity-70">
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}