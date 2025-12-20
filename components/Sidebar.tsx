
import React from 'react';
import { LayoutDashboard, Boxes, ClipboardList, Users } from 'https://esm.sh/lucide-react@^0.561.0';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isOpen, setIsOpen }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Inventario', icon: Boxes },
    { id: 'kardex', label: 'Kardex / Movimientos', icon: ClipboardList },
    { id: 'contacts', label: 'CRM / Contactos', icon: Users },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="h-full flex flex-col pt-5 pb-4 overflow-y-auto">
          <div className="px-4 mb-6">
            <h2 className="text-sm uppercase tracking-wider text-slate-400 font-bold">Menu Principal</h2>
          </div>
          <nav className="mt-2 flex-1 space-y-2 px-2">
            {menuItems.map((item) => {
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
                    group flex w-full items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'}
                  `}
                >
                  <Icon className={`mr-3 h-5 w-5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
          <div className="p-4 border-t border-slate-800">
             <div className="text-xs text-slate-500">v1.1.0 Sistema CRM</div>
          </div>
        </div>
      </div>
    </>
  );
};
