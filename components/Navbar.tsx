
import React from 'https://esm.sh/react@19.2.3';
import { Menu, Package, Shield, User, LogOut, ShieldCheck, ShieldAlert, UserCheck } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';
import { Role } from '../types.ts';
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';

interface NavbarProps {
  onMenuClick: () => void;
  role: Role;
  setRole: (role: Role) => void;
  userEmail?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, role, userEmail }) => {
  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('kardex_local_session');
    window.location.reload();
  };

  const getRoleIcon = () => {
    switch(role) {
      case 'ADMIN': return <ShieldCheck className="w-3 h-3 text-indigo-600" />;
      case 'USER': return <UserCheck className="w-3 h-3 text-emerald-600" />;
      default: return <ShieldAlert className="w-3 h-3 text-slate-400" />;
    }
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-20 border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={onMenuClick}>
               <Menu className="h-6 w-6 text-slate-500 md:hidden mr-2" />
               <Package className="h-8 w-8 text-indigo-600" />
               <span className="ml-2 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                 Kardex Pro
               </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="flex items-center pl-4">
              <div className="text-right mr-3 hidden sm:block">
                <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{userEmail}</p>
                <div className="flex items-center justify-end gap-1 mt-0.5">
                  {getRoleIcon()}
                  <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest">{role}</p>
                </div>
              </div>
              
              <button 
                onClick={handleLogout}
                className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-slate-100"
                title="Cerrar Sesión"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
