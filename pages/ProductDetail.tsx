
import React, { useState, useEffect } from 'react';
import { Product, Movement, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { formatCurrency } from '../utils/currencyUtils.ts';
import { StockBadge } from '../components/StockBadge.tsx';
import { 
  ArrowLeft, ImageIcon, Loader2, RefreshCcw, ArrowUpCircle, ArrowDownCircle,
  ArrowUp, ArrowDown, UserCheck
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

interface ProductDetailProps {
  productId: string | null;
  role: Role;
  userEmail?: string;
  onBack: () => void;
  onNavigate: (page: string, options: { push?: boolean, state?: any }) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({ productId, role, userEmail, onBack, onNavigate }) => {
  const [product, setProduct] = useState<Product | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const loadData = async () => {
    if (!productId) { setError(true); setLoading(false); return; }
    setLoading(true); setError(false);
    try {
      const [productData, movementsData] = await Promise.all([
        api.getProductById(productId),
        api.getMovementsByProductId(productId)
      ]);
      
      if (!productData) { setError(true); return; }
      setProduct(productData);
      setMovements(movementsData || []);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [productId]);

  if (loading) return (
    <div className="h-[70vh] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin h-12 w-12 text-indigo-600" />
      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cargando Producto...</p>
    </div>
  );

  if (error || !product) return (
    <div className="h-[70vh] flex flex-col items-center justify-center text-center p-4">
      <RefreshCcw className="h-12 w-12 text-rose-500 mx-auto mb-4" />
      <h3 className="text-sm font-black text-slate-800 uppercase mb-2">Producto no encontrado</h3>
      <p className="text-[10px] font-bold text-slate-400 uppercase mb-6">El código escaneado no corresponde a un producto válido.</p>
      <button onClick={onBack} className="bg-slate-800 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Volver al Inventario</button>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in pb-20">
      <button onClick={onBack} className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
            <div className="aspect-square bg-slate-50 rounded-[2rem] border overflow-hidden mb-5">
              {product.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-200 w-16 h-16 m-auto" />}
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">{product.name}</h1>
            <p className="text-sm font-bold text-slate-400 uppercase">{product.code}</p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex justify-between items-center">
              <StockBadge stock={product.stock} minStock={product.minStock} criticalStock={product.criticalStock} />
              <div><span className="text-2xl font-black text-indigo-600">{product.stock}</span><span className="text-xs font-bold text-slate-400 uppercase ml-1.5">{product.unit}</span></div>
            </div>
          </div>
          {role !== 'VIEWER' && (
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => onNavigate('kardex', { push: true, state: { prefill: { type: 'INGRESO', product } } })}
                className="bg-indigo-50 text-indigo-600 p-4 rounded-2xl flex flex-col items-center justify-center text-[9px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all">
                <ArrowUpCircle className="w-6 h-6 mb-2" /> Ingreso
              </button>
              <button 
                onClick={() => onNavigate('kardex', { push: true, state: { prefill: { type: 'SALIDA', product } } })}
                className="bg-rose-50 text-rose-600 p-4 rounded-2xl flex flex-col items-center justify-center text-[9px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all">
                <ArrowDownCircle className="w-6 h-6 mb-2" /> Despacho
              </button>
            </div>
          )}
        </div>
        
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">Historial Reciente del Producto</h3>
          <div className="space-y-2">
            {movements.length === 0 ? (
              <p className="text-center text-xs text-slate-400 py-10">Sin movimientos registrados.</p>
            ) : movements.map(m => (
              <div key={m.id} className="p-4 rounded-2xl bg-slate-50/70 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${m.type === 'INGRESO' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                    {m.type === 'INGRESO' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                  </div>
                  <div>
                    <p className={`font-black text-sm ${m.type === 'INGRESO' ? 'text-indigo-600' : 'text-rose-600'}`}>{m.type === 'INGRESO' ? '+' : '-'}{m.quantity}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">{new Date(m.date).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-1.5 text-[9px] font-black text-indigo-500 uppercase">
                    <UserCheck className="w-3.5 h-3.5" /> {m.dispatcher?.split('@')[0]}
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase">Saldo: {m.balanceAfter}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
