
import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Product } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { formatCurrency } from '../utils/currencyUtils.ts';
import { exportToExcel } from '../services/excelService.ts';
import { useNotification } from '../contexts/NotificationContext.tsx';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, Filter, ArrowUpRight, ArrowDownRight, Package, RefreshCcw, PieChart as PieIcon, FileSpreadsheet, Archive, BarChart3 as BarChartIcon
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

const EmptyState = ({ message }: { message: string }) => (
  <div className="h-full flex flex-col items-center justify-center text-center text-slate-400 p-10">
    <BarChartIcon className="w-10 h-10 mb-3" />
    <p className="text-[9px] font-black uppercase tracking-widest">{message}</p>
  </div>
);

interface ReportsProps {
  onNavigate: (page: string, options?: { push?: boolean; state?: any }) => void;
  products: Product[];
  movements: Movement[];
}

export const Reports: React.FC<ReportsProps> = ({ onNavigate, products, movements }) => {
  const { addNotification } = useNotification();
  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ from: lastMonth, to: today });

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
      .sort(([, qtyA], [, qtyB]) => qtyB - qtyA)
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
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);
  }, [filteredMovements]);

  const handleExportExcel = () => {
    if (filteredMovements.length === 0) {
      addNotification('No hay datos para exportar en el rango seleccionado.', 'error');
      return;
    }
    const data = filteredMovements.map(m => ({
      Fecha: new Date(m.date).toLocaleString(),
      Producto: m.productName,
      Tipo: m.type,
      Cantidad: m.quantity,
      Responsable: m.dispatcher,
      Destino: m.destinationName || '-',
      Saldo_Final: m.balanceAfter
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

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase">Reportes Pro</h1>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Indicadores Críticos de Gestión</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            onClick={handleExportExcel} 
            className="flex-1 sm:flex-none bg-emerald-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-emerald-100 hover:bg-emerald-700 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" /> EXPORTAR EXCEL
          </button>
          <div className="flex items-center gap-2 bg-white px-3 py-3 rounded-2xl border border-slate-200 shadow-sm flex-1 sm:flex-none">
            <Filter className="w-3.5 h-3.5 text-slate-300" />
            <input type="date" className="text-[9px] font-black uppercase bg-transparent outline-none" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} />
            <span className="text-slate-200">/</span>
            <input type="date" className="text-[9px] font-black uppercase bg-transparent outline-none" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Movimientos', val: filteredMovements.length, icon: RefreshCcw, color: 'bg-indigo-600' },
          { label: 'Total Salidas', val: filteredMovements.filter(m=>m.type==='SALIDA').reduce((s,m)=>s+Number(m.quantity),0), icon: ArrowUpRight, color: 'bg-rose-500' },
          { label: 'Total Entradas', val: filteredMovements.filter(m=>m.type==='INGRESO').reduce((s,m)=>s+Number(m.quantity),0), icon: ArrowDownRight, color: 'bg-emerald-500' },
          { label: 'Valorización', val: formatCurrency(products.reduce((s,p)=>s+(p.stock*p.purchasePrice),0)), icon: Package, color: 'bg-slate-900' }
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-8 flex items-center gap-3"><TrendingUp className="w-5 h-5 text-indigo-600" /> Histórico de Flujo</h3>
          <div className="h-64 min-h-[300px]">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" fontSize={8} tick={{fontWeight: 800}} stroke="#cbd5e1" />
                  <YAxis fontSize={8} tick={{fontWeight: 800}} stroke="#cbd5e1" />
                  <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 800 }} />
                  <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '9px', fontWeight: 800, textTransform: 'uppercase' }} />
                  <Line type="monotone" dataKey="entradas" stroke="#4f46e5" strokeWidth={4} dot={{ r: 4, fill: '#4f46e5', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="salidas" stroke="#ef4444" strokeWidth={4} dot={{ r: 4, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyState message="Sin datos de flujo para este período" />}
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col items-center">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-8 w-full flex items-center gap-3"><PieIcon className="w-5 h-5 text-indigo-600" /> Distribución Logística</h3>
          <div className="h-64 w-full min-h-[300px]">
            {products.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <PieChart>
                  <Pie 
                    data={[
                      { name: 'Suficiente', value: products.filter(p=>p.stock>p.minStock).length },
                      { name: 'Stock Bajo', value: products.filter(p=>p.stock<=p.minStock && p.stock>p.criticalStock).length },
                      { name: 'Crítico', value: products.filter(p=>p.stock<=p.criticalStock && p.stock>0).length },
                      { name: 'Sin Stock', value: products.filter(p=>p.stock<=0).length }
                    ]} 
                    innerRadius={60} outerRadius={85} paddingAngle={8} dataKey="value" stroke="none"
                    cornerRadius={5}
                  >
                    {COLORS.map((col, idx) => <Cell key={`cell-${idx}`} fill={col} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', fontSize: '10px', fontWeight: 800 }} />
                  <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '9px', fontWeight: 800, paddingTop: '10px' }} />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyState message="No hay productos registrados" />}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6">Análisis de Rotación</h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="flex items-center gap-2 text-[9px] font-black uppercase text-emerald-600 tracking-widest mb-3"><TrendingUp className="w-4 h-4" /> Mayor Rotación</h4>
              {topMovingProducts.length > 0 ? (
                <ul className="space-y-2">
                  {topMovingProducts.map(({ product, quantity }) => (
                    <li key={product!.id}>
                      <button onClick={() => onNavigate('productDetail', { push: true, state: { productId: product!.id } })} className="w-full bg-emerald-50/50 p-2.5 rounded-xl text-[10px] flex justify-between items-center text-left hover:bg-emerald-100 transition-colors">
                        <span className="font-bold uppercase truncate pr-2 w-2/3">{product!.name}</span>
                        <span className="font-black text-emerald-700">{quantity}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-center text-slate-400 text-[9px] font-bold uppercase py-10">Sin salidas</p>}
            </div>
            <div>
              <h4 className="flex items-center gap-2 text-[9px] font-black uppercase text-rose-600 tracking-widest mb-3"><Archive className="w-4 h-4" /> Estancados</h4>
              {stagnantProducts.length > 0 ? (
                <ul className="space-y-2">
                  {stagnantProducts.map(product => (
                    <li key={product.id}>
                      <button onClick={() => onNavigate('productDetail', { push: true, state: { productId: product.id } })} className="w-full bg-rose-50/50 p-2.5 rounded-xl text-[10px] flex justify-between items-center text-left hover:bg-rose-100 transition-colors">
                        <span className="font-bold uppercase truncate pr-2 w-2/3">{product.name}</span>
                        <span className="font-black text-rose-700">Stock: {product.stock}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-center text-slate-400 text-[9px] font-bold uppercase py-10">Sin estancados</p>}
            </div>
          </div>
        </div>
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6">Despacho por Centro de Costo</h3>
          <div className="h-64 min-h-[250px]">
            {destinationData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                <BarChart data={destinationData} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" fontSize={8} tick={{fontWeight: 800}} stroke="#cbd5e1" />
                  <YAxis type="category" dataKey="name" width={80} tick={{fontSize: 8, width: 75}} style={{textTransform: 'uppercase', fontWeight: 800}} stroke="#94a3b8" />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '20px', border: 'none', fontSize: '10px', fontWeight: 800 }} />
                  <Bar dataKey="quantity" fill="#4f46e5" barSize={15} radius={[0, 10, 10, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState message="Sin despachos a centros de costo" />}
          </div>
        </div>
      </div>
    </div>
  );
};
