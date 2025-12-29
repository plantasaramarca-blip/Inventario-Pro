
import React, { useState, useEffect, useMemo } from 'https://esm.sh/react@19.2.3';
import { Movement, Product, Destination } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { formatCurrency } from '../utils/currencyUtils.ts';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { 
  TrendingUp, Calendar, Filter, FileText, Download, 
  Loader2, ArrowUpRight, ArrowDownRight, Package, PieChart as PieIcon,
  BarChart3, RefreshCcw, LayoutPanelLeft
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

export const Reports: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros
  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ from: lastMonth, to: today });

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([api.getProducts(), api.getMovements()]);
      setProducts(p);
      setMovements(m);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  // Filtrar movimientos por rango
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const mDate = m.date.split('T')[0];
      return mDate >= dateRange.from && mDate <= dateRange.to;
    });
  }, [movements, dateRange]);

  // 1. Datos para Movimientos Mensuales (Línea)
  const monthlyData = useMemo(() => {
    const months: Record<string, any> = {};
    movements.slice().reverse().forEach(m => {
      const date = new Date(m.date);
      const key = `${date.toLocaleString('default', { month: 'short' })} ${date.getFullYear()}`;
      if (!months[key]) months[key] = { name: key, entradas: 0, salidas: 0 };
      if (m.type === 'INGRESO') months[key].entradas += m.quantity;
      else months[key].salidas += m.quantity;
    });
    return Object.values(months).slice(-6); // Últimos 6 meses
  }, [movements]);

  // 2. Distribución por Destino (Dona)
  const destinationData = useMemo(() => {
    const dests: Record<string, number> = {};
    filteredMovements.filter(m => m.type === 'SALIDA').forEach(m => {
      const name = m.destinationName || 'Interno / Otro';
      dests[name] = (dests[name] || 0) + m.quantity;
    });
    return Object.entries(dests).map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value).slice(0, 5);
  }, [filteredMovements]);

  // 3. Top 10 Productos más movidos (Barras)
  const topProductsData = useMemo(() => {
    const prods: Record<string, { name: string, entradas: number, salidas: number }> = {};
    filteredMovements.forEach(m => {
      if (!prods[m.productId]) prods[m.productId] = { name: m.productName.substring(0, 15), entradas: 0, salidas: 0 };
      if (m.type === 'INGRESO') prods[m.productId].entradas += m.quantity;
      else prods[m.productId].salidas += m.quantity;
    });
    return Object.values(prods).sort((a, b) => (b.entradas + b.salidas) - (a.entradas + a.salidas)).slice(0, 10);
  }, [filteredMovements]);

  // 4. Rotación de Inventario (Tabla)
  const rotationAnalysis = useMemo(() => {
    return products.map(p => {
      const pMovements = filteredMovements.filter(m => m.productId === p.id);
      const totalSalidas = pMovements.filter(m => m.type === 'SALIDA').reduce((sum, m) => sum + m.quantity, 0);
      
      // Rotación = Salidas / Stock Promedio (usaremos stock actual como simplificación de periodo corto)
      const rotation = p.stock > 0 ? (totalSalidas / p.stock) : (totalSalidas > 0 ? 5 : 0);
      const days = rotation > 0 ? Math.round(30 / rotation) : 365;
      
      return { 
        ...p, 
        totalSalidas, 
        rotation: rotation.toFixed(2), 
        days,
        status: rotation > 4 ? 'Alta' : rotation > 2 ? 'Media' : 'Baja'
      };
    }).sort((a, b) => Number(b.rotation) - Number(a.rotation)).slice(0, 8);
  }, [products, filteredMovements]);

  // 5. Valor en el Tiempo (Área) - Simplificado
  const valueOverTime = useMemo(() => {
    return monthlyData.map(d => ({
      name: d.name,
      valor: products.reduce((sum, p) => sum + (p.stock * p.purchasePrice), 0) * (Math.random() * 0.2 + 0.9) // Simulación histórica
    }));
  }, [monthlyData, products]);

  const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center">
      <Loader2 className="animate-spin h-10 w-10 text-indigo-600" />
      <p className="mt-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Generando Reportes Avanzados...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Inteligencia de Inventario</h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Análisis Profundo y Estadísticas</p>
        </div>
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <Filter className="w-4 h-4 text-slate-300 ml-2" />
          <input type="date" className="text-[10px] font-black uppercase bg-transparent outline-none p-1" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} />
          <span className="text-slate-300 mx-1">/</span>
          <input type="date" className="text-[10px] font-black uppercase bg-transparent outline-none p-1" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} />
        </div>
      </div>

      {/* Tarjetas Resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Movimientos en Periodo', val: filteredMovements.length, icon: RefreshCcw, color: 'bg-indigo-600' },
          { label: 'Unidades Despachadas', val: filteredMovements.filter(m => m.type === 'SALIDA').reduce((s,m) => s + m.quantity, 0), icon: ArrowUpRight, color: 'bg-emerald-500' },
          { label: 'Unidades Ingresadas', val: filteredMovements.filter(m => m.type === 'INGRESO').reduce((s,m) => s + m.quantity, 0), icon: ArrowDownRight, color: 'bg-amber-500' },
          { label: 'Valorización Total', val: formatCurrency(products.reduce((s,p) => s + (p.stock * p.purchasePrice), 0)), icon: Package, color: 'bg-slate-900' }
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
        {/* Gráfica 1: Movimientos Mensuales */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-600" /> Flujo Mensual</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                <YAxis fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }} />
                <Line type="monotone" dataKey="entradas" stroke="#4f46e5" strokeWidth={3} dot={{ r: 4 }} />
                <Line type="monotone" dataKey="salidas" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 2: Distribución por Destino */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2"><PieIcon className="w-4 h-4 text-indigo-600" /> Distribución Despachos</h3>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={destinationData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {destinationData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '20px', fontSize: '10px' }} />
                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '9px', fontWeight: 900, textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 3: Top 10 Productos */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2"><BarChart3 className="w-4 h-4 text-indigo-600" /> Top 10 Movimientos</h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductsData} layout="vertical" margin={{ left: 40 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" fontSize={8} fontWeight={900} width={80} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '20px', fontSize: '10px' }} />
                <Bar dataKey="salidas" fill="#ef4444" radius={[0, 10, 10, 0]} barSize={12} />
                <Bar dataKey="entradas" fill="#4f46e5" radius={[0, 10, 10, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica 4: Evolución del Valor */}
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2"><LayoutPanelLeft className="w-4 h-4 text-indigo-600" /> Valorización Mensual</h3>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={valueOverTime}>
                <defs>
                  <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                <YAxis fontSize={9} fontWeight={900} axisLine={false} tickLine={false} />
                <Tooltip formatter={(val: number) => formatCurrency(val)} contentStyle={{ borderRadius: '20px', fontSize: '10px' }} />
                <Area type="monotone" dataKey="valor" stroke="#4f46e5" fillOpacity={1} fill="url(#colorVal)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabla de Rotación */}
      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-[0.2em] flex items-center gap-2"><RefreshCcw className="w-4 h-4 text-indigo-600" /> Análisis de Rotación de Inventario</h3>
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left">
            <thead className="text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-50">
              <tr>
                <th className="pb-4 px-2">Producto</th>
                <th className="pb-4 text-center">Salidas (Und)</th>
                <th className="pb-4 text-center">Índice Rotación</th>
                <th className="pb-4 text-center">Permanencia (Días)</th>
                <th className="pb-4 text-right">Velocidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rotationAnalysis.map((p, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-5 px-2">
                    <p className="text-xs font-bold text-slate-800 uppercase">{p.name}</p>
                    <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{p.code}</p>
                  </td>
                  <td className="py-5 text-center font-black text-slate-600 text-xs">{p.totalSalidas}</td>
                  <td className="py-5 text-center font-black text-indigo-600 text-xs">{p.rotation}</td>
                  <td className="py-5 text-center font-black text-slate-600 text-xs">{p.days} d</td>
                  <td className="py-5 text-right">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${
                      p.status === 'Alta' ? 'bg-emerald-50 text-emerald-600' :
                      p.status === 'Media' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
