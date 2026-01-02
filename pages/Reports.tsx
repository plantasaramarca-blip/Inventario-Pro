
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
  TrendingUp, Filter, ArrowUpRight, ArrowDownRight, Package, RefreshCcw, PieChart as PieIcon, FileSpreadsheet, Archive, BarChart3 as BarChartIcon, Loader2
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

const EmptyState = ({ message }: { message: string }) => (
  <div className="col-span-full py-16 text-center animate-in fade-in">
    <RefreshCcw className="mx-auto w-10 h-10 text-slate-200 mb-4" />
    <p className="text-[10px] font-black text-slate-400 uppercase">{message}</p>
  </div>
);

interface ReportsProps {
  onNavigate: (page: string, options?: { push?: boolean; state?: any }) => void;
  products: Product[] | null;
  setProducts: (data: Product[]) => void;
  movements: Movement[] | null;
  setMovements: (data: Movement[]) => void;
}

export const Reports: React.FC<ReportsProps> = ({ onNavigate, products, setProducts, movements, setMovements }) => {
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotification();
  const today = new Date().toISOString().split('T')[0];
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({ from: lastMonth, to: today });

  useEffect(() => {
    const loadPageData = async () => {
      if (products === null || movements === null) {
        setLoading(true);
        try {
          const [pData, mData] = await Promise.all([
            products === null ? api.getProducts() : Promise.resolve(products),
            movements === null ? api.getMovements() : Promise.resolve(movements),
          ]);
          if (products === null) setProducts(pData || []);
          if (movements === null) setMovements(mData || []);
        } catch (e) {
          addNotification('Error al cargar datos para reportes.', 'error');
        } finally {
          setLoading(false);
        }
      }
    };
    loadPageData();
  }, [products, movements]);

  const filteredMovements = useMemo(() => {
    return (movements || []).filter(m => {
      const moveDate = new Date(m.date);
      const from = new Date(dateRange.from);
      const to = new Date(dateRange.to);
      to.setHours(23, 59, 59, 999);
      return moveDate >= from && moveDate <= to;
    });
  }, [movements, dateRange]);

  const topMovingProducts = useMemo(() => {
    const productMovements = filteredMovements.reduce((acc, move) => {
      acc[move.productId] = (acc[move.productId] || 0) + Math.abs(move.quantity);
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(productMovements)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([productId, quantity]) => {
        const product = products?.find(p => p.id === productId);
        return { name: product?.name || 'Desconocido', quantity };
      });
  }, [filteredMovements, products]);

  const stagnantProducts = useMemo(() => {
    const movedProductIds = new Set(filteredMovements.map(m => m.productId));
    return (products || [])
      .filter(p => !movedProductIds.has(p.id) && p.stock > 0)
      .sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
      .slice(0, 5);
  }, [filteredMovements, products]);

  const destinationData = useMemo(() => {
    const destinationCounts = filteredMovements
      .filter(m => m.type === 'SALIDA' && m.destinationName)
      .reduce((acc, move) => {
        const dest = move.destinationName || 'Sin Destino';
        acc[dest] = (acc[dest] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    return Object.entries(destinationCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a,b) => b.value - a.value);
  }, [filteredMovements]);
  
  const handleExportExcel = () => {
    try {
      const dataToExport = filteredMovements.map(m => ({
        Fecha: new Date(m.date).toLocaleString(),
        Tipo: m.type,
        Producto: m.productName,
        Cantidad: m.quantity,
        Responsable: m.dispatcher,
        Motivo: m.reason,
        'Centro de Costo': m.destinationName || 'N/A'
      }));
      exportToExcel(dataToExport, `Reporte_Movimientos_${dateRange.from}_a_${dateRange.to}`, 'Movimientos');
      addNotification('Reporte Excel generado.', 'success');
    } catch (e) {
      addNotification('No hay datos para exportar.', 'error');
    }
  };

  const chartData = useMemo(() => {
    const dataByDay: Record<string, { ingresos: number, salidas: number }> = {};
    filteredMovements.forEach(m => {
      const day = new Date(m.date).toISOString().split('T')[0];
      if (!dataByDay[day]) dataByDay[day] = { ingresos: 0, salidas: 0 };
      if (m.type === 'INGRESO') dataByDay[day].ingresos += 1;
      else dataByDay[day].salidas += 1;
    });
    return Object.entries(dataByDay)
      .map(([name, values]) => ({ name, ...values }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
  }, [filteredMovements]);
  
  const COLORS = ['#4f46e5', '#f59e0b', '#ef4444', '#64748b'];
  
  if (loading || !products || !movements) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-500" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in pb-10">
      <div className="flex justify-between items-center">
        <div><h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Reportes Avanzados</h1><p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Análisis de Movimientos</p></div>
        <button onClick={handleExportExcel} className="bg-emerald-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all"><FileSpreadsheet className="w-4 h-4" /> Exportar</button>
      </div>
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 text-xs">
        <Filter className="w-4 h-4 text-indigo-500" />
        <label className="font-bold">Desde:</label> <input type="date" value={dateRange.from} onChange={e => setDateRange({...dateRange, from: e.target.value})} className="bg-slate-100 p-2 rounded-lg font-bold" />
        <label className="font-bold">Hasta:</label> <input type="date" value={dateRange.to} onChange={e => setDateRange({...dateRange, to: e.target.value})} className="bg-slate-100 p-2 rounded-lg font-bold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><BarChartIcon className="w-4 h-4 text-indigo-500" /> Frecuencia de Operaciones</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: '1rem', padding: '0.5rem' }} />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: '1rem' }} />
                <Bar dataKey="ingresos" fill="#4f46e5" name="Ingresos" radius={[4, 4, 0, 0]} />
                <Bar dataKey="salidas" fill="#f43f5e" name="Salidas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState message="Sin datos en el rango seleccionado"/> }
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><PieIcon className="w-4 h-4 text-emerald-500" /> Top Centros de Costo</h3>
          {destinationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={destinationData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                  {destinationData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 10, paddingTop: '1rem' }} />
              </PieChart>
            </ResponsiveContainer>
          ) : <EmptyState message="Sin salidas registradas a destinos"/>}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-rose-500" /> Top Productos con más movimiento</h3>
          {topMovingProducts.length > 0 ? (
            <ul className="space-y-2">
              {topMovingProducts.map(p => <li key={p.name} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl text-xs"><span className="font-bold">{p.name}</span> <span className="font-black text-indigo-600">{p.quantity} ops.</span></li>)}
            </ul>
          ) : <EmptyState message="Sin movimientos de productos"/>}
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4 flex items-center gap-2"><Archive className="w-4 h-4 text-amber-500" /> Top Productos Estancados</h3>
          {stagnantProducts.length > 0 ? (
            <ul className="space-y-2">
              {stagnantProducts.map(p => <li key={p.id} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl text-xs"><span className="font-bold">{p.name}</span> <span className="text-slate-400 font-bold">{p.stock} {p.unit}</span></li>)}
            </ul>
          ) : <EmptyState message="Todos los productos tuvieron movimiento"/>}
        </div>
      </div>
    </div>
  );
};
