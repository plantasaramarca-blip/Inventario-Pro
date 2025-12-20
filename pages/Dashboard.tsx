import React, { useEffect, useState } from 'react';
import * as api from '../services/supabaseService';
import { InventoryStats, Product } from '../types';
import { TrendingUp, AlertTriangle, PackageX, Package } from 'lucide-react';
import { StockBadge } from '../components/StockBadge';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

  if (loading || !stats) return <div className="p-10 text-center text-gray-500">Cargando datos desde la nube...</div>;

  const cards = [
    { title: 'Total Productos', value: stats.totalProducts, icon: Package, color: 'bg-blue-500' },
    { title: 'Stock Crítico', value: stats.outOfStockCount, icon: PackageX, color: 'bg-red-500' },
    { title: 'Stock Bajo', value: stats.lowStockCount, icon: AlertTriangle, color: 'bg-yellow-500' },
    { title: 'Total Movimientos', value: stats.totalMovements, icon: TrendingUp, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Resumen en Tiempo Real</h1>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div key={idx} className="bg-white shadow rounded-xl p-5 border border-gray-100">
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
           <h3 className="text-lg font-medium text-gray-900 mb-4">Niveles de Stock</h3>
           <div className="h-64">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={topProducts}>
                  <XAxis dataKey="name" tick={{fontSize: 10}} height={60}/>
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
          <h3 className="text-lg font-medium text-gray-900 mb-4">Críticos (Min. {topProducts.length > 0 ? topProducts[0].minStock : '-'})</h3>
          <ul className="divide-y divide-gray-200">
            {topProducts.filter(p => p.stock <= p.minStock).map((product) => (
              <li key={product.id} className="py-3 flex justify-between items-center">
                <div><p className="text-sm font-medium">{product.name}</p><p className="text-xs text-gray-500">{product.location}</p></div>
                <StockBadge stock={product.stock} minStock={product.minStock} />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};