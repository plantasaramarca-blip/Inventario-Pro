
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Boxes, ClipboardList, Users, ClipboardCheck } from 'https://esm.sh/lucide-react@^0.561.0';
import { Role } from '../types';
import * as api from '../services/supabaseService';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  role: Role;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen, role }) => {
  const [counts, setCounts] = useState({ critical: 0, low: 0 });

  useEffect(() => {
    const updateCounts = async () => {
      const stats = await api.getStats();
      setCounts({ 
        critical: (stats.criticalStockCount || 0) + (stats.outOfStockCount || 0), 
        low: stats.lowStockCount || 0 
      });
    };
    updateCounts();
    // Suscribirse a cambios (opcional, por ahora polling o refresco manual)
    const interval = setInterval(updateCounts, 30000); // Cada 30 seg
    return () => clearInterval(interval);
  }, [activeTab]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    { id: 'inventory', label: 'Inventario', icon: Boxes, adminOnly: false, hasBadge: true },
    { id: 'kardex', label: 'Kardex / Movimientos', icon: ClipboardList, adminOnly: false },
    { id: 'contacts', label: 'CRM / Contactos', icon: Users, adminOnly: false },
    { id: 'audit', label: 'Auditoría', icon: ClipboardCheck, adminOnly: true },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0 border-r border-slate-800
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="px-6 mb-8 flex items-center">
            <div className="bg-indigo-600 p-2 rounded-xl mr-3 shadow-lg shadow-indigo-500/20">
               <Boxes className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xs uppercase tracking-[0.2em] text-slate-500 font-black">Sistema</h2>
              <p className="text-sm font-bold text-white tracking-tight">Kardex Pro</p>
            </div>
          </div>
          
          <nav className="mt-2 flex-1 space-y-1.5 px-4">
            {menuItems
              .filter(item => !item.adminOnly || role === 'ADMIN')
              .map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsOpen(false);
                    }}
                    className={`
                      group flex w-full items-center px-4 py-3.5 text-xs font-bold rounded-2xl transition-all duration-200 relative
                      ${isActive 
                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/30' 
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                    `}
                  >
                    <Icon className={`mr-3 h-4.5 w-4.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`} />
                    <span className="uppercase tracking-widest">{item.label}</span>
                    
                    {item.hasBadge && (counts.critical > 0 || counts.low > 0) && (
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] font-black ${counts.critical > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-white'}`}>
                        {counts.critical > 0 ? counts.critical : counts.low}
                      </span>
                    )}
                  </button>
                );
              })}
          </nav>

          <div className="px-6 pt-6 pb-2 border-t border-slate-800/50 mt-auto">
             <div className="flex items-center space-x-3 p-3 bg-slate-800/30 rounded-2xl border border-slate-800/50">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                   <Users className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Rol Actual</p>
                  <p className="text-[11px] font-bold text-indigo-300">{role}</p>
                </div>
             </div>
             <p className="text-[9px] text-slate-600 font-medium text-center mt-4 tracking-widest uppercase">v1.5.0 InsightEngine</p>
          </div>
        </div>
      </div>
    </>
  );
};
