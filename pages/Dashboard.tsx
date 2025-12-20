
import React, { useEffect, useState } from 'react';
import * as api from '../services/supabaseService';
import { InventoryStats, Product } from '../types';
import { TrendingUp, AlertTriangle, PackageX, Package, RefreshCw, Database, AlertCircle } from 'lucide-react';
import { StockBadge } from '../components/StockBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, p] = await Promise.all([api.getStats(), api.getProducts()]);
      setStats(s);
      setTopProducts(p.slice(0, 5));
    } catch (err: any) {
      console.error("Error cargando dashboard:", err);
      setError("No se pudo conectar con la base de datos. ¿Ya creaste las tablas en Supabase?");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return (
    <div className="h-64 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <RefreshCw className="animate-spin h-8 w-8 text-indigo-600 mb-2" />
        <p className="text-slate-500 text-sm font-medium">Sincronizando datos...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center max-w-lg mx-auto mt-10">
      <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 mb-2">Error de Conexión</h3>
      <p className="text-slate-500 text-sm mb-6 leading-relaxed">
        {error} <br/> 
        <span className="text-[11px] font-mono bg-slate-100 p-1 rounded mt-2 inline-block">Verifica las tablas: products, movements, contacts.</span>
      </p>
      <div className="flex flex-col gap-2">
        <button 
          onClick={fetchData} 
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center"
        >
          <RefreshCw className="w-4 h-4 mr-2" /> Reintentar Conexión
        </button>
        <button 
          onClick={() => { localStorage.clear(); window.location.reload(); }} 
          className="text-slate-400 text-xs hover:text-slate-600 underline"
        >
          Limpiar sesión y volver al inicio
        </button>
      </div>
    </div>
  );

  const cards = [
    { title: 'Total Productos', value: stats?.totalProducts || 0, icon: Package, color: 'bg-blue-500' },
    { title: 'Stock Crítico', value: stats?.outOfStockCount || 0, icon: PackageX, color: 'bg-red-500' },
    { title: 'Stock Bajo', value: stats?.lowStockCount || 0, icon: AlertTriangle, color: 'bg-yellow-500' },
    { title: 'Total Movimientos', value: stats?.totalMovements || 0, icon: TrendingUp, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-900">Resumen de Operaciones</h1>
        <div className="flex items-center text-[10px] font-bold text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
          <Database className="w-3 h-3 mr-1.5 text-green-500" /> EN LÍNEA
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white shadow-sm rounded-xl p-5 border border-slate-100 transition-all hover:shadow-md">
              <div className="flex items-center">
                <div className={`rounded-lg p-3 ${card.color} shadow-sm`}><Icon className="h-6 w-6 text-white" /></div>
                <div className="ml-5">
                  <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider">{card.title}</dt>
                  <dd className="text-2xl font-black text-slate-800">{card.value}</dd>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow-sm rounded-xl p-6 border border-slate-100">
           <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center uppercase tracking-widest">
             <TrendingUp className="w-4 h-4 mr-2 text-indigo-600" /> Niveles de Stock
           </h3>
           <div className="h-64">
             {topProducts.length > 0 ? (
               <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={topProducts}>
                    <XAxis dataKey="name" tick={{fontSize: 9, fill: '#94a3b8'}} height={50} interval={0}/>
                    <YAxis tick={{fontSize: 10, fill: '#94a3b8'}} />
                    <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                    <Bar dataKey="stock" radius={[4, 4, 0, 0]} barSize={40}>
                      {topProducts.map((entry, index) => (
                        <Cell key={index} fill={entry.stock === 0 ? '#ef4444' : entry.stock <= entry.minStock ? '#f59e0b' : '#6366f1'} />
                      ))}
                    </Bar>
                 </BarChart>
               </ResponsiveContainer>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
                 <Package className="w-8 h-8 opacity-20" />
                 <p className="text-xs italic">No hay productos registrados para mostrar gráficas.</p>
               </div>
             )}
           </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-xl p-6 border border-slate-100">
          <h3 className="text-sm font-bold text-slate-800 mb-6 flex items-center uppercase tracking-widest">
            <AlertTriangle className="w-4 h-4 mr-2 text-amber-500" /> Alertas de Stock
          </h3>
          <ul className="divide-y divide-slate-100">
            {topProducts.filter(p => p.stock <= p.minStock).length > 0 ? (
              topProducts.filter(p => p.stock <= p.minStock).map((product) => (
                <li key={product.id} className="py-4 flex justify-between items-center group">
                  <div>
                    <p className="text-sm font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{product.name}</p>
                    <p className="text-[10px] text-slate-400 font-medium">Ubicación: {product.location || 'No asignada'}</p>
                  </div>
                  <StockBadge stock={product.stock} minStock={product.minStock} />
                </li>
              ))
            ) : (
              <li className="py-12 text-center">
                <div className="bg-green-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Package className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-xs text-slate-400 font-medium">Todo bajo control. No hay alertas de stock.</p>
              </li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};
