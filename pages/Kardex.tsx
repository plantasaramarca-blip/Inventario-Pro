
import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Product, TransactionType, Destination, Role, LocationMaster } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { useNotification } from '../contexts/NotificationContext.tsx';
import { DispatchNote } from '../components/DispatchNote.tsx';
import { QRScanner } from '../components/QRScanner.tsx';
import { 
  ArrowDownCircle, ArrowUpCircle, Loader2, X, Search, Save, UserCheck, ArrowUp, ArrowDown, Trash, ChevronLeft, ChevronRight, ScanLine
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

const ITEMS_PER_PAGE = 20;

interface KardexProps {
  role: Role;
  userEmail?: string;
  initialState?: any;
  onInitialStateConsumed: () => void;
  destinos: Destination[];
  locations: LocationMaster[];
}

export const Kardex: React.FC<KardexProps> = ({ role, userEmail, initialState, onInitialStateConsumed, destinos, locations }) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<TransactionType>('SALIDA');
  const [productSearch, setProductSearch] = useState('');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [selectedDestinoId, setSelectedDestinoId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [carriedBy, setCarriedBy] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [reason, setReason] = useState('');
  const { addNotification } = useNotification();
  const [dispatchNoteData, setDispatchNoteData] = useState<any>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [movs, prods] = await Promise.all([api.getMovements(), api.getProducts()]);
      setMovements(movs || []);
      setProducts(prods || []);
    } catch (e) {
      addNotification('Error al cargar datos de kardex.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (initialState?.prefill) {
      const { type: prefillType, product } = initialState.prefill;
      handleOpenModal(prefillType);
      if (product) setCartItems([{ ...product, productId: product.id, quantity: 1 }]);
      onInitialStateConsumed();
    }
  }, [initialState]);

  const totalPages = Math.ceil(movements.length / ITEMS_PER_PAGE);
  const paginatedMovements = movements.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const handleOpenModal = (trxType: TransactionType) => {
    if (role === 'VIEWER') return;
    setType(trxType); setCartItems([]); setSelectedDestinoId(''); setSelectedLocationId(''); setCarriedBy(''); setSupplierName(''); setReason(''); setIsModalOpen(true);
  };
  
  const handleScanSuccessForCart = (decodedText: string) => {
    try {
      const url = new URL(decodedText);
      const productId = url.searchParams.get('id');
      if (!productId) { addNotification('Código QR no válido.', 'error'); return; }

      const product = products.find(p => p.id === productId);
      if (!product) { addNotification('Producto no encontrado.', 'error'); return; }

      const existingItem = cartItems.find(item => item.productId === productId);
      const currentQuantityInCart = existingItem ? existingItem.quantity : 0;

      if (type === 'SALIDA' && product.stock <= currentQuantityInCart) {
        addNotification(`Stock insuficiente para ${product.name}.`, 'error');
        return;
      }

      if (existingItem) {
        setCartItems(cartItems.map(item => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item));
        addNotification(`+1 ${product.name}`, 'success');
      } else {
        setCartItems(prev => [...prev, { ...product, productId: product.id, quantity: 1 }]);
        addNotification(`${product.name} añadido.`, 'success');
      }
    } catch (e) {
      addNotification('Código QR mal formado.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (cartItems.length === 0) return;
    setSaving(true);
    try {
      const destinoObj = type === 'SALIDA' ? destinos.find(d => d.id === selectedDestinoId) : null;
      const locationObj = type === 'INGRESO' ? locations.find(l => l.name === selectedLocationId) : null;
      const batchPayload = cartItems.map(item => ({ productId: item.productId, type, quantity: item.quantity, dispatcher: userEmail, reason: type === 'SALIDA' ? `${reason} (Transp: ${carriedBy})` : `${reason} (Prov: ${supplierName})`, destinationName: type === 'SALIDA' ? destinoObj?.name : locationObj?.name }));
      await api.registerBatchMovements(batchPayload); 
      
      if (type === 'SALIDA') {
        setDispatchNoteData({
          items: cartItems,
          destination: destinoObj,
          transportista: carriedBy,
          observaciones: reason,
          responsable: userEmail,
        });
      }

      setIsModalOpen(false); 
      await loadData();
      addNotification('Movimiento registrado con éxito.', 'success');
    } catch (err: any) { addNotification(err.message, 'error'); 
    } finally { setSaving(false); }
  };

  const filteredSearch = useMemo(() => productSearch ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.code.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 5) : [], [products, productSearch]);
  
  if (loading) return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-500" /></div>;

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      {isScannerOpen && <QRScanner onScanSuccess={handleScanSuccessForCart} onClose={() => setIsScannerOpen(false)} />}
      <div className="flex justify-between items-end">
        <div><h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Kardex Logístico</h1><p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Movimientos de Stock</p></div>
        <div className="flex gap-3">
          {role !== 'VIEWER' && (
            <div className="flex gap-2">
              <button onClick={() => handleOpenModal('INGRESO')} className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"><ArrowUpCircle className="w-4 h-4" /> Ingreso</button>
              <button onClick={() => handleOpenModal('SALIDA')} className="bg-rose-600 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-rose-100 hover:bg-rose-700 active:scale-95 transition-all"><ArrowDownCircle className="w-4 h-4" /> Despacho</button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-xs min-w-[800px]">
            <thead className="bg-slate-50/50 text-[8px] font-black uppercase text-slate-400 tracking-widest border-b">
              <tr><th className="px-6 py-4 text-left">Fecha</th><th className="px-4 py-4 text-left">Producto / Destino</th><th className="px-4 py-4 text-center">Cantidad</th><th className="px-4 py-4 text-left">Responsable</th><th className="px-6 py-4 text-center">Saldo</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedMovements.map(m => (
                <tr key={m.id} className="hover:bg-slate-50/40">
                  <td className="px-6 py-3 text-[9px] font-bold text-slate-400 uppercase leading-tight">{new Date(m.date).toLocaleDateString()}<br/>{new Date(m.date).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><div className={`p-2 rounded-xl ${m.type === 'INGRESO' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>{m.type === 'INGRESO' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}</div><div><p className="font-black text-slate-800 text-[11px] uppercase truncate max-w-[200px]">{m.productName}</p><p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{m.destinationName || 'ALMACÉN CENTRAL'}</p></div></div></td>
                  <td className={`px-4 py-3 text-center font-black text-sm ${m.type === 'INGRESO' ? 'text-indigo-600' : 'text-rose-600'}`}>{m.type === 'INGRESO' ? '+' : '-'}{m.quantity}</td>
                  <td className="px-4 py-3"><div className="flex items-center gap-1.5 text-[9px] font-black text-indigo-500 uppercase"><UserCheck className="w-3.5 h-3.5" /> {m.dispatcher?.split('@')[0]}</div></td>
                  <td className="px-6 py-3 text-center font-black text-slate-700 text-sm">{m.balanceAfter}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 flex justify-between items-center text-[10px] font-black uppercase text-slate-500 border-t">
            <button onClick={() => setCurrentPage(p => Math.max(0, p - 1))} disabled={currentPage === 0} className="px-3 py-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 flex items-center gap-1.5"><ChevronLeft className="w-3.5 h-3.5" /> Ant</button>
            <span>Página {currentPage + 1} de {totalPages}</span>
            <button onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))} disabled={currentPage === totalPages - 1} className="px-3 py-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 flex items-center gap-1.5">Sig <ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white w-full max-w-4xl rounded-[3rem] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh]">
            <div className={`px-8 py-5 border-b flex justify-between items-center ${type === 'INGRESO' ? 'bg-indigo-50/40' : 'bg-rose-50/40'}`}>
               <div>
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{type === 'INGRESO' ? 'Ingreso de Mercancía' : 'Orden de Despacho'}</h3>
                 <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Operación Logística</p>
               </div>
               <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            <div className="overflow-y-auto p-8 space-y-6 no-scrollbar grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="relative group flex-1">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500" />
                      <input type="text" className="w-full pl-11 pr-4 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-xs uppercase border-2 border-transparent focus:border-indigo-500 transition-all" placeholder="BUSCAR PRODUCTO..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                      {filteredSearch.length > 0 && <div className="absolute z-[110] w-full mt-2 bg-white border rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">{filteredSearch.map(p => (<button key={p.id} type="button" onClick={() => { if(!cartItems.find(i=>i.productId===p.id)) setCartItems([...cartItems,{...p,productId:p.id,quantity:1}]); setProductSearch(''); }} className="w-full p-4 text-left hover:bg-indigo-50 border-b last:border-0 flex justify-between items-center"><div className="flex flex-col"><span className="text-[10px] font-black uppercase text-slate-800">{p.name}</span><span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{p.code} | MARCA: {p.brand || 'S/M'}</span></div><span className={`text-[9px] font-black uppercase px-2 py-1 rounded-lg ${p.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>STK: {p.stock}</span></button>))}</div>}
                    </div>
                    <button type="button" onClick={() => setIsScannerOpen(true)} className="p-4 bg-indigo-600 text-white rounded-2xl aspect-square flex items-center justify-center hover:bg-indigo-700 active:scale-95 transition-all shadow-xl shadow-indigo-100">
                      <ScanLine className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {type === 'SALIDA' ? (
                    <div className="space-y-3">
                      <select required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-[10px] uppercase outline-none border-2 border-transparent focus:border-indigo-500 transition-all" value={selectedDestinoId} onChange={e => setSelectedDestinoId(e.target.value)}><option value="" disabled>-- SELECCIONAR CENTRO DE COSTO --</option>{destinos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                      <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-[10px] uppercase outline-none border-2 border-transparent focus:border-indigo-500 transition-all" placeholder="NOMBRE DEL TRANSPORTISTA" value={carriedBy} onChange={e => setCarriedBy(e.target.value.toUpperCase())} />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <select required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-[10px] uppercase outline-none border-2 border-transparent focus:border-indigo-500 transition-all" value={selectedLocationId} onChange={e => setSelectedLocationId(e.target.value)}><option value="" disabled>-- SELECCIONAR ALMACÉN DE DESTINO --</option>{locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select>
                      <input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-[10px] uppercase outline-none border-2 border-transparent focus:border-indigo-500 transition-all" placeholder="NOMBRE DEL PROVEEDOR" value={supplierName} onChange={e => setSupplierName(e.target.value.toUpperCase())} />
                    </div>
                  )}
                  <textarea className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-[10px] uppercase h-24 border-2 border-transparent outline-none focus:border-indigo-500 transition-all no-scrollbar" placeholder="OBSERVACIONES" value={reason} onChange={e => setReason(e.target.value)} />
               </div>
               <div className="bg-slate-50 rounded-[2.5rem] p-6 flex flex-col border shadow-inner">
                  <div className="flex justify-between items-center mb-4"><h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Lista de Carga ({cartItems.length})</h4></div>
                  <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-1">{cartItems.length === 0 ? <div className="h-full flex flex-col items-center justify-center opacity-30"><Search className="w-10 h-10 mb-2" /><p className="text-[8px] font-black uppercase">Busca o escanea para agregar</p></div> : cartItems.map(item => (<div key={item.productId} className="bg-white p-4 rounded-2xl border shadow-sm flex justify-between items-center animate-in slide-in-from-right-2 duration-300"><div className="w-2/3"><p className="text-[10px] font-black uppercase truncate text-slate-800 leading-tight">{item.name}</p><p className="text-[8px] text-slate-400 font-bold uppercase tracking-tighter">DISP: {item.stock} {item.unit}</p></div><div className="flex items-center gap-3"><input type="number" className="w-14 p-2 bg-slate-50 rounded-xl text-center text-xs font-black border-2 border-transparent focus:border-indigo-500 outline-none" value={item.quantity} onChange={e => setCartItems(cartItems.map(i=>i.productId===item.productId?{...i,quantity:Math.max(1,Number(e.target.value))}:i))} /><button type="button" onClick={() => setCartItems(cartItems.filter(i=>i.productId!==item.productId))} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash className="w-4 h-4" /></button></div></div>))}</div>
               </div>
            </div>
            <div className="px-8 py-6 border-t flex gap-5 bg-white shrink-0">
               <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cancelar</button>
               <button type="submit" disabled={saving || cartItems.length === 0} className={`flex-[2] py-4 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2 active:scale-95 transition-all ${type === 'INGRESO' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-rose-600 shadow-rose-100'}`}>
                  {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />} {type === 'INGRESO' ? 'Confirmar Ingreso' : 'Confirmar Despacho'}
               </button>
            </div>
          </form>
        </div>
      )}
      {dispatchNoteData && <DispatchNote data={dispatchNoteData} onClose={() => setDispatchNoteData(null)} />}
    </div>
  );
};
