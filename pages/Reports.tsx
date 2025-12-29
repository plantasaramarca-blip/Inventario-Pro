import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Product } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { formatCurrency } from '../utils/currencyUtils.ts';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, Filter, Loader2, ArrowUpRight, ArrowDownRight, Package, RefreshCcw, PieChart as PieIcon
} from 'lucide-react';

export const Reports: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  
  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ from: lastMonth, to: today });

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([api.getProducts(), api.getMovements()]);
      setProducts(p || []);
      setMovements(m || []);
    } catch (e) {
      console.error("Error loading report data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const mDate = m.date.split('T')[0];
      return mDate >= dateRange.from && mDate <= dateRange.to;
    });
  }, [movements, dateRange]);

  const chartData = useMemo(() => {
    if (!filteredMovements.length) return [];
    const daily: Record<string, any> = {};
    const recentMovements = [...filteredMovements].reverse().slice(-15);
    recentMovements.forEach(m => {
      const date = m.date.split('T')[0];
      if (!daily[date]) daily[date] = { date, entradas: 0, salidas: 0 };
      if (m.type === 'INGRESO') daily[date].entradas += m.quantity;
      else daily[date].salidas += m.quantity;
    });
    return Object.values(daily);
  }, [filteredMovements]);

  const COLORS = ['#4f46e5', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center">
      <Loader2 className="animate-spin h-8 w-8 text-indigo-600" />
      <p className="mt-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">Generando Análisis...</p>
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900 uppercase">Reportes Pro</h1>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Análisis de Operaciones</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border border-slate-100 shadow-sm">
          <Filter className="w-3 h-3 text-slate-300 ml-1" />
          <input type="date" className="text-[9px] font-black uppercase bg-transparent outline-none p-1" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} />
          <span className="text-slate-200">/</span>
          <input type="date" className="text-[9px] font-black uppercase bg-transparent outline-none p-1" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Movimientos', val: filteredMovements.length, icon: RefreshCcw, color: 'bg-indigo-600' },
          { label: 'Salidas', val: filteredMovements.filter(m=>m.type==='SALIDA').reduce((s,m)=>s+m.quantity,0), icon: ArrowUpRight, color: 'bg-rose-500' },
          { label: 'Entradas', val: filteredMovements.filter(m=>m.type==='INGRESO').reduce((s,m)=>s+m.quantity,0), icon: ArrowDownRight, color: 'bg-emerald-500' },
          { label: 'Valorización', val: formatCurrency(products.reduce((s,p)=>s+(p.stock*p.purchasePrice),0)), icon: Package, color: 'bg-slate-900' }
        ].map((c, i) => (
          <div key={i} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className={`p-2 rounded-lg text-white ${c.color} shadow-md`}><c.icon className="w-3.5 h-3.5" /></div>
            <div>
              <p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">{c.label}</p>
              <p className="text-[10px] font-black text-slate-800 tracking-tighter truncate">{c.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-[2rem] border shadow-sm">
          <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-600" /> Flujo de Inventario</h3>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={8} tick={{fontWeight: 700}} />
                <YAxis fontSize={8} tick={{fontWeight: 700}} />
                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Legend wrapperStyle={{ paddingTop: '15px', fontSize: '9px', fontWeight: 700 }} />
                <Line type="monotone" dataKey="entradas" stroke="#4f46e5" strokeWidth={3} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="salidas" stroke="#ef4444" strokeWidth={3} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-5 rounded-[2rem] border shadow-sm flex flex-col items-center">
          <h3 className="text-[9px] font-black text-slate-800 uppercase tracking-widest mb-6 w-full flex items-center gap-2"><PieIcon className="w-4 h-4 text-indigo-600" /> Distribución de Stock</h3>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={[
                    { name: 'Disponibles', value: products.filter(p=>p.stock>p.minStock).length },
                    { name: 'Bajos', value: products.filter(p=>p.stock<=p.minStock && p.stock>p.criticalStock).length },
                    { name: 'Críticos', value: products.filter(p=>p.stock<=p.criticalStock && p.stock>0).length },
                    { name: 'Agotados', value: products.filter(p=>p.stock<=0).length }
                  ]} 
                  innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value"
                >
                  {COLORS.map((col, idx) => <Cell key={`cell-${idx}`} fill={col} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none' }} />
                <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '8px', fontWeight: 700 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};