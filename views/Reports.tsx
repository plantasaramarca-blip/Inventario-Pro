
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Product } from '../types';
import * as api from '../services/supabaseService';
import { formatCurrency } from '../utils/currencyUtils';
import { exportToExcel } from '../services/excelService';
import { useNotification } from '../contexts/NotificationContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import {
  TrendingUp, Filter, ArrowUpRight, ArrowDownRight, Package, RefreshCcw, PieChart as PieIcon, FileSpreadsheet, Archive, BarChart3 as BarChartIcon, Loader2
} from 'lucide-react';

const EmptyState = ({ message }: { message: string }) => (
  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-10">
    <BarChartIcon className="w-10 h-10 mb-3" />
    <p className="text-[9px] font-black uppercase tracking-widest">{message}</p>
  </div>
);

interface ReportsProps {
  onNavigate: (page: string, options?: { push?: boolean; state?: any }) => void;
}

export const Reports: React.FC<ReportsProps> = ({ onNavigate }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotification();
  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ from: lastMonth, to: today });

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [{ products: prods }, movs] = await Promise.all([api.getProducts({ fetchAll: true }), api.getMovements()]);
        setProducts(prods || []);
        setMovements(movs || []);
      } catch (e) {
        addNotification('Error al cargar datos para reportes.', 'error');
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const mDate = m.date.split('T')[0];
      return mDate >= dateRange.from && mDate <= dateRange.to;
    });
  }, [movements, dateRange]);

  const topMovingProducts = useMemo(() => {
    const counts = filteredMovements
      .filter(m => m.type === 'SALIDA')
      .reduce<Record<string, number>>((acc, m) => {
        acc[m.productId] = (acc[m.productId] || 0) + Number(m.quantity);
        return acc;
      }, {});

    return Object.entries(counts)
      .sort(([, qtyA], [, qtyB]) => Number(qtyB) - Number(qtyA))
      .slice(0, 5)
      .map(([productId, quantity]) => ({
        product: products.find(p => p.id === productId),
        quantity,
      }))
      .filter(item => item.product);
  }, [filteredMovements, products]);

  const stagnantProducts = useMemo(() => {
    const movedProductIds = new Set(filteredMovements.map(m => m.productId));
    return products.filter(p => !movedProductIds.has(p.id) && p.stock > 0).slice(0, 5);
  }, [filteredMovements, products]);

  const destinationData = useMemo(() => {
    const counts = filteredMovements
      .filter(m => m.type === 'SALIDA' && m.destinationName)
      .reduce<Record<string, number>>((acc, m) => {
        acc[m.destinationName!] = (acc[m.destinationName!] || 0) + Number(m.quantity);
        return acc;
      }, {});

    return Object.entries(counts)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => Number(b.quantity) - Number(a.quantity))
      .slice(0, 8);
  }, [filteredMovements]);

  const handleExportExcel = () => {
    if (filteredMovements.length === 0) {
      addNotification('No hay datos para exportar en el rango seleccionado.', 'error');
      return;
    }
    const data = filteredMovements.map(m => ({
      Fecha: new Date(m.date).toLocaleString(), Producto: m.productName, Tipo: m.type,
      Cantidad: m.quantity, Responsable: m.dispatcher, Destino: m.destinationName || '-', Saldo_Final: m.balanceAfter
    }));
    exportToExcel(data, `Reporte_Movimientos_${dateRange.from}_${dateRange.to}`, "Movimientos");
  };

  const chartData = useMemo(() => {
    if (!filteredMovements.length) return [];
    const daily: Record<string, any> = {};
    const recentMovements = [...filteredMovements].reverse();
    recentMovements.forEach(m => {
      const date = m.date.split('T')[0];
      if (!daily[date]) daily[date] = { date, entradas: 0, salidas: 0 };
      if (m.type === 'INGRESO') daily[date].entradas += Number(m.quantity);
      else daily[date].salidas += Number(m.quantity);
    });
    return Object.values(daily).slice(-10);
  }, [filteredMovements]);

  const COLORS = ['#4f46e5', '#f59e0b', '#ef4444', '#64748b'];

  if (loading) return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-500" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">Reportes Pro</h1>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Indicadores Críticos de Gestión</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={handleExportExcel} className="flex-1 sm:flex-none bg-emerald-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95">
            <FileSpreadsheet className="w-4 h-4" /> EXPORTAR EXCEL
          </button>
          <div className="flex items-center gap-2 bg-white px-3 py-3 rounded-2xl border border-slate-200 shadow-sm flex-1 sm:flex-none">
            <Filter className="w-3.5 h-3.5 text-slate-300" />
            <input type="date" className="text-[9px] font-black uppercase bg-transparent outline-none" value={dateRange.from} onChange={e => setDateRange({ ...dateRange, from: e.target.value })} />
            <span className="text-slate-200">/</span>
            <input type="date" className="text-[9px] font-black uppercase bg-transparent outline-none" value={dateRange.to} onChange={e => setDateRange({ ...dateRange, to: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Movimientos', val: filteredMovements.length, icon: RefreshCcw, color: 'bg-indigo-600' },
          { label: 'Total Salidas', val: filteredMovements.filter(m => m.type === 'SALIDA').reduce((s, m) => s + Number(m.quantity), 0), icon: ArrowUpRight, color: 'bg-rose-500' },
          { label: 'Total Entradas', val: filteredMovements.filter(m => m.type === 'INGRESO').reduce((s, m) => s + Number(m.quantity), 0), icon: ArrowDownRight, color: 'bg-emerald-500' },
          { label: 'Valorización', val: formatCurrency(products.reduce((s, p) => s + (p.stock * p.purchasePrice), 0)), icon: Package, color: 'bg-slate-900' }
        ].map((c, i) => (
          <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-2xl text-white ${c.color} shadow-lg`}><c.icon className="w-4 h-4" /></div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{c.label}</p>
              <p className="text-sm font-black text-slate-800 tracking-tighter truncate">{c.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm h-80 flex flex-col">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Tendencia de Movimientos (Últimos 10 días)</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '1rem', padding: '8px' }} />
                <Legend wrapperStyle={{ fontSize: "10px" }} />
                <Line type="monotone" dataKey="entradas" stroke="#10b981" strokeWidth={2} />
                <Line type="monotone" dataKey="salidas" stroke="#f43f5e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyState message="Sin datos en el rango para mostrar tendencia" />}
        </div>
        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm h-80 flex flex-col">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Distribución de Salidas por Destino</h3>
          {destinationData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={destinationData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 9 }} stroke="#94a3b8" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 8 }} stroke="#94a3b8" width={80} />
                <Tooltip contentStyle={{ fontSize: '10px', borderRadius: '1rem', padding: '8px' }} />
                <Bar dataKey="quantity" fill="#4f46e5" barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState message="Sin datos de salidas por destino en este rango" />}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Productos con Mayor Rotación (Salidas)</h3>
          {topMovingProducts.length > 0 ? (
            <ul className="space-y-2">
              {topMovingProducts.map(({ product, quantity }) => (
                <li key={product!.id} onClick={() => onNavigate('productDetail', { push: true, state: { productId: product!.id } })} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-2xl cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{product!.name}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">{product!.code}</p>
                  </div>
                  <p className="text-sm font-black text-rose-500">{quantity} unds.</p>
                </li>
              ))}
            </ul>
          ) : <EmptyState message="Sin datos de rotación de productos" />}
        </div>
        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Productos Estancados (Sin movimientos y con stock)</h3>
          {stagnantProducts.length > 0 ? (
            <ul className="space-y-2">
              {stagnantProducts.map(p => (
                <li key={p.id} onClick={() => onNavigate('productDetail', { push: true, state: { productId: p.id } })} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-2xl cursor-pointer">
                  <div>
                    <p className="text-xs font-bold text-slate-800">{p.name}</p>
                    <p className="text-[8px] font-black text-slate-400 uppercase">{p.code}</p>
                  </div>
                  <p className="text-sm font-black text-amber-500">{p.stock} unds.</p>
                </li>
              ))}
            </ul>
          ) : <EmptyState message="Todos los productos con stock tuvieron movimiento" />}
        </div>
      </div>
    </div>
  );
};