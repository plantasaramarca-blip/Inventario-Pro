
import React, { useEffect, useState } from 'https://esm.sh/react@19.2.3';
import * as api from '../services/supabaseService.ts';
import { InventoryStats, Product, Movement } from '../types.ts';
import { 
  TrendingUp, AlertTriangle, Package, 
  AlertCircle, DollarSign, Loader2, MapPin, ChevronRight
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
        api.getStats().catch(e => null),
        api.getProducts().catch(e => []),
        api.getMovements().catch(e => [])
      ]);
      if (s) setStats(s);
      if (p) setProducts(p);
      if (m) setMovements(m);
    } catch (err: any) {} 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const alertProducts = products
    .filter(p => p.stock <= p.minStock)
    .sort((a, b) => a.stock - b.stock)
    .slice(0, 5);

  const distribution = movements
    .filter(m => m.type === 'SALIDA' && m.destinationName)
    .reduce((acc: any, m) => {
      acc[m.destinationName!] = (acc[m.destinationName!] || 0) + m.quantity;
      return acc;
    }, {});

  const topDestinations = Object.entries(distribution)
    .sort((a: any, b: any) => b[1] - a[1])
    .slice(0, 5);

  const maxDestVal = Math.max(...(Object.values(distribution) as number[]), 1);

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <Loader2 className="animate-spin h-10 w-10 text-indigo-600" />
    </div>
  );

  const cards = [
    { title: 'Valor Inventario', value: formatCurrency(stats?.totalValue || 0), icon: DollarSign, color: 'bg-indigo-600', sub: `En ${stats?.totalProducts || 0} productos` },
    { title: 'Stock Crítico', value: stats?.criticalStockCount || 0, icon: AlertCircle, color: 'bg-red-500', sub: 'Acción Urgente' },
    { title: 'Stock Bajo', value: stats?.lowStockCount || 0, icon: AlertTriangle, color: 'bg-amber-500', sub: 'Zona de riesgo' },
    { title: 'Movimientos', value: stats?.totalMovements || 0, icon: TrendingUp, color: 'bg-purple-600', sub: 'Transacciones' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white shadow-sm rounded-2xl p-4 border border-slate-100">
              <div className={`p-2 rounded-xl w-fit ${card.color} text-white mb-4 shadow-sm`}><Icon className="h-4 w-4" /></div>
              <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.title}</h3>
              <p className="text-lg font-black text-slate-800 tracking-tighter truncate">{card.value}</p>
              <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase leading-tight">{card.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em]">Alertas de Inventario</h3>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Top 5 Críticos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50">
                  <tr>
                    <th className="pb-4">Producto</th>
                    <th className="pb-4 text-center">Stock</th>
                    <th className="pb-4 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {alertProducts.map(p => (
                    <tr key={p.id} className="group">
                      <td className="py-4">
                        <p className="text-xs font-bold text-slate-800">{p.name}</p>
                        <p className="text-[9px] text-slate-400 font-medium">{p.code} • {p.location}</p>
                      </td>
                      <td className="py-4 text-center">
                        <span className="text-xs font-black text-slate-700">{p.stock}</span>
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

        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm h-full">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em]">Salidas por Destino</h3>
              <MapPin className="w-4 h-4 text-slate-300" />
            </div>
            <div className="space-y-6">
              {topDestinations.map(([name, val]: any) => {
                const pct = (val / maxDestVal) * 100;
                return (
                  <div key={name}>
                    <div className="flex justify-between items-end mb-2">
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight truncate max-w-[120px]">{name}</span>
                      <span className="text-[10px] font-black text-indigo-600">{val}</span>
                    </div>
                    <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
