
import React, { useEffect, useState } from 'react';
import { LayoutDashboard, Boxes, ClipboardList, Users, ClipboardCheck } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';
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
      try {
        const stats = await api.getStats();
        setCounts({ 
          critical: (stats.criticalStockCount || 0) + (stats.outOfStockCount || 0), 
          low: stats.lowStockCount || 0 
        });
      } catch (e) {}
    };
    updateCounts();
    const interval = setInterval(updateCounts, 30000);
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
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-20 md:hidden" onClick={() => setIsOpen(false)}></div>
      )}

      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 md:relative md:translate-x-0 border-r border-slate-800 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="px-6 mb-8 flex items-center">
            <div className="bg-indigo-600 p-2 rounded-xl mr-3 shadow-lg">
               <Boxes className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm font-bold text-white tracking-tight">Kardex Pro</p>
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
                    onClick={() => { setActiveTab(item.id); setIsOpen(false); }}
                    className={`group flex w-full items-center px-4 py-3.5 text-xs font-bold rounded-2xl transition-all ${isActive ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
                  >
                    <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                    <span className="uppercase tracking-widest">{item.label}</span>
                    {item.hasBadge && (counts.critical > 0 || counts.low > 0) && (
                      <span className={`ml-auto px-2 py-0.5 rounded-full text-[9px] ${counts.critical > 0 ? 'bg-red-500 animate-pulse' : 'bg-amber-500'}`}>
                        {counts.critical > 0 ? counts.critical : counts.low}
                      </span>
                    )}
                  </button>
                );
              })}
          </nav>
        </div>
      </div>
    </>
  );
};
