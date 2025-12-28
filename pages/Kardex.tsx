
import React, { useState, useEffect } from 'https://esm.sh/react@19.2.3';
import { Movement, Product, TransactionType, Destination, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { exportToExcel, formatTimestamp } from '../services/excelService.ts';
import { 
  ArrowDownCircle, ArrowUpCircle, User, 
  Calendar, FileSpreadsheet, Loader2, X, MapPin, Building2, ShoppingBag, Info, AlertTriangle, ArrowRight, Truck, Package, Check, CheckCircle
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

interface KardexProps {
  onNavigateToDestinos?: () => void;
  role: Role;
}

export const Kardex: React.FC<KardexProps> = ({ role }) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [destinos, setDestinos] = useState<Destination[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  
  const [type, setType] = useState<TransactionType>('SALIDA');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedDestinoId, setSelectedDestinoId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [dispatcher, setDispatcher] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, p, d] = await Promise.all([
        api.getMovements(), 
        api.getProducts(),
        api.getDestinos()
      ]);
      setMovements(m);
      setProducts(p);
      setDestinos(d.filter(dest => dest.active));
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenModal = (trxType: TransactionType) => {
    if (role === 'VIEWER') return;
    setType(trxType);
    setSelectedProductId('');
    setSelectedDestinoId('');
    setQuantity(1);
    setDispatcher('');
    setReason('');
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'VIEWER' || saving) return;
    if (!selectedProductId) return setError("Selecciona un producto");
    
    if (type === 'SALIDA') {
      if (destinos.length === 0) return setError("⚠️ Primero crea un destino en 'Puntos de Costo'");
      if (!selectedDestinoId) return setError("Selecciona un destino");
    }
    
    const destinoObj = destinos.find(d => d.id === selectedDestinoId);
    setSaving(true);
    setError('');
    
    try {
      await api.registerMovement({
        productId: selectedProductId,
        type,
        quantity,
        dispatcher,
        reason,
        destinationName: destinoObj?.name
      });
      showToast(type === 'INGRESO' ? "Entrada registrada" : "Despacho realizado");
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kardex de Movimientos</h1>
          <p className="text-xs text-slate-500 font-black uppercase tracking-widest mt-0.5">Historial de Almacén</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          {role !== 'VIEWER' && (
            <div className="flex flex-1 gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
              <button onClick={() => handleOpenModal('INGRESO')} className="flex-1 bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">Stock Entrada</button>
              <button onClick={() => handleOpenModal('SALIDA')} className="flex-1 bg-rose-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all">Stock Despacho</button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 text-left">Fecha</th>
                <th className="px-6 py-5 text-left">Producto</th>
                <th className="px-6 py-5 text-center">Cant.</th>
                <th className="px-6 py-5 text-left">Responsable</th>
                <th className="px-6 py-5 text-center">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" /></td></tr>
              ) : movements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase">
                    {new Date(m.date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${m.type === 'INGRESO' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {m.type === 'INGRESO' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs">{m.productName}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase">{m.type === 'SALIDA' ? `Dest: ${m.destinationName || 'Interno'}` : 'Entrada Almacén'}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-center font-black text-sm ${m.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.type === 'INGRESO' ? '+' : '-'}{m.quantity}
                  </td>
                  <td className="px-6 py-4 text-[10px] font-black text-indigo-500 uppercase">{m.dispatcher}</td>
                  <td className="px-6 py-4 text-center"><span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-700">{m.balanceAfter}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-[3rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
               <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">{type === 'INGRESO' ? 'Entrada Stock' : 'Despacho Stock'}</h3>
                 <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
               </div>
               
               {error && <div className="mb-4 p-4 bg-rose-50 text-rose-700 text-xs font-bold rounded-2xl flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</div>}

               <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Producto</label>
                    <select className="w-full p-4 text-sm font-bold rounded-2xl bg-slate-50 outline-none" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                      <option value="">Seleccionar producto...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} (Saldo: {p.stock})</option>)}
                    </select>
                  </div>

                  {type === 'SALIDA' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Destino de Salida</label>
                      <select required className="w-full p-4 text-sm font-bold rounded-2xl bg-indigo-50 text-indigo-700 outline-none" value={selectedDestinoId} onChange={e => setSelectedDestinoId(e.target.value)}>
                        <option value="">Seleccionar destino...</option>
                        {destinos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Cantidad</label>
                      <input type="number" min="1" required className="w-full p-4 text-lg font-black rounded-2xl bg-slate-50 text-center outline-none" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Despachador</label>
                      <input type="text" required className="w-full p-4 text-sm font-bold rounded-2xl bg-slate-50 outline-none" placeholder="Tu nombre" value={dispatcher} onChange={e => setDispatcher(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Motivo / Referencia</label>
                    <input type="text" required className="w-full p-4 text-sm font-medium rounded-2xl bg-slate-50 outline-none" placeholder="Ej: Pedido #123" value={reason} onChange={e => setReason(e.target.value)} />
                  </div>

                  <button type="submit" disabled={saving} className={`w-full py-5 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-xl mt-6 transition-all ${type === 'INGRESO' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                    {saving ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Confirmar Movimiento'}
                  </button>
               </div>
          </form>
        </div>
       )}

       {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-right-10 ${toast.type === 'success' ? 'bg-white border-emerald-100 text-emerald-800' : 'bg-rose-600 text-white'}`}>
           <CheckCircle className="w-5 h-5" />
           <p className="text-[10px] font-black uppercase tracking-tight">{toast.msg}</p>
        </div>
      )}
    </div>
  );
};
