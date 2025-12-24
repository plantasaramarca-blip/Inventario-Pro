
import React, { useEffect, useState } from 'react';
import * as api from '../services/supabaseService';
import { InventoryStats, Product, Contact } from '../types';
import { 
  TrendingUp, AlertTriangle, PackageX, Package, RefreshCw, 
  Database, AlertCircle, ShoppingCart, DollarSign, 
  ChevronRight, ArrowUpCircle, X, CheckCircle2, 
  Loader2, Info
} from 'https://esm.sh/lucide-react@^0.561.0?deps=react@19.2.3';
import { StockBadge } from '../components/StockBadge';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as ReTooltip, Legend } from 'https://esm.sh/recharts@2.15.0?deps=react@19.2.3';
import { groupProductsByStatus } from '../utils/stockUtils';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [attentionProducts, setAttentionProducts] = useState<Product[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Quick Entry Modal
  const [quickEntryProduct, setQuickEntryProduct] = useState<Product | null>(null);
  const [quickEntryForm, setQuickEntryForm] = useState({ quantity: 1, dispatcher: '', contactId: '', reason: 'Abastecimiento Directo' });
  const [quickEntryLoading, setQuickEntryLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p, c] = await Promise.all([api.getStats(), api.getProducts(), api.getContacts()]);
      
      if (s) setStats(s);
      if (c) setContacts(c);
      
      if (p && Array.isArray(p)) {
        const groups = groupProductsByStatus(p);
        const sorted = [
          ...(groups.sinStock || []).sort((a,b) => a.name.localeCompare(b.name)),
          ...(groups.criticos || []).sort((a,b) => (a.stock || 0) - (b.stock || 0)),
          ...(groups.bajos || []).sort((a,b) => (a.stock || 0) - (b.stock || 0))
        ].slice(0, 10);
        setAttentionProducts(sorted);
      }
    } catch (err: any) {
      console.error("Dashboard Fetch Error:", err);
      setError("No se pudieron cargar las estadísticas. Verifique su conexión.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleQuickEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickEntryProduct) return;
    
    setQuickEntryLoading(true);
    try {
      const contact = contacts.find(c => c.id === quickEntryForm.contactId);
      await api.registerMovement({
        productId: quickEntryProduct.id,
        type: 'INGRESO',
        quantity: quickEntryForm.quantity,
        dispatcher: quickEntryForm.dispatcher || 'Dashboard QuickEntry',
        reason: quickEntryForm.reason,
        contactId: quickEntryForm.contactId || null,
        contactName: contact ? contact.name : null
      });
      setQuickEntryProduct(null);
      await fetchData();
    } catch (err: any) {
      alert("Error al registrar: " + err.message);
    } finally {
      setQuickEntryLoading(false);
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center">
        <Loader2 className="animate-spin h-10 w-10 text-indigo-600 mb-4" />
        <p className="text-slate-400 text-xs font-black uppercase tracking-widest">Analizando Almacén...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-100 p-8 rounded-3xl text-center max-w-md mx-auto my-20">
      <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
      <h3 className="text-red-900 font-bold mb-2">Error de Carga</h3>
      <p className="text-red-700 text-sm mb-6">{error}</p>
      <button onClick={fetchData} className="bg-red-600 text-white px-6 py-2 rounded-xl font-bold text-xs uppercase transition-all hover:bg-red-700">Reintentar</button>
    </div>
  );

  const chartData = stats ? [
    { name: 'Disponibles', value: Math.max(0, stats.totalProducts - stats.lowStockCount - stats.criticalStockCount - stats.outOfStockCount), color: '#10b981' },
    { name: 'Stock Bajo', value: stats.lowStockCount || 0, color: '#f59e0b' },
    { name: 'Stock Crítico', value: stats.criticalStockCount || 0, color: '#ef4444' },
    { name: 'Sin Stock', value: stats.outOfStockCount || 0, color: '#64748b' }
  ] : [];

  const cards = [
    { title: 'Valor Inventario', value: `S/ ${(stats?.totalValue || 0).toLocaleString()}`, icon: DollarSign, color: 'bg-indigo-600', sub: 'Valorizado total' },
    { title: 'Stock Crítico', value: stats?.criticalStockCount || 0, icon: AlertCircle, color: 'bg-red-500', sub: 'Acción inmediata', active: (stats?.criticalStockCount || 0) > 0 },
    { title: 'Stock Bajo', value: stats?.lowStockCount || 0, icon: AlertTriangle, color: 'bg-amber-500', sub: 'Zona de riesgo', active: (stats?.lowStockCount || 0) > 0 },
    { title: 'Total Ítems', value: stats?.totalProducts || 0, icon: Package, color: 'bg-blue-600', sub: 'Referencias' },
    { title: 'Agotados', value: stats?.outOfStockCount || 0, icon: PackageX, color: 'bg-slate-700', sub: 'Sin existencias' },
    { title: 'Movimientos', value: stats?.totalMovements || 0, icon: TrendingUp, color: 'bg-purple-600', sub: 'Historial total' },
  ];

  const hasCritical = (stats?.criticalStockCount || 0) > 0 || (stats?.outOfStockCount || 0) > 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-20">
      {/* 1. GRID DE KPIs */}
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
        {/* 2. TABLA DE ATENCIÓN */}
        <div className="lg:col-span-2 bg-white shadow-sm rounded-3xl p-6 border border-slate-100 overflow-hidden">
           <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-[0.15em] flex items-center">
                <AlertCircle className={`w-5 h-5 mr-2 ${hasCritical ? 'text-red-500 animate-pulse' : 'text-slate-300'}`} /> 
                Prioridad de Reabastecimiento
              </h3>
           </div>
           
           <div className="overflow-x-auto -mx-6">
             <table className="w-full">
               <thead className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">
                 <tr>
                   <th className="px-6 py-3 text-left">Producto</th>
                   <th className="px-6 py-3 text-center">Stock</th>
                   <th className="px-6 py-3 text-center">Estado</th>
                   <th className="px-6 py-3 text-right">Acción</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50">
                 {attentionProducts.length > 0 ? attentionProducts.map(p => (
                   <tr key={p.id} className="group hover:bg-slate-50/50 transition-colors">
                     <td className="px-6 py-4">
                        <div className="flex items-center space-x-3">
                           <div className="w-10 h-10 rounded-xl bg-slate-100 flex-shrink-0 border border-slate-200 overflow-hidden shadow-inner">
                             {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <Package className="w-5 h-5 m-auto text-slate-300" />}
                           </div>
                           <div>
                              <p className="text-xs font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{p.name}</p>
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
                     <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => setQuickEntryProduct(p)}
                          className="bg-indigo-50 text-indigo-600 p-2 rounded-xl border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                        >
                           <ArrowUpCircle className="w-4 h-4" />
                        </button>
                     </td>
                   </tr>
                 )) : (
                   <tr><td colSpan={4} className="py-20 text-center text-slate-300 text-xs italic">Todos los niveles de stock son óptimos.</td></tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>

        {/* 3. GRÁFICA */}
        <div className="bg-white shadow-sm rounded-3xl p-6 border border-slate-100 flex flex-col min-h-[400px]">
           <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center">
             <Database className="w-4 h-4 mr-2 text-indigo-500" /> Distribución de Salud
           </h3>
           <div className="flex-1">
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
                   <p className="text-[10px] font-black uppercase tracking-widest">Sin datos</p>
                </div>
             )}
           </div>
           <div className="mt-6 p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <div className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-2 flex items-center">
                <Info className="w-3 h-3 mr-1" /> Estado de Almacén
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                {hasCritical ? "Se han detectado productos que requieren reposición inmediata para evitar quiebres de stock." : "El inventario se mantiene dentro de los márgenes de seguridad establecidos."}
              </p>
           </div>
        </div>
      </div>

      {/* 4. MODAL ENTRADA RÁPIDA */}
      {quickEntryProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setQuickEntryProduct(null)}></div>
           <form onSubmit={handleQuickEntry} className="relative bg-white rounded-[32px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-indigo-600 p-8 text-white relative">
                 <button type="button" onClick={() => setQuickEntryProduct(null)} className="absolute top-6 right-6 text-indigo-200 hover:text-white"><X className="w-6 h-6" /></button>
                 <h3 className="text-xl font-black uppercase tracking-tight">Entrada de Stock</h3>
                 <p className="text-indigo-100 text-xs font-bold mt-1">Incrementar inventario para {quickEntryProduct.name}</p>
              </div>
              
              <div className="p-8 space-y-6">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cantidad (+)</label>
                       <input 
                         type="number" 
                         min="1" 
                         required 
                         className="w-full border-slate-100 bg-slate-50 p-4 text-sm font-black text-indigo-600 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner" 
                         value={quickEntryForm.quantity} 
                         onChange={e => setQuickEntryForm({...quickEntryForm, quantity: parseInt(e.target.value) || 0})}
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Proveedor</label>
                       <select 
                         className="w-full border-slate-100 bg-slate-50 p-4 text-[11px] font-bold text-slate-700 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner appearance-none"
                         value={quickEntryForm.contactId}
                         onChange={e => setQuickEntryForm({...quickEntryForm, contactId: e.target.value})}
                       >
                          <option value="">Ninguno</option>
                          {contacts.filter(c => c.type === 'PROVEEDOR').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                       </select>
                    </div>
                 </div>

                 <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsable del Ingreso</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="Nombre del operario"
                      className="w-full border-slate-100 bg-slate-50 p-4 text-sm font-bold rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner" 
                      value={quickEntryForm.dispatcher}
                      onChange={e => setQuickEntryForm({...quickEntryForm, dispatcher: e.target.value})}
                    />
                 </div>

                 <button 
                   disabled={quickEntryLoading}
                   className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-indigo-700 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
                 >
                   {quickEntryLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <><CheckCircle2 className="w-5 h-5" /> <span>Confirmar Ingreso</span></>}
                 </button>
              </div>
           </form>
        </div>
      )}
    </div>
  );
};
