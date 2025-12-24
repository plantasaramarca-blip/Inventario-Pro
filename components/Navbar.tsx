
import React from 'react';
import { Menu, Package, Shield, User, LogOut } from 'lucide-react';
import { Role } from '../types';
import { supabase, isSupabaseConfigured } from '../supabaseClient';

interface NavbarProps {
  onMenuClick: () => void;
  role: Role;
  setRole: (role: Role) => void;
  userEmail?: string;
}

export const Navbar: React.FC<NavbarProps> = ({ onMenuClick, role, setRole, userEmail }) => {
  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('kardex_local_session');
    window.location.reload();
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
            <div className="hidden lg:flex items-center bg-slate-100 rounded-lg p-1 mr-4 border border-slate-200">
                <button 
                  onClick={() => setRole('ADMIN')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${role === 'ADMIN' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
                >
                    <Shield className="w-3 h-3 mr-1" /> Admin
                </button>
                <button 
                  onClick={() => setRole('USER')}
                  className={`flex items-center px-3 py-1.5 rounded-md text-xs font-bold transition-all ${role === 'USER' ? 'bg-white shadow text-indigo-700' : 'text-slate-500'}`}
                >
                    <User className="w-3 h-3 mr-1" /> Usuario
                </button>
            </div>

            <div className="flex items-center pl-4 border-l border-slate-200">
              <div className="text-right mr-3 hidden sm:block">
                <p className="text-xs font-bold text-slate-800 truncate max-w-[150px]">{userEmail}</p>
                <p className="text-[10px] text-slate-500 uppercase font-black">{role}</p>
              </div>
              
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
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
