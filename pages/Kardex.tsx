
import React, { useState, useEffect, useMemo } from 'https://esm.sh/react@19.2.3';
import { Movement, Product, TransactionType, Destination, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { 
  ArrowDownCircle, ArrowUpCircle, User, 
  Calendar, Loader2, X, MapPin, Building2, ShoppingBag, 
  Info, AlertTriangle, ArrowRight, Truck, Package, 
  Check, CheckCircle, Search, Trash2, Plus, ArrowUp, ArrowDown
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

interface KardexProps {
  role: Role;
  userEmail?: string;
}

interface CartItem {
  productId: string;
  name: string;
  code: string;
  quantity: number;
  stock: number;
}

export const Kardex: React.FC<KardexProps> = ({ role, userEmail }) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [destinos, setDestinos] = useState<Destination[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  
  const [type, setType] = useState<TransactionType>('SALIDA');
  
  // Estado para el buscador de productos
  const [productSearch, setProductSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
  // Estado para el "Carrito" de ítems
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedDestinoId, setSelectedDestinoId] = useState('');
  const [carriedBy, setCarriedBy] = useState(''); // Quien llevó
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
    setCartItems([]);
    setSelectedDestinoId('');
    setCarriedBy('');
    setReason('');
    setProductSearch('');
    setError('');
    setIsModalOpen(true);
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.code.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 8);
  }, [products, productSearch]);

  const addToCart = (p: Product) => {
    if (cartItems.find(i => i.productId === p.id)) {
      showToast("Producto ya está en la lista", 'error');
      return;
    }
    setCartItems([...cartItems, {
      productId: p.id,
      name: p.name,
      code: p.code,
      quantity: 1,
      stock: p.stock
    }]);
    setProductSearch('');
    setIsSearchOpen(false);
  };

  const removeFromCart = (id: string) => {
    setCartItems(cartItems.filter(i => i.productId !== id));
  };

  const updateCartQty = (id: string, qty: number) => {
    setCartItems(cartItems.map(i => {
      if (i.productId === id) {
        const val = Math.max(1, qty);
        // Validar stock si es salida
        if (type === 'SALIDA' && val > i.stock) {
           showToast(`Stock insuficiente (${i.stock} disp.)`, 'error');
           return i;
        }
        return { ...i, quantity: val };
      }
      return i;
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'VIEWER' || saving) return;
    if (cartItems.length === 0) return setError("Debes agregar al menos un producto");
    
    if (type === 'SALIDA') {
      if (!selectedDestinoId) return setError("Selecciona un destino");
      if (!carriedBy.trim()) return setError("Indica quién lleva la mercadería");
    }
    
    const destinoObj = destinos.find(d => d.id === selectedDestinoId);
    setSaving(true);
    setError('');
    
    try {
      const batchPayload = cartItems.map(item => ({
        productId: item.productId,
        type,
        quantity: item.quantity,
        dispatcher: userEmail || 'Sistema',
        reason: type === 'SALIDA' ? `${reason} (Retira: ${carriedBy})` : reason,
        destinationName: destinoObj?.name
      }));

      await api.registerBatchMovements(batchPayload);
      showToast(type === 'INGRESO' ? "Ingreso de stock completado" : "Despacho de stock completado");
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
          <p className="text-xs text-slate-500 font-black uppercase tracking-widest mt-0.5">Gestión de Stock Logístico</p>
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
                <th className="px-6 py-5 text-left">Producto / Código</th>
                <th className="px-6 py-5 text-center">Cant.</th>
                <th className="px-6 py-5 text-left">Autorizó / Recibió</th>
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
                        {m.type === 'INGRESO' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
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
                  <td className="px-6 py-4">
                    <p className="text-[10px] font-black text-indigo-500 uppercase leading-none">{m.dispatcher}</p>
                    {m.reason && <p className="text-[9px] text-slate-400 font-bold mt-1 truncate max-w-[150px]">{m.reason}</p>}
                  </td>
                  <td className="px-6 py-4 text-center"><span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-700">{m.balanceAfter}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-[3rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom-4">
               
               {/* Header Modal */}
               <div className="p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
                  <div>
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                       {type === 'INGRESO' ? 'Registro de Ingreso de Stock' : 'Registro de Despacho Logístico'}
                    </h3>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Multi-ítem Procesamiento</p>
                  </div>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-2xl"><X className="w-6 h-6 text-slate-400" /></button>
               </div>

               {/* Cuerpo Modal Scrollable */}
               <div className="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
                  
                  {error && <div className="p-4 bg-rose-50 text-rose-700 text-[10px] font-black uppercase rounded-2xl flex items-center gap-3 border border-rose-100"><AlertTriangle className="w-4 h-4" /> {error}</div>}

                  {/* Sección Buscador */}
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">1. Buscar Productos por Código o Nombre</label>
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                      <input 
                        type="text" 
                        className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-indigo-500 rounded-2xl outline-none font-bold text-sm transition-all" 
                        placeholder="Ej: ZAP-001 o Zapatillas..." 
                        value={productSearch} 
                        onFocus={() => setIsSearchOpen(true)}
                        onChange={e => setProductSearch(e.target.value)} 
                      />
                      
                      {isSearchOpen && filteredProducts.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in duration-200">
                          {filteredProducts.map(p => (
                            <button key={p.id} type="button" onClick={() => addToCart(p)} className="w-full p-4 flex items-center justify-between hover:bg-indigo-50 transition-colors border-b border-slate-50 last:border-0">
                               <div className="text-left">
                                  <p className="text-xs font-black text-slate-800 uppercase">{p.name}</p>
                                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">{p.code} • Stock: {p.stock} {p.unit}</p>
                               </div>
                               <Plus className="w-4 h-4 text-indigo-600" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sección Lista de Items (Carrito) */}
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">2. Ítems en Lista ({cartItems.length})</label>
                     <div className="bg-slate-50 rounded-3xl overflow-hidden border border-slate-100">
                        {cartItems.length === 0 ? (
                          <div className="p-10 text-center opacity-30">
                            <Package className="w-10 h-10 mx-auto mb-2" />
                            <p className="text-[9px] font-black uppercase tracking-widest">Sin productos seleccionados</p>
                          </div>
                        ) : (
                          <div className="divide-y divide-slate-100">
                            {cartItems.map(item => (
                              <div key={item.productId} className="p-4 flex items-center justify-between animate-in slide-in-from-left-2">
                                 <div className="flex-1">
                                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">{item.name}</p>
                                    <p className="text-[9px] text-indigo-500 font-black tracking-widest">{item.code}</p>
                                 </div>
                                 <div className="flex items-center gap-4">
                                    <div className="flex items-center bg-white rounded-xl border border-slate-200 overflow-hidden">
                                       <button type="button" onClick={() => updateCartQty(item.productId, item.quantity - 1)} className="p-2 hover:bg-slate-50 border-r border-slate-100"><ArrowDown className="w-3 h-3" /></button>
                                       <input type="number" className="w-12 text-center text-xs font-black outline-none" value={item.quantity} onChange={e => updateCartQty(item.productId, Number(e.target.value))} />
                                       <button type="button" onClick={() => updateCartQty(item.productId, item.quantity + 1)} className="p-2 hover:bg-slate-50 border-l border-slate-100"><ArrowUp className="w-3 h-3" /></button>
                                    </div>
                                    <button type="button" onClick={() => removeFromCart(item.productId)} className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                 </div>
                              </div>
                            ))}
                          </div>
                        )}
                     </div>
                  </div>

                  {/* Sección Datos de Responsabilidad */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
                     <div className="space-y-1">
                        <label className="text-[10px] font-black text-indigo-500 uppercase tracking-widest ml-2">{type === 'INGRESO' ? 'Recepcionó' : 'Despachador (Tú)'}</label>
                        <div className="w-full p-4 bg-indigo-50 border-2 border-indigo-100 rounded-2xl font-black text-[10px] text-indigo-800 uppercase">
                           {userEmail}
                        </div>
                     </div>
                     {type === 'SALIDA' ? (
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Quién Retira / Llevó *</label>
                          <input type="text" required placeholder="Ej: Juan Pérez" className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-rose-500 rounded-2xl outline-none font-bold text-sm" value={carriedBy} onChange={e => setCarriedBy(e.target.value)} />
                       </div>
                     ) : (
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Referencia / Factura</label>
                          <input type="text" placeholder="Ej: O/C #100" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm" value={reason} onChange={e => setReason(e.target.value)} />
                       </div>
                     )}
                  </div>

                  {type === 'SALIDA' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Destino / Punto de Costo *</label>
                          <select required className="w-full p-4 bg-slate-50 rounded-2xl font-black text-xs uppercase" value={selectedDestinoId} onChange={e => setSelectedDestinoId(e.target.value)}>
                             <option value="">Seleccionar destino...</option>
                             {destinos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                       </div>
                       <div className="space-y-1">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Motivo Adicional</label>
                          <input type="text" placeholder="Observaciones..." className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm" value={reason} onChange={e => setReason(e.target.value)} />
                       </div>
                    </div>
                  )}
               </div>

               {/* Footer Modal */}
               <div className="p-6 border-t border-slate-100 bg-slate-50/50 shrink-0">
                  <button 
                    type="submit" 
                    disabled={saving || cartItems.length === 0} 
                    className={`w-full py-5 rounded-[2rem] text-[11px] font-black uppercase tracking-[0.25em] text-white shadow-2xl transition-all active:scale-95 disabled:opacity-30 disabled:shadow-none flex items-center justify-center gap-3 ${type === 'INGRESO' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'}`}
                  >
                    {saving ? <Loader2 className="animate-spin w-5 h-5" /> : (
                      <>
                        <CheckCircle className="w-5 h-5" /> 
                        {type === 'INGRESO' ? 'Confirmar Ingreso de Stock' : 'Confirmar Despacho Total'}
                      </>
                    )}
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
