import React, { useEffect, useState } from 'https://esm.sh/react@19.0.0';
import * as api from '../services/supabaseService';
import { InventoryStats, Product } from '../types';
import { 
  TrendingUp, AlertTriangle, PackageX, Package, 
  AlertCircle, DollarSign, Loader2, Database
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.0.0';
import { StockBadge } from '../components/StockBadge';
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
      const [s, p] = await Promise.all([
        api.getStats().catch(e => { console.error("Stats Error:", e); return null; }),
        api.getProducts().catch(e => { console.error("Products Error:", e); return []; })
      ]);
      
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
      console.error("Dashboard Global Fetch Error:", err);
      setError("Error de conexión con los datos locales/nube.");
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
        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Restaurando Panel...</p>
      </div>
    </div>
  );

  const cards = [
    { title: 'Valor Inventario', value: `S/ ${(stats?.totalValue || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-indigo-600', sub: 'Monto total' },
    { title: 'Stock Crítico', value: stats?.criticalStockCount || 0, icon: AlertCircle, color: 'bg-red-500', sub: 'Acción Urgente' },
    { title: 'Stock Bajo', value: stats?.lowStockCount || 0, icon: AlertTriangle, color: 'bg-amber-500', sub: 'Zona de riesgo' },
    { title: 'Total Ítems', value: stats?.totalProducts || 0, icon: Package, color: 'bg-blue-600', sub: 'Referencias' },
    { title: 'Agotados', value: stats?.outOfStockCount || 0, icon: PackageX, color: 'bg-slate-700', sub: 'Sin stock' },
    { title: 'Movimientos', value: stats?.totalMovements || 0, icon: TrendingUp, color: 'bg-purple-600', sub: 'Historial' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {error && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center text-amber-700 text-sm font-bold shadow-sm">
          <AlertCircle className="w-5 h-5 mr-3" /> {error}
        </div>
      )}

      {/* Tarjetas Informativas: Responsive Grid (2 col en mobile, 3 en tablet, 6 en desktop) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white shadow-sm rounded-2xl sm:rounded-3xl p-3 sm:p-5 border border-slate-100 transition-all hover:shadow-md">
               <div className="flex flex-col h-full justify-between">
                  <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl w-fit ${card.color} text-white mb-2 sm:mb-4 shadow-md`}>
                     <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </div>
                  <div>
                    <h3 className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5 sm:mb-1">{card.title}</h3>
                    <p className="text-sm sm:text-xl font-black text-slate-800 tracking-tighter truncate">{card.value}</p>
                    <p className="text-[8px] sm:text-[9px] text-slate-400 font-bold mt-0.5 sm:mt-1 uppercase">{card.sub}</p>
                  </div>
               </div>
            </div>
          );
        })}
      </div>

      {/* Tabla de Prioridad */}
      <div className="bg-white shadow-sm rounded-3xl p-4 sm:p-6 border border-slate-100 overflow-hidden">
        <div className="flex items-center mb-6">
          <Database className="w-5 h-5 mr-3 text-indigo-500" />
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em]">Prioridad de Almacén</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
              <tr>
                <th className="px-4 py-3 text-left">Producto</th>
                <th className="px-4 py-3 text-center">Stock</th>
                <th className="px-4 py-3 text-center">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {attentionProducts.length > 0 ? attentionProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden flex-shrink-0">
                        {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-slate-300" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest truncate">{p.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className="text-xs font-black text-slate-700">{p.stock}</span>
                    <span className="text-[9px] text-slate-400 font-bold ml-1 uppercase">{p.unit}</span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <StockBadge stock={p.stock} minStock={p.minStock} criticalStock={p.criticalStock} />
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={3} className="py-20 text-center text-slate-300 text-xs italic">
                    Sin alertas críticas de stock.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};