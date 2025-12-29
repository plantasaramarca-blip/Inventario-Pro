
import React, { useState } from 'react';
import { Menu, Package, LogOut, ShieldCheck, ShieldAlert, UserCheck, Loader2 } from 'lucide-react';
import { Role } from '../types.ts';
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { CustomDialog } from './CustomDialog.tsx';

interface NavbarProps {
  onMenuClick: () => void;
  role: Role;
  setRole: (role: Role) => void;
  userEmail?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, role, userEmail }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setShowLogoutConfirm(false);
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
      localStorage.removeItem('kardex_local_session');
      // No hacemos redirect manual para dejar que App.tsx maneje el estado de Auth
    } catch (e) {
      console.error("Error al salir:", e);
      setIsLoggingOut(false);
    }
  };

  const getRoleIcon = () => {
    switch(role) {
      case 'ADMIN': return <ShieldCheck className="w-3 h-3 text-indigo-600" />;
      case 'USER': return <UserCheck className="w-3 h-3 text-emerald-600" />;
      default: return <ShieldAlert className="w-3 h-3 text-slate-400" />;
    }
  };

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-slate-200 shrink-0">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-14 sm:h-16 items-center">
            <div className="flex items-center gap-3">
               <button onClick={onMenuClick} className="p-2 hover:bg-slate-50 rounded-lg md:hidden">
                  <Menu className="h-5 w-5 text-slate-500" />
               </button>
               <div className="flex items-center">
                 <Package className="h-6 w-6 sm:h-7 text-indigo-600" />
                 <span className="ml-2 text-base sm:text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                   Kardex Pro
                 </span>
               </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <div className="hidden sm:block text-right">
                <p className="text-[10px] font-bold text-slate-800 truncate max-w-[120px]">{userEmail}</p>
                <div className="flex items-center justify-end gap-1">
                  {getRoleIcon()}
                  <p className="text-[8px] text-slate-500 uppercase font-black tracking-widest">{role}</p>
                </div>
              </div>
              
              <button 
                onClick={() => setShowLogoutConfirm(true)}
                disabled={isLoggingOut}
                className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
              >
                {isLoggingOut ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogOut className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
      </header>

      <CustomDialog 
        isOpen={showLogoutConfirm}
        title="Seguridad"
        message="¿Seguro que desea cerrar sesión?"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutConfirm(false)}
        confirmText="Cerrar Sesión"
        loading={isLoggingOut}
      />
    </>
  );
};
