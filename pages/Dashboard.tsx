
import React, { useEffect, useState } from 'react';
import * as api from '../services/supabaseService';
import { InventoryStats, Product } from '../types';
import { 
  TrendingUp, AlertTriangle, PackageX, Package, 
  Database, AlertCircle, DollarSign, Loader2
} from 'lucide-react';
import { StockBadge } from '../components/StockBadge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'recharts';
import { groupProductsByStatus } from '../utils/stockUtils';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [attentionProducts, setAttentionProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p] = await Promise.all([api.getStats(), api.getProducts()]);
      if (s) setStats(s);
      if (p && Array.isArray(p)) {
        const groups = groupProductsByStatus(p);
        const sorted = [
          ...(groups.sinStock || []),
          ...(groups.criticos || []),
          ...(groups.bajos || [])
        ].slice(0, 10);
        setAttentionProducts(sorted);
      }
    } catch (err: any) {
      console.error("Dashboard Fetch Error:", err);
      setError("Error al cargar datos del servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Loader2 className="animate-spin h-10 w-10 text-indigo-600 mb-4" />
        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Sincronizando Almacén...</p>
      </div>
    </div>
  );

  const chartData = stats ? [
    { name: 'Disponibles', value: Math.max(0, stats.totalProducts - (stats.lowStockCount || 0) - (stats.criticalStockCount || 0) - (stats.outOfStockCount || 0)), color: '#10b981' },
    { name: 'Stock Bajo', value: stats.lowStockCount || 0, color: '#f59e0b' },
    { name: 'Stock Crítico', value: stats.criticalStockCount || 0, color: '#ef4444' },
    { name: 'Sin Stock', value: stats.outOfStockCount || 0, color: '#64748b' }
  ].filter(d => d.value > 0) : [];

  const cards = [
    { title: 'Valor Inventario', value: `S/ ${(stats?.totalValue || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-indigo-600', sub: 'Valorizado total' },
    { title: 'Stock Crítico', value: stats?.criticalStockCount || 0, icon: AlertCircle, color: 'bg-red-500', sub: 'Acción inmediata', active: (stats?.criticalStockCount || 0) > 0 },
    { title: 'Stock Bajo', value: stats?.lowStockCount || 0, icon: AlertTriangle, color: 'bg-amber-500', sub: 'Zona de riesgo', active: (stats?.lowStockCount || 0) > 0 },
    { title: 'Total Ítems', value: stats?.totalProducts || 0, icon: Package, color: 'bg-blue-600', sub: 'Referencias' },
    { title: 'Agotados', value: stats?.outOfStockCount || 0, icon: PackageX, color: 'bg-slate-700', sub: 'Sin existencias' },
    { title: 'Movimientos', value: stats?.totalMovements || 0, icon: TrendingUp, color: 'bg-purple-600', sub: 'Historial total' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      {error && (
        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center text-red-700 text-sm font-bold">
           <AlertCircle className="w-5 h-5 mr-3" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white shadow-sm rounded-3xl p-5 border border-slate-100 transition-all hover:shadow-lg relative overflow-hidden group">
               <div className="flex flex-col h-full justify-between">
                  <div className={`p-2.5 rounded-2xl w-fit ${card.color} text-white mb-4 shadow-lg transition-transform group-hover:scale-110`}>
                     <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{card.title}</h3>
                    <p className="text-2xl font-black text-slate-800 tracking-tighter">{card.value}</p>
                    <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tight">{card.sub}</p>
                  </div>
               </div>
               {card.active && (
                 <span className="absolute top-4 right-4 flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                 </span>
               )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white shadow-sm rounded-3xl p-6 border border-slate-100 overflow-hidden">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em] flex items-center">
                <AlertCircle className={`w-5 h-5 mr-2 ${(stats?.criticalStockCount || 0) > 0 ? 'text-red-500' : 'text-slate-300'}`} /> 
                Prioridad de Reabastecimiento
              </h3>
           </div>
           <div className="overflow-x-auto">
             <table className="w-full">
               <thead className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                 <tr>
                   <th className="px-6 py-3 text-left">Producto</th>
                   <th className="px-6 py-3 text-center">Stock</th>
                   <th className="px-6 py-3 text-center">Estado</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {attentionProducts.length > 0 ? attentionProducts.map(p => (
                   <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                     <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0 border border-slate-200 overflow-hidden shadow-inner flex items-center justify-center">
                             {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 text-slate-300" />}
                           </div>
                           <div>
                              <p className="text-xs font-bold text-slate-800">{p.name}</p>
                              <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest leading-none mt-1">{p.location || 'SIN UBICACIÓN'}</p>
                           </div>
                        </div>
                     </td>
                     <td className="px-6 py-4 text-center">
                        <span className="text-sm font-black text-slate-700">{p.stock}</span>
                        <span className="text-[9px] text-slate-400 font-bold ml-1 uppercase">{p.unit}</span>
                     </td>
                     <td className="px-6 py-4 text-center">
                        <StockBadge stock={p.stock} minStock={p.minStock} criticalStock={p.criticalStock} />
                     </td>
                   </tr>
                 )) : (
                   <tr><td colSpan={3} className="py-20 text-center text-slate-300 text-xs italic">Niveles de stock saludables.</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>

        <div className="bg-white shadow-sm rounded-3xl p-6 border border-slate-100 flex flex-col min-h-[450px]">
           <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
             <Database className="w-4 h-4 mr-2 text-indigo-500" /> Distribución de Salud
           </h3>
           <div className="flex-1 w-full" style={{ height: '300px' }}>
             {stats?.totalProducts ? (
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
                      ))}
                    </Pie>
                    <ReTooltip 
                      contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold'}}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      align="center" 
                      iconType="circle"
                      formatter={(value) => <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">{value}</span>}
                    />
                 </PieChart>
               </ResponsiveContainer>
             ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-200 opacity-50">
                   <Package className="w-12 h-12 mb-2" />
                   <p className="text-[10px] font-black uppercase tracking-widest">Sin datos suficientes</p>
                </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};
