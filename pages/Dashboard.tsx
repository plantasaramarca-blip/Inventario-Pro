
import React, { useEffect, useState } from 'react';
import * as api from '../services/supabaseService';
import { InventoryStats, Product } from '../types';
import { TrendingUp, AlertTriangle, PackageX, Package } from 'https://esm.sh/lucide-react@^0.561.0';
import { StockBadge } from '../components/StockBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'https://esm.sh/recharts@^3.5.1';

export const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [topProducts, setTopProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const [s, p] = await Promise.all([api.getStats(), api.getProducts()]);
      setStats(s);
      setTopProducts(p.slice(0, 5));
      setLoading(false);
    };
    fetchData();
  }, []);

  if (loading || !stats) return (
    <div className="h-64 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mb-2"></div>
        <p className="text-gray-500 text-sm">Cargando estadísticas...</p>
      </div>
    </div>
  );

  const cards = [
    { title: 'Total Productos', value: stats.totalProducts, icon: Package, color: 'bg-blue-500' },
    { title: 'Stock Crítico', value: stats.outOfStockCount, icon: PackageX, color: 'bg-red-500' },
    { title: 'Stock Bajo', value: stats.lowStockCount, icon: AlertTriangle, color: 'bg-yellow-500' },
    { title: 'Total Movimientos', value: stats.totalMovements, icon: TrendingUp, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Resumen de Operaciones</h1>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white shadow rounded-xl p-5 border border-gray-100 transition-transform hover:scale-[1.02]">
              <div className="flex items-center">
                <div className={`rounded-md p-3 ${card.color}`}><Icon className="h-6 w-6 text-white" /></div>
                <div className="ml-5">
                  <dt className="text-sm font-medium text-gray-500">{card.title}</dt>
                  <dd className="text-2xl font-bold text-gray-900">{card.value}</dd>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow rounded-xl p-6 border border-gray-100">
           <h3 className="text-lg font-medium text-gray-900 mb-4">Niveles de Stock (Top 5)</h3>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={topProducts}>
                  <XAxis dataKey="name" tick={{fontSize: 10}} height={60} interval={0}/>
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="stock" radius={[4, 4, 0, 0]}>
                    {topProducts.map((entry, index) => (
                      <Cell key={index} fill={entry.stock === 0 ? '#EF4444' : entry.stock <= entry.minStock ? '#F59E0B' : '#10B981'} />
                    ))}
                  </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
        <div className="bg-white shadow rounded-xl p-6 border border-gray-100">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Productos en Alerta</h3>
          <ul className="divide-y divide-gray-200">
            {topProducts.filter(p => p.stock <= p.minStock).length > 0 ? (
              topProducts.filter(p => p.stock <= p.minStock).map((product) => (
                <li key={product.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{product.name}</p>
                    <p className="text-xs text-gray-500">{product.location || 'Sin ubicación'}</p>
                  </div>
                  <StockBadge stock={product.stock} minStock={product.minStock} />
                </li>
              ))
            ) : (
              <li className="py-10 text-center text-sm text-gray-400">No hay productos en estado crítico actualmente.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
};
