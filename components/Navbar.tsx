
import React, { useState } from 'react';
import { Menu, Package, LogOut, ShieldCheck, UserCheck, Loader2 } from 'lucide-react';
import { Role } from '../types';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { CustomDialog } from './CustomDialog';

interface NavbarProps {
  onMenuClick: () => void;
  role: Role;
  userEmail?: string;
  onLogout: () => Promise<void>;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, role, userEmail, onLogout }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await onLogout();
    // No reload needed, App component will handle re-render
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20 h-12 flex items-center shrink-0">
      <div className="w-full px-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button onClick={onMenuClick} className="p-1.5 hover:bg-slate-50 rounded-lg md:hidden"><Menu className="h-4 w-4 text-slate-500" /></button>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-indigo-600" />
            <span className="text-sm font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">Kardex Pro</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-[9px] font-bold text-slate-800 truncate max-w-[120px]">{userEmail}</p>
            <div className="flex items-center justify-end gap-1">
              {role === 'ADMIN' ? <ShieldCheck className="w-2 h-2 text-indigo-600" /> : <UserCheck className="w-2 h-2 text-emerald-600" />}
              <p className="text-[7px] text-slate-400 uppercase font-black tracking-widest">{role}</p>
            </div>
          </div>
          <button onClick={() => setShowConfirm(true)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors"><LogOut className="h-4 w-4" /></button>
        </div>
      </div>
      <CustomDialog
        isOpen={showConfirm}
        title="Seguridad"
        message="¿Cerrar sesión?"
        onConfirm={handleLogout}
        onCancel={() => setShowConfirm(false)}
        loading={isLoggingOut}
        type="error"
        confirmText="Cerrar Sesión"
      />
    </header>
  );
};