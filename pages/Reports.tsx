
import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Product } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { formatCurrency } from '../utils/currencyUtils.ts';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { 
  TrendingUp, Filter, Loader2, ArrowUpRight, ArrowDownRight, Package, 
  PieChart as PieIcon, RefreshCcw
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
      console.error("Error cargando datos de reporte:", e);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const filteredMovements = useMemo(() => {
    if (!movements) return [];
    return movements.filter(m => {
      const mDate = m.date.split('T')[0];
      return mDate >= dateRange.from && mDate <= dateRange.to;
    });
  }, [movements, dateRange]);

  const monthlyData = useMemo(() => {
    if (!movements) return [];
    const months: Record<string, any> = {};
    movements.slice().reverse().forEach(m => {
      const date = new Date(m.date);
      const key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      if (!months[key]) months[key] = { name: key, entradas: 0, salidas: 0 };
      if (m.type === 'INGRESO') months[key].entradas += m.quantity;
      else months[key].salidas += m.quantity;
    });
    return Object.values(months).slice(-6);
  }, [movements]);

  const destinationData = useMemo(() => {
    const dests: Record<string, number> = {};
    filteredMovements.filter(m => m.type === 'SALIDA').forEach(m => {
      const name = m.destinationName || 'Interno / Otro';
      dests[name] = (dests[name] || 0) + m.quantity;
    });
    return Object.entries(dests).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredMovements]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center">
      <Loader2 className="animate-spin h-10 w-10 text-indigo-600" />
      <p className="mt-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Generando Reportes...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Reportes Pro</h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Análisis de Movimientos</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <Filter className="w-4 h-4 text-slate-300 ml-2" />
          <input type="date" className="text-[10px] font-black uppercase bg-transparent outline-none p-1" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} />
          <span className="text-slate-300 mx-1">/</span>
          <input type="date" className="text-[10px] font-black uppercase bg-transparent outline-none p-1" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Movimientos', val: filteredMovements.length, icon: RefreshCcw, color: 'bg-indigo-600' },
          { label: 'Salidas', val: filteredMovements.filter(m => m.type === 'SALIDA').reduce((s,m) => s + m.quantity, 0), icon: ArrowUpRight, color: 'bg-emerald-500' },
          { label: 'Entradas', val: filteredMovements.filter(m => m.type === 'INGRESO').reduce((s,m) => s + m.quantity, 0), icon: ArrowDownRight, color: 'bg-amber-500' },
          { label: 'Valorización', val: formatCurrency(products.reduce((s,p) => s + (p.stock * p.purchasePrice), 0)), icon: Package, color: 'bg-slate-900' }
        ].map((c, i) => (
          <div key={i} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4">
            <div className={`p-3 rounded-2xl text-white ${c.color} shadow-lg`}><c.icon className="w-5 h-5" /></div>
            <div>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">{c.label}</p>
              <p className="text-sm font-black text-slate-800 tracking-tighter">{c.val}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-600" /> Histórico Mensual
          </h3>
          <div className="h-64 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%" debounce={1}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={9} fontWeight={900} />
                <YAxis fontSize={9} fontWeight={900} />
                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 900 }} />
                <Line type="monotone" dataKey="entradas" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="salidas" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-indigo-600" /> Por Centro de Costo
          </h3>
          <div className="h-64 w-full min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%" debounce={1}>
              <PieChart>
                <Pie 
                  data={destinationData} 
                  innerRadius={60} 
                  outerRadius={80} 
                  paddingAngle={5}
                  dataKey="value"
                >
                  {destinationData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '15px', border: 'none' }} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '9px', fontWeight: 900 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
