import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Product } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { formatCurrency } from '../utils/currencyUtils.ts';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'https://esm.sh/recharts@2.15.0?external=react,react-dom';
import { 
  TrendingUp, Filter, Loader2, ArrowUpRight, ArrowDownRight, Package, RefreshCcw
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

export const Reports: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState({ from: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0], to: new Date().toISOString().split('T')[0] });

  const loadData = async () => {
    setLoading(true); try { const [p, m] = await Promise.all([api.getProducts(), api.getMovements()]); setProducts(p || []); setMovements(m || []); } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <div className="h-[60vh] flex flex-col items-center justify-center"><Loader2 className="animate-spin h-8 w-8 text-indigo-600" /></div>;

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center">
        <div><h1 className="text-xl font-black text-slate-900 uppercase">Reportes Pro</h1><p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Análisis de Operaciones</p></div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-xl border">
          <Filter className="w-3.5 h-3.5 text-slate-300 ml-1" />
          <input type="date" className="text-[9px] font-black uppercase bg-transparent outline-none" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} />
          <input type="date" className="text-[9px] font-black uppercase bg-transparent outline-none" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Movimientos', val: movements.length, icon: RefreshCcw, color: 'bg-indigo-600' },
          { label: 'Salidas', val: movements.filter(m=>m.type==='SALIDA').length, icon: ArrowUpRight, color: 'bg-rose-500' },
          { label: 'Entradas', val: movements.filter(m=>m.type==='INGRESO').length, icon: ArrowDownRight, color: 'bg-emerald-500' },
          { label: 'Stock Total', val: products.reduce((s,p)=>s+p.stock,0), icon: Package, color: 'bg-slate-900' }
        ].map((c, i) => (
          <div key={i} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-3">
            <div className={`p-2 rounded-lg text-white ${c.color} shadow-md`}><c.icon className="w-4 h-4" /></div>
            <div><p className="text-[7px] font-black text-slate-400 uppercase mb-0.5">{c.label}</p><p className="text-xs font-black text-slate-800 tracking-tighter">{c.val}</p></div>
          </div>
        ))}
      </div>

      <div className="bg-white p-6 rounded-3xl border shadow-sm">
        <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-600" /> Histórico de Flujo</h3>
        <div className="h-64"><ResponsiveContainer width="100%" height="100%"><LineChart data={movements.slice(0,10).reverse()}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" /><XAxis dataKey="date" hide /><YAxis fontSize={9} font-black /><Tooltip contentStyle={{ borderRadius: '12px' }} /><Line type="monotone" dataKey="quantity" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} /></LineChart></ResponsiveContainer></div>
      </div>
    </div>
  );
};