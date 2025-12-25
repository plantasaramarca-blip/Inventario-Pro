import React, { useState, useEffect, useMemo } from 'https://esm.sh/react@19.0.0';
import { Movement, Product, TransactionType, Contact } from '../types';
import * as api from '../services/supabaseService';
import { exportToExcel, formatTimestamp } from '../services/excelService';
import { formatCurrency } from '../utils/currencyUtils';
import { 
  ArrowDownCircle, ArrowUpCircle, Filter, User, ImageIcon, 
  DollarSign, TrendingUp, Calendar, FileSpreadsheet, Loader2, X 
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.0.0';

export const Kardex: React.FC = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [type, setType] = useState<TransactionType>('SALIDA');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [updatedPrice, setUpdatedPrice] = useState<number | ''>('');
  const [dispatcher, setDispatcher] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, p, c] = await Promise.all([api.getMovements(), api.getProducts(), api.getContacts()]);
      setMovements(m);
      setProducts(p);
      setContacts(c);
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleOpenModal = (trxType: TransactionType) => {
    setType(trxType);
    setSelectedProductId('');
    setQuantity(1);
    setUpdatedPrice('');
    setDispatcher('');
    setReason('');
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return setError("Selecciona un producto");
    
    try {
      await api.registerMovement({
        productId: selectedProductId,
        type,
        quantity,
        dispatcher,
        reason,
        updatedPrice: updatedPrice || undefined
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kardex Central</h1>
          <p className="text-xs text-gray-500 font-medium">Trazabilidad total de stock y costos.</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
            <button onClick={() => handleOpenModal('INGRESO')} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md">Recibir</button>
            <button onClick={() => handleOpenModal('SALIDA')} className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md">Despachar</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
         <ul className="divide-y divide-slate-50">
            {loading ? (
              <li className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-4" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Leyendo Historial...</p>
              </li>
            ) : movements.map((m) => {
                const product = products.find(p => p.id === m.productId);
                return (
                    <li key={m.id} className="p-5 hover:bg-slate-50/50 transition-colors group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shadow-inner flex-shrink-0">
                                   {product?.imageUrl ? <img src={product.imageUrl} className="h-full w-full object-cover" /> : <ImageIcon className="h-6 w-6 text-slate-300" />}
                                </div>
                                <div>
                                    <div className="flex items-center space-x-2">
                                      <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{m.productName}</p>
                                      <span className={`px-2 py-0.5 rounded-lg text-[8px] font-black uppercase ${m.type === 'INGRESO' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                                        {m.type}
                                      </span>
                                    </div>
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                                      <p className="text-[10px] text-slate-400 flex items-center font-bold"><Calendar className="w-3 h-3 mr-1" /> {new Date(m.date).toLocaleString()}</p>
                                      <p className="text-[10px] text-indigo-500 flex items-center font-black uppercase"><User className="w-3 h-3 mr-1" /> {m.dispatcher}</p>
                                      {m.reason && <p className="text-[10px] text-slate-400 font-medium italic">"{m.reason}"</p>}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-xl font-black ${m.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {m.type === 'INGRESO' ? '+' : '-'}{m.quantity}
                                </div>
                                <div className="text-[9px] font-black text-slate-400 uppercase mt-0.5">
                                  Saldo: <span className="text-slate-800">{m.balanceAfter}</span>
                                </div>
                            </div>
                        </div>
                    </li>
                );
            })}
         </ul>
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl">
               <div className="flex items-center mb-8">
                 <div className={`p-3 rounded-2xl mr-4 shadow-lg ${type === 'INGRESO' ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
                   {type === 'INGRESO' ? <ArrowUpCircle /> : <ArrowDownCircle />}
                 </div>
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{type === 'INGRESO' ? 'Nueva Entrada' : 'Salida de Almacén'}</h3>
               </div>

               {error && <div className="mb-4 text-[10px] font-black bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-100 uppercase tracking-widest">{error}</div>}
               
               <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Producto a Movilizar</label>
                    <select className="w-full border-none p-4 text-sm font-bold rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                      <option value="">Seleccionar producto...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cantidad</label>
                      <input type="number" placeholder="0" min="1" required className="w-full p-4 text-sm font-black rounded-2xl bg-slate-50 outline-none" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsable</label>
                      <input type="text" placeholder="Nombre" required className="w-full p-4 text-sm font-bold rounded-2xl bg-slate-50 outline-none" value={dispatcher} onChange={e => setDispatcher(e.target.value)} />
                    </div>
                  </div>

                  {type === 'INGRESO' && selectedProduct && (
                    <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Costo Actual</span>
                        <span className="text-[10px] font-black text-indigo-700">{formatCurrency(selectedProduct.purchasePrice, selectedProduct.currency)}</span>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">¿Cambió el precio de compra?</label>
                        <div className="relative">
                           <DollarSign className="absolute left-3 top-3 w-4 h-4 text-indigo-300" />
                           <input 
                            type="number" 
                            step="0.01" 
                            placeholder="Nuevo precio unitario (opcional)" 
                            className="w-full pl-10 pr-4 py-3 bg-white border border-indigo-200 rounded-xl text-xs font-black text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500" 
                            value={updatedPrice} 
                            onChange={e => setUpdatedPrice(e.target.value ? Number(e.target.value) : '')} 
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referencia / Motivo</label>
                    <input type="text" placeholder="Ej: Compra según Factura #123" required className="w-full p-4 text-sm font-medium rounded-2xl bg-slate-50 outline-none" value={reason} onChange={e => setReason(e.target.value)} />
                  </div>

                  <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] py-4">Cancelar</button>
                    <button type="submit" className={`flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl ${type === 'INGRESO' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-rose-600 shadow-rose-200'}`}>
                      Confirmar {type}
                    </button>
                  </div>
               </div>
          </form>
        </div>
       )}
    </div>
  );
};