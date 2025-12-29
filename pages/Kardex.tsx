
import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Product, TransactionType, Destination, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { 
  ArrowDownCircle, ArrowUpCircle, Loader2, X, Search, Save, UserCheck, ArrowUp, ArrowDown, Trash
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

export const Kardex: React.FC<{ role: Role; userEmail?: string }> = ({ role, userEmail }) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [destinos, setDestinos] = useState<Destination[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<TransactionType>('SALIDA');
  const [productSearch, setProductSearch] = useState('');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [selectedDestinoId, setSelectedDestinoId] = useState('');
  const [carriedBy, setCarriedBy] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [reason, setReason] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, p, d] = await Promise.all([api.getMovements(), api.getProducts(), api.getDestinos()]);
      setMovements(m || []); setProducts(p || []); setDestinos((d || []).filter(dest => dest.active));
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenModal = (trxType: TransactionType) => {
    if (role === 'VIEWER') return;
    setType(trxType); setCartItems([]); setSelectedDestinoId(''); setCarriedBy(''); setSupplierName(''); setReason(''); setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    setSaving(true);
    try {
      const destinoObj = destinos.find(d => d.id === selectedDestinoId);
      const batchPayload = cartItems.map(item => ({
        productId: item.productId, type, quantity: item.quantity, dispatcher: userEmail,
        reason: type === 'SALIDA' ? `${reason} (Porta: ${carriedBy})` : `${reason} (Prov: ${supplierName})`,
        destinationName: destinoObj?.name
      }));
      await api.registerBatchMovements(batchPayload); setIsModalOpen(false); loadData();
    } catch (err: any) { alert(err.message); } finally { setSaving(false); }
  };

  const filteredSearch = useMemo(() => productSearch ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.code.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 5) : [], [products, productSearch]);

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      <div className="flex justify-between items-center">
        <div><h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Kardex Logístico</h1><p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Movimientos de Stock</p></div>
        <div className="flex gap-2">
          {role !== 'VIEWER' && (
            <div className="bg-white p-1 rounded-xl border flex gap-1 shadow-sm">
              <button onClick={() => handleOpenModal('INGRESO')} className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-1.5"><ArrowUpCircle className="w-3 h-3" /> Ingreso</button>
              <button onClick={() => handleOpenModal('SALIDA')} className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase flex items-center gap-1.5"><ArrowDownCircle className="w-3 h-3" /> Despacho</button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm overflow-x-auto no-scrollbar">
        <table className="w-full text-xs min-w-[700px]">
          <thead className="bg-slate-50/50 text-[8px] font-black uppercase text-slate-400 tracking-widest border-b">
            <tr><th className="px-5 py-3 text-left">Fecha</th><th className="px-4 py-3 text-left">Producto / Destino</th><th className="px-4 py-3 text-center">Cantidad</th><th className="px-4 py-3 text-left">Responsable</th><th className="px-5 py-3 text-center">Saldo</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin w-6 h-6 mx-auto text-indigo-500" /></td></tr> : movements.map(m => (
              <tr key={m.id} className="hover:bg-slate-50/40">
                <td className="px-5 py-2 text-[8px] font-bold text-slate-400 uppercase">{new Date(m.date).toLocaleDateString()} {new Date(m.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${m.type === 'INGRESO' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>{m.type === 'INGRESO' ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}</div>
                    <div><p className="font-bold text-slate-800 text-[10px] uppercase truncate max-w-[120px]">{m.productName}</p><p className="text-[7px] text-slate-400 font-black uppercase">{m.destinationName || 'ALMACÉN'}</p></div>
                  </div>
                </td>
                <td className={`px-4 py-2 text-center font-black text-[10px] ${m.type === 'INGRESO' ? 'text-indigo-600' : 'text-rose-600'}`}>{m.type === 'INGRESO' ? '+' : '-'}{m.quantity}</td>
                <td className="px-4 py-2 text-[9px] font-black text-indigo-500 uppercase flex items-center gap-1"><UserCheck className="w-3 h-3" /> {m.dispatcher?.split('@')[0]}</td>
                <td className="px-5 py-2 text-center font-black text-slate-600 text-[10px]">{m.balanceAfter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white w-full max-w-3xl rounded-[2rem] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh]">
            <div className={`px-5 py-3 border-b flex justify-between items-center ${type === 'INGRESO' ? 'bg-indigo-50/40' : 'bg-rose-50/40'}`}>
               <h3 className="text-xs font-black text-slate-800 uppercase tracking-tighter">{type === 'INGRESO' ? 'Nuevo Ingreso de Mercancía' : 'Nuevo Despacho / Salida'}</h3>
               <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="overflow-y-auto p-4 space-y-4 no-scrollbar grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
                    <input type="text" className="w-full pl-9 pr-4 py-2 bg-slate-50 rounded-xl outline-none font-bold text-[10px] uppercase border" placeholder="Buscar producto..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                    {filteredSearch.length > 0 && <div className="absolute z-[110] w-full mt-1 bg-white border rounded-xl shadow-xl overflow-hidden">{filteredSearch.map(p => (<button key={p.id} type="button" onClick={() => { if(!cartItems.find(i=>i.productId===p.id)) setCartItems([...cartItems,{...p,productId:p.id,quantity:1}]); setProductSearch(''); }} className="w-full p-2 text-left hover:bg-slate-50 border-b last:border-0 flex justify-between"><span className="text-[9px] font-black uppercase">{p.name}</span><span className="text-[8px] text-indigo-600 font-bold">STK: {p.stock}</span></button>))}</div>}
                  </div>
                  {type === 'SALIDA' ? (
                    <div className="grid grid-cols-1 gap-2">
                      <select className="w-full p-2 bg-slate-50 rounded-lg font-black text-[9px] uppercase outline-none border" value={selectedDestinoId} onChange={e => setSelectedDestinoId(e.target.value)}><option value="">-- SELECCIONAR DESTINO --</option>{destinos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                      <input type="text" className="w-full p-2 bg-slate-50 rounded-lg font-bold text-[9px] uppercase outline-none border" placeholder="QUIEN RETIRA" value={carriedBy} onChange={e => setCarriedBy(e.target.value.toUpperCase())} />
                    </div>
                  ) : (
                    <input type="text" className="w-full p-2 bg-slate-50 rounded-lg font-bold text-[9px] uppercase outline-none border" placeholder="PROVEEDOR / ORIGEN" value={supplierName} onChange={e => setSupplierName(e.target.value.toUpperCase())} />
                  )}
                  <textarea className="w-full p-2 bg-slate-50 rounded-lg font-bold text-[9px] uppercase h-16 border outline-none" placeholder="OBSERVACIONES" value={reason} onChange={e => setReason(e.target.value)} />
               </div>
               <div className="bg-slate-50 rounded-xl p-3 flex flex-col min-h-[150px] border">
                  <div className="flex justify-between items-center mb-2"><h4 className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Carrito de Carga</h4><span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-[7px] font-black uppercase">{cartItems.length} ITEMS</span></div>
                  <div className="flex-1 overflow-y-auto space-y-1.5 no-scrollbar">{cartItems.map(item => (<div key={item.productId} className="bg-white p-2 rounded-lg border flex justify-between items-center"><div className="w-2/3"><p className="text-[8px] font-black uppercase truncate leading-tight">{item.name}</p><p className="text-[7px] text-slate-400 font-bold tracking-tighter">DISPONIBLE: {item.stock}</p></div><div className="flex items-center gap-1.5"><input type="number" className="w-10 p-1 bg-slate-50 rounded text-center text-[9px] font-black border" value={item.quantity} onChange={e => setCartItems(cartItems.map(i=>i.productId===item.productId?{...i,quantity:Math.max(1,Number(e.target.value))}:i))} /><button type="button" onClick={() => setCartItems(cartItems.filter(i=>i.productId!==item.productId))} className="text-slate-300 hover:text-red-500"><Trash className="w-3 h-3" /></button></div></div>))}</div>
               </div>
            </div>
            <div className="px-5 py-3 border-t flex gap-3 bg-white shrink-0">
               <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 text-[8px] font-black uppercase text-slate-400">Cancelar</button>
               <button type="submit" disabled={saving || cartItems.length === 0} className={`flex-[2] py-2 text-white rounded-xl text-[8px] font-black uppercase shadow-lg flex items-center justify-center gap-2 ${type === 'INGRESO' ? 'bg-indigo-600' : 'bg-rose-600'}`}>
                  {saving ? <Loader2 className="animate-spin w-3 h-3" /> : <Save className="w-3 h-3" />} {type === 'INGRESO' ? 'Registrar Ingreso' : 'Confirmar Salida'}
               </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
