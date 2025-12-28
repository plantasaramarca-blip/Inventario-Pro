
import React, { useEffect, useState } from 'https://esm.sh/react@19.2.3';
import * as api from '../services/supabaseService.ts';
import { InventoryStats, Product, Movement } from '../types.ts';
import { 
  TrendingUp, AlertTriangle, Package, 
  AlertCircle, DollarSign, Loader2, MapPin, 
  Layers, Users, ShoppingCart
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';
import { StockBadge } from '../components/StockBadge.tsx';
import { formatCurrency } from '../utils/currencyUtils.ts';

export const Dashboard: React.FC = () => {
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
      <Loader2 className="animate-spin h-10 w-10 text-indigo-600" />
    </div>
  );

  const cards = [
    { title: 'Valor Total', value: formatCurrency(stats?.totalValue || 0), icon: DollarSign, color: 'bg-indigo-600', sub: 'Inversión en Almacén' },
    { title: 'Stock Crítico', value: stats?.criticalStockCount || 0, icon: AlertCircle, color: 'bg-rose-500', sub: 'Reponer Urgente' },
    { title: 'Stock Bajo', value: stats?.lowStockCount || 0, icon: AlertTriangle, color: 'bg-amber-500', sub: 'Zona de Alerta' },
    { title: 'Productos', value: stats?.totalProducts || 0, icon: Layers, color: 'bg-indigo-400', sub: 'Ítems Registrados' },
    { title: 'Contactos', value: stats?.totalContacts || 0, icon: Users, color: 'bg-emerald-500', sub: 'Clientes/Proveedores' },
    { title: 'Movimientos', value: stats?.totalMovements || 0, icon: TrendingUp, color: 'bg-purple-600', sub: 'Operaciones Total' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white shadow-sm rounded-2xl p-4 border border-slate-100 flex flex-col items-center text-center">
              <div className={`p-2 rounded-xl ${card.color} text-white mb-2 shadow-sm`}><Icon className="h-4 w-4" /></div>
              <h3 className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.title}</h3>
              <p className="text-sm font-black text-slate-800 tracking-tighter truncate w-full">{card.value}</p>
              <p className="text-[7px] text-slate-400 font-bold mt-1 uppercase leading-tight">{card.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-[2.5rem] p-6 sm:p-8 border border-slate-100 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Alerta de Reposición</h3>
          <span className="text-[9px] font-black text-slate-300 uppercase">Top 6 Críticos</span>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left min-w-[500px]">
            <thead className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50">
              <tr>
                <th className="pb-4 px-2">Producto</th>
                <th className="pb-4 text-center">Stock Actual</th>
                <th className="pb-4 text-right">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {alertProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 px-2">
                    <p className="text-xs font-bold text-slate-800">{p.name}</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">{p.code} • {p.location}</p>
                  </td>
                  <td className="py-4 text-center">
                    <span className="text-xs font-black text-slate-800">{p.stock}</span>
                    <span className="text-[9px] text-slate-400 font-bold ml-1 uppercase">{p.unit}</span>
                  </td>
                  <td className="py-4 text-right">
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
