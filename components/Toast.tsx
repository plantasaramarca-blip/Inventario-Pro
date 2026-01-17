
import React from 'react';
import { Notification, NotificationType } from '../contexts/NotificationContext';
import { CheckCircle, AlertCircle, Info, X, AlertTriangle } from 'lucide-react';

interface ToastProps {
  notification: Notification;
  onClose: (id: number) => void;
}

export const Toast: React.FC<ToastProps> = ({ notification, onClose }) => {
  const icons: Record<NotificationType, React.ReactNode> = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
  };
  const colors: Record<NotificationType, string> = {
    success: 'bg-emerald-500',
    error: 'bg-rose-500',
    info: 'bg-indigo-500',
    warning: 'bg-amber-500',
  };

  return (
    <div className={`flex items-center gap-4 w-full max-w-sm p-4 text-white rounded-2xl shadow-2xl ${colors[notification.type]} animate-in slide-in-from-top-10`}>
      <div className="shrink-0">{icons[notification.type]}</div>
      <p className="flex-1 text-xs font-bold uppercase tracking-wider">{notification.message}</p>
      <button onClick={() => onClose(notification.id)} className="p-1 rounded-full hover:bg-white/20">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};