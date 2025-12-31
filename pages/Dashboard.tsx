
import React, { useEffect, useState } from 'react';
import * as api from '../services/supabaseService.ts';
import { InventoryStats, Product, Movement } from '../types.ts';
import { 
  TrendingUp, AlertTriangle, Package, 
  AlertCircle, DollarSign, Loader2, MapPin, 
  Layers, Users, ShoppingCart
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';
import { StockBadge } from '../components/StockBadge.tsx';
import { formatCurrency } from '../utils/currencyUtils.ts';

interface DashboardProps {
  onNavigate: (page: string, options?: { push?: boolean; state?: any }) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchData = async () => {
    setLoading(true);
    try {
      const [s, p, m] = await Promise.all([
        api.getStats(),
        api.getProducts(),
        api.getMovements()
      ]);
      setStats(s);
      setProducts(p);
      setMovements(m);
    } catch (err) {} 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const alertProducts = products
    .filter(p => p.stock <= p.minStock)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 6);

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
    </div>
  );

  const cards = [
    { title: 'Valor Total', value: formatCurrency(stats?.totalValue || 0), icon: DollarSign, color: 'bg-indigo-600', sub: 'Inversión', page: 'inventory' },
    { title: 'Crítico', value: stats?.criticalStockCount || 0, icon: AlertCircle, color: 'bg-rose-500', sub: 'Reponer ya', page: 'inventory', state: { prefilter: 'CRITICAL' } },
    { title: 'Stock Bajo', value: stats?.lowStockCount || 0, icon: AlertTriangle, color: 'bg-amber-500', sub: 'En alerta', page: 'inventory', state: { prefilter: 'LOW' } },
    { title: 'Productos', value: stats?.totalProducts || 0, icon: Layers, color: 'bg-indigo-400', sub: 'Registrados', page: 'inventory' },
    { title: 'Contactos', value: stats?.totalContacts || 0, icon: Users, color: 'bg-emerald-500', sub: 'CRM', page: 'contacts' },
    { title: 'Movimientos', value: stats?.totalMovements || 0, icon: TrendingUp, color: 'bg-purple-600', sub: 'Operaciones', page: 'kardex' },
  ];

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <button key={idx} onClick={() => onNavigate(card.page, { push: true, state: card.state })} className="bg-white shadow-sm rounded-xl p-3 border border-slate-100 flex flex-col items-center text-center transition-all hover:border-indigo-200 hover:shadow-lg hover:-translate-y-1 active:scale-95">
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
          <table className="w-full text-left min-w-[400px]">
            <thead className="text-[8px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50">
              <tr>
                <th className="pb-3 px-2">Producto</th>
                <th className="pb-3 text-center">Stock</th>
                <th className="pb-3 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {alertProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-2">
                    <p className="text-[11px] font-bold text-slate-800">{p.name}</p>
                    <p className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">{p.code}</p>
                  </td>
                  <td className="py-3 text-center">
                    <span className="text-[11px] font-black text-slate-800">{p.stock}</span>
                    <span className="text-[8px] text-slate-400 font-bold ml-0.5 uppercase">{p.unit}</span>
                  </td>
                  <td className="py-3 text-right">
                    <StockBadge stock={p.stock} minStock={p.minStock} criticalStock={p.criticalStock} />
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
