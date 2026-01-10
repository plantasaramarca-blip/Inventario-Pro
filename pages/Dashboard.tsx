
import React, { useState, useEffect } from 'react';
import { InventoryStats, Product } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import {
  TrendingUp, AlertTriangle, Package,
  AlertCircle, DollarSign, Layers, Users, ChevronRight, Loader2, Ban
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';
import { StockBadge } from '../components/StockBadge.tsx';
import { formatCurrency } from '../utils/currencyUtils.ts';

interface DashboardProps {
  onNavigate: (page: string, options?: { push?: boolean; state?: any }) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [alertProducts, setAlertProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      setLoading(true);
      try {
        const [statsData, alertData] = await Promise.all([
          api.getStats(),
          api.getAlertProducts(6)
        ]);
        setStats(statsData);
        setAlertProducts(alertData || []);
      } catch (error) {
        console.error("Failed to load dashboard data", error);
      } finally {
        setLoading(false);
      }
    };
    loadDashboardData();
  }, []);

  const totalLowStock = (stats?.lowStockCount || 0) + (stats?.criticalStockCount || 0) + (stats?.outOfStockCount || 0);

  const cards = [
    {
      title: 'Valor Total',
      value: formatCurrency(stats?.totalValue || 0),
      icon: DollarSign,
      color: 'bg-indigo-600',
      sub: 'Inversión',
      onClick: () => onNavigate('inventory')
    },
    {
      title: 'Sin Stock',
      value: (stats?.outOfStockCount || 0),
      icon: Ban,
      color: 'bg-slate-600',
      sub: 'Agotados',
      onClick: () => onNavigate('inventory', { state: { filter: 'outOfStock' } })
    },
    {
      title: 'Crítico',
      value: stats?.criticalStockCount || 0,
      icon: AlertCircle,
      color: 'bg-rose-500',
      sub: 'Reponer ya',
      onClick: () => onNavigate('inventory', { state: { filter: 'critical' } })
    },
    {
      title: 'Stock Bajo',
      value: stats?.lowStockCount || 0,
      icon: AlertTriangle,
      color: 'bg-amber-500',
      sub: 'En alerta',
      onClick: () => onNavigate('inventory', { state: { filter: 'lowStock' } })
    },
    {
      title: 'Productos',
      value: stats?.totalProducts || 0,
      icon: Layers,
      color: 'bg-indigo-400',
      sub: 'Registrados',
      onClick: () => onNavigate('inventory')
    },
    {
      title: 'Movimientos',
      value: stats?.totalMovements || 0,
      icon: TrendingUp,
      color: 'bg-purple-600',
      sub: 'Operaciones',
      onClick: () => onNavigate('kardex')
    },
  ];

  if (loading) return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-500" /></div>;

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <button key={idx} onClick={card.onClick} className="bg-white shadow-sm rounded-xl p-3 border border-slate-100 flex flex-col items-center text-center transition-all hover:border-indigo-200 hover:shadow-lg hover:-translate-y-1 active:scale-95">
              <div className={`p-1.5 rounded-lg ${card.color} text-white mb-1.5 shadow-sm`}><Icon className="h-3.5 w-3.5" /></div>
              <h3 className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{card.title}</h3>
              <p className="text-xs font-black text-slate-800 tracking-tighter truncate w-full">{card.value}</p>
              <p className="text-[6px] text-slate-400 font-bold uppercase leading-tight">{card.sub}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Alerta de Reposición</h3>
          <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Top Críticos</span>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[600px]">
            <thead className="text-[8px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50">
              <tr>
                <th className="pb-3 px-2 w-10 text-center">IMG</th>
                <th className="pb-3 px-2">Producto</th>
                <th className="pb-3 px-2 text-center">Stock / Mínimo</th>
                <th className="pb-3 px-2 text-left">Modelo</th>
                <th className="pb-3 px-2">Almacén</th>
                <th className="pb-3 px-2 text-center">Estado</th>
                <th className="pb-3 w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {alertProducts.map(p => (
                <tr
                  key={p.id}
                  onClick={() => onNavigate('productDetail', { push: true, state: { productId: p.id } })}
                  className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                >
                  <td className="py-3 px-2">
                    <div className="w-8 h-8 rounded bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center mx-auto">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Layers className="w-4 h-4 text-slate-300" />
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2">
                    <p className="text-[11px] font-bold text-slate-800 uppercase">{p.name}</p>
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">{p.code}</p>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <span className="text-[11px] font-black text-slate-800">{p.stock}</span>
                    <span className="text-[9px] text-slate-400 font-bold"> / {p.minStock} </span>
                    <span className="text-[8px] text-slate-400 font-bold ml-0.5 uppercase">{p.unit}</span>
                  </td>
                  <td className="py-3 px-2 text-left">
                    <p className="text-[9px] font-bold text-slate-600 uppercase">{p.model || '-'}</p>
                  </td>
                  <td className="py-3 px-2">
                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{p.location}</p>
                  </td>
                  <td className="py-3 px-2 text-center">
                    <StockBadge stock={p.stock} minStock={p.minStock} criticalStock={p.criticalStock} />
                  </td>
                  <td className="py-3">
                    <ChevronRight className="w-5 h-5 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
