
import React from 'https://esm.sh/react@19.2.3';
import { X, AlertCircle, CheckCircle, HelpCircle, Loader2 } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

interface CustomDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  type?: 'confirm' | 'alert' | 'success' | 'error';
  onConfirm?: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

export const CustomDialog: React.FC<CustomDialogProps> = ({
  isOpen, title, message, type = 'confirm', 
  onConfirm, onCancel, confirmText = 'Aceptar', 
  cancelText = 'Cancelar', loading = false
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="w-12 h-12 text-emerald-500" />;
      case 'error': return <AlertCircle className="w-12 h-12 text-rose-500" />;
      case 'alert': return <AlertCircle className="w-12 h-12 text-amber-500" />;
      default: return <HelpCircle className="w-12 h-12 text-indigo-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300" onClick={type === 'alert' || type === 'success' || type === 'error' ? onCancel : undefined}></div>
      <div className="relative bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="p-10 text-center space-y-6">
          <div className="flex justify-center">{getIcon()}</div>
          <div>
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.3em] mb-2">{title}</h3>
            <p className="text-base font-bold text-slate-800 leading-tight uppercase">{message}</p>
          </div>
          
          <div className="flex flex-col gap-2 pt-4">
            {type === 'confirm' && (
              <button 
                onClick={onConfirm}
                disabled={loading}
                className="w-full py-4 bg-indigo-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : confirmText}
              </button>
            )}
            <button 
              onClick={onCancel}
              className={`w-full py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 ${
                type === 'confirm' ? 'text-slate-400 hover:bg-slate-50' : 'bg-slate-900 text-white shadow-xl'
              }`}
            >
              {type === 'confirm' ? cancelText : 'Cerrar'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
