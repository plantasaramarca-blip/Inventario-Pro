import React, { useEffect, useState } from 'https://esm.sh/react@19.0.0';
import * as api from '../services/supabaseService';
import { InventoryStats, Product } from '../types';
import { 
  TrendingUp, AlertTriangle, PackageX, Package, 
  AlertCircle, DollarSign, Loader2, Database,
  ArrowUpRight, Info
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.0.0';
import { StockBadge } from '../components/StockBadge';
import { groupProductsByStatus } from '../utils/stockUtils';
import { formatCurrency } from '../utils/currencyUtils';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [attentionProducts, setAttentionProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p] = await Promise.all([
        api.getStats().catch(e => null),
        api.getProducts().catch(e => [])
      ]);
      
      if (s) setStats(s);
      if (p) {
        setProducts(p);
        const groups = groupProductsByStatus(p);
        const sorted = [
          ...(groups.sinStock || []),
          ...(groups.criticos || []),
          ...(groups.bajos || [])
        ].slice(0, 5);
        setAttentionProducts(sorted);
      }
    } catch (err: any) {
      setError("Error al cargar datos del Dashboard.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const topValueProducts = [...products]
    .sort((a, b) => (b.purchasePrice * b.stock) - (a.purchasePrice * a.stock))
    .slice(0, 10);

  const maxProductValue = topValueProducts.length > 0 
    ? (topValueProducts[0].purchasePrice * topValueProducts[0].stock) 
    : 1;

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Loader2 className="animate-spin h-10 w-10 text-indigo-600 mb-4" />
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">Sincronizando Finanzas...</p>
      </div>
    </div>
  );

  const cards = [
    { 
      title: 'Valor Inventario', 
      value: formatCurrency(stats?.totalValue || 0), 
      icon: DollarSign, 
      color: 'bg-indigo-600', 
      sub: `En ${stats?.totalProducts || 0} productos`,
      extra: stats ? `Avg: ${formatCurrency(stats.totalValue / (stats.totalProducts || 1))}/it` : null
    },
    { title: 'Stock Crítico', value: stats?.criticalStockCount || 0, icon: AlertCircle, color: 'bg-red-500', sub: 'Acción Urgente' },
    { title: 'Stock Bajo', value: stats?.lowStockCount || 0, icon: AlertTriangle, color: 'bg-amber-500', sub: 'Zona de riesgo' },
    { title: 'Total Ítems', value: stats?.totalProducts || 0, icon: Package, color: 'bg-blue-600', sub: 'Referencias en catálogo' },
    { title: 'Agotados', value: stats?.outOfStockCount || 0, icon: PackageX, color: 'bg-slate-700', sub: 'Sin existencias' },
    { title: 'Movimientos', value: stats?.totalMovements || 0, icon: TrendingUp, color: 'bg-purple-600', sub: 'Transacciones' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white shadow-sm rounded-2xl p-4 border border-slate-100 flex flex-col justify-between">
              <div>
                <div className={`p-2 rounded-xl w-fit ${card.color} text-white mb-4 shadow-sm`}>
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.title}</h3>
                <p className="text-lg font-black text-slate-800 tracking-tighter truncate">{card.value}</p>
                <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase leading-tight">{card.sub}</p>
              </div>
              {card.extra && (
                <div className="mt-3 pt-3 border-t border-slate-50 flex items-center text-[8px] font-black text-indigo-500 uppercase tracking-tighter">
                  <ArrowUpRight className="w-3 h-3 mr-1" /> {card.extra}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top 10 Productos por Valor */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 mr-3 text-emerald-500" />
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em]">Top Inversión en Stock</h3>
            </div>
            <Info className="w-4 h-4 text-slate-300" />
          </div>
          
          <div className="space-y-4">
            {topValueProducts.map((p, idx) => {
              const val = p.purchasePrice * p.stock;
              const pct = (val / maxProductValue) * 100;
              return (
                <div key={p.id} className="group">
                  <div className="flex justify-between items-end mb-1.5">
                    <div className="flex items-center space-x-3">
                      <span className="text-[10px] font-black text-slate-300 w-4">#{idx + 1}</span>
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0">
                        {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Package className="w-4 h-4 text-slate-200" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700 group-hover:text-indigo-600 transition-colors">{p.name}</p>
                        <p className="text-[9px] text-slate-400 font-bold">{p.stock} {p.unit} × {formatCurrency(p.purchasePrice, p.currency)}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-800">{formatCurrency(val, p.currency)}</p>
                    </div>
                  </div>
                  <div className="w-full bg-slate-50 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Alertas Rápidas */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col">
          <div className="flex items-center mb-6">
            <AlertCircle className="w-5 h-5 mr-3 text-rose-500" />
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em]">Alertas de Reposición</h3>
          </div>
          <div className="flex-1 space-y-4">
            {attentionProducts.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-2xl border border-slate-100/50">
                <div className="min-w-0 pr-2">
                  <p className="text-xs font-bold text-slate-800 truncate">{p.name}</p>
                  <p className="text-[9px] text-slate-400 font-black uppercase">Stock: {p.stock}</p>
                </div>
                <StockBadge stock={p.stock} minStock={p.minStock} criticalStock={p.criticalStock} />
              </div>
            ))}
            {attentionProducts.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <Database className="w-10 h-10 mb-3" />
                <p className="text-xs font-bold italic">Todo en orden</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};