import React from 'react';
import { Sparkles, AlertCircle, Info } from 'lucide-react';
import { ToastInfo } from '../types/kanji';

interface ToastProps {
  toast: ToastInfo | null;
}

export const Toast: React.FC<ToastProps> = ({ toast }) => {
  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300 pointer-events-none">
      <div
        className={`flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl text-sm font-semibold border backdrop-blur-md pointer-events-auto ${
          toast.type === 'success'
            ? 'bg-teal-800 text-white border-teal-700 shadow-teal-950/25'
            : toast.type === 'error'
            ? 'bg-rose-600 text-white border-rose-500 shadow-rose-500/25'
            : 'bg-slate-800 text-white border-slate-700 shadow-slate-900/30'
        }`}
      >
        {toast.type === 'success' && <Sparkles className="w-4 h-4 shrink-0 text-amber-300" />}
        {toast.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
        {toast.type === 'info' && <Info className="w-4 h-4 shrink-0 text-sky-300" />}
        <span>{toast.text}</span>
      </div>
    </div>
  );
};
