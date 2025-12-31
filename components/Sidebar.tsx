
import React, { useEffect, useState } from 'react';
import { 
  LayoutDashboard, Boxes, ClipboardList, Users, 
  ClipboardCheck, MapPin, UserPlus, Tags, Warehouse, Settings,
  BarChart3
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';
import { Role, InventoryStats } from '../types.ts';
import * as api from '../services/supabaseService.ts';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  role: Role;
  stats: InventoryStats | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate, isOpen, setIsOpen, role, stats }) => {
  const counts = {
    critical: (stats?.criticalStockCount || 0) + (stats?.outOfStockCount || 0),
    low: stats?.lowStockCount || 0,
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, adminOnly: false },
    { id: 'inventory', label: 'Productos', icon: Boxes, adminOnly: false, hasBadge: true },
    { id: 'kardex', label: 'Kardex / Movimientos', icon: ClipboardList, adminOnly: false },
    { id: 'destinos', label: 'Centros de Costos', icon: MapPin, adminOnly: false },
    { id: 'reports', label: 'Reportes Pro', icon: BarChart3, adminOnly: false },
    { id: 'contacts', label: 'Agenda CRM', icon: Users, adminOnly: false },
  ];

  const adminItems = [
    { id: 'categories', label: 'Categorías', icon: Tags, adminOnly: true },
    { id: 'locations', label: 'Almacenes', icon: Warehouse, adminOnly: true },
    { id: 'users', label: 'Usuarios', icon: UserPlus, adminOnly: true },
    { id: 'audit', label: 'Auditoría', icon: ClipboardCheck, adminOnly: true },
  ];

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-20 md:hidden" onClick={() => setIsOpen(false)}></div>
      )}

      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 md:relative md:translate-x-0 border-r border-slate-800 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col pt-5 pb-4 overflow-y-auto no-scrollbar">
          <div className="px-6 mb-8 flex items-center">
            <div className="bg-indigo-600 p-2 rounded-xl mr-3 shadow-lg">
               <Boxes className="h-5 w-5 text-white" />
            </div>
            <p className="text-sm font-black text-white tracking-tight uppercase">Kardex Pro</p>
          </div>
          
          <nav className="mt-2 flex-1 space-y-1 px-4">
            <p className="px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Principal</p>
            {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => { onNavigate(item.id); setIsOpen(false); }}
                    className={`group flex w-full items-center px-4 py-3 text-xs font-bold rounded-2xl transition-all ${isActive ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
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

            {role === 'ADMIN' && (
              <div className="pt-6">
                <p className="px-4 text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Administración</p>
                {adminItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentPage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => { onNavigate(item.id); setIsOpen(false); }}
                      className={`group flex w-full items-center px-4 py-3 text-xs font-bold rounded-2xl transition-all ${isActive ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}`}
                    >
                      <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="uppercase tracking-widest">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </nav>
        </div>
      </div>
    </>
  );
};
