
import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Product, TransactionType, Destination, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { CustomDialog } from '../components/CustomDialog.tsx';
// Added Zap and ShoppingCart to the lucide-react imports
import { 
  ArrowDownCircle, ArrowUpCircle, User, 
  Calendar, Loader2, X, MapPin, Building2, ShoppingBag, 
  Info, AlertTriangle, ArrowRight, Truck, Package, 
  Check, CheckCircle, Search, Trash2, Plus, ArrowUp, ArrowDown, FileSpreadsheet, Save, UserCheck, Trash,
  Zap, ShoppingCart
} from 'lucide-react';

interface KardexProps {
  role: Role;
  userEmail?: string;
  initialProductId?: string;
}

interface CartItem {
  productId: string;
  name: string;
  code: string;
  quantity: number;
  stock: number;
}

export const Kardex: React.FC<KardexProps> = ({ role, userEmail, initialProductId }) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [destinos, setDestinos] = useState<Destination[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [dialog, setDialog] = useState<{isOpen: boolean, title: string, message: string, type: any} | null>(null);
  
  const [type, setType] = useState<TransactionType>('SALIDA');
  const [productSearch, setProductSearch] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedDestinoId, setSelectedDestinoId] = useState('');
  const [carriedBy, setCarriedBy] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const showDialog = (title: string, message: string, type: 'success' | 'error' | 'alert' = 'success') => {
    setDialog({ isOpen: true, title, message, type });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, p, d] = await Promise.all([api.getMovements(), api.getProducts(), api.getDestinos()]);
      setMovements(m || []);
      setProducts(p || []);
      setDestinos((d || []).filter((dest: any) => dest.active));
    } catch (e) {
      showDialog("Conexión", "Error al sincronizar datos", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const filteredProductsForSearch = useMemo(() => {
    if (!productSearch) return [];
    return products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.code.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 5);
  }, [products, productSearch]);

  const addToCart = (p: Product) => {
    if (cartItems.find(i => i.productId === p.id)) return;
    setCartItems([...cartItems, { productId: p.id, name: p.name, code: p.code, quantity: 1, stock: p.stock }]);
    setProductSearch('');
  };

  const updateQuantity = (id: string, qty: number) => {
    setCartItems(cartItems.map(i => i.productId === id ? { ...i, quantity: qty } : i));
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (cartItems.length === 0) return setError("El carrito está vacío.");
    if (type === 'SALIDA' && !selectedDestinoId) return setError("Debe seleccionar un centro de costo/destino.");
    if (type === 'SALIDA' && !carriedBy.trim()) return setError("Debe indicar el nombre de quien lleva físicamente la mercadería.");

    // Validar Stock Real antes de procesar
    if (type === 'SALIDA') {
      const stockError = cartItems.find(item => item.quantity > item.stock);
      if (stockError) return setError(`Stock insuficiente para "${stockError.name}". Stock actual: ${stockError.stock}`);
    }
    
    setSaving(true);
    try {
      const destinoObj = destinos.find(d => d.id === selectedDestinoId);
      const batchPayload = cartItems.map(item => ({
        productId: item.productId,
        type,
        quantity: item.quantity,
        dispatcher: userEmail,
        reason: type === 'SALIDA' ? `${reason} (Portador: ${carriedBy})` : reason,
        destinationName: destinoObj?.name
      }));
      await api.registerBatchMovements(batchPayload);
      showDialog("Sincronizado", `${cartItems.length} items registrados con éxito.`, "success");
      setIsModalOpen(false);
      loadData();
    } catch (err: any) { showDialog("Error", err.message, "error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Kardex de Operaciones</h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Historial y Despachos</p>
        </div>
        <div className="flex gap-2">
          {role !== 'VIEWER' && (
            <div className="bg-white p-1.5 rounded-[1.5rem] shadow-sm border border-slate-100 flex gap-2">
              <button onClick={() => handleOpenModal('INGRESO')} className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center gap-2"><ArrowUpCircle className="w-4 h-4" /> Ingreso</button>
              <button onClick={() => handleOpenModal('SALIDA')} className="bg-rose-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-rose-700 shadow-xl shadow-rose-100 transition-all flex items-center gap-2"><ArrowDownCircle className="w-4 h-4" /> Despacho</button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <tr>
                <th className="px-8 py-6 text-left">Fecha y Hora</th>
                <th className="px-6 py-6 text-left">Producto</th>
                <th className="px-6 py-6 text-center">Cant.</th>
                <th className="px-6 py-6 text-left">Autorizó / Detalle</th>
                <th className="px-8 py-6 text-center">Saldo final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" /></td></tr>
              ) : movements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase">{new Date(m.date).toLocaleString()}</td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${m.type === 'INGRESO' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {m.type === 'INGRESO' ? <ArrowUp className="w-3.5 h-3.5" /> : <ArrowDown className="w-3.5 h-3.5" />}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-xs uppercase">{m.productName}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase">{m.destinationName ? `Hacia: ${m.destinationName}` : 'Hacia Almacén'}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-5 text-center font-black text-sm ${m.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.type === 'INGRESO' ? '+' : '-'}{m.quantity}
                  </td>
                  <td className="px-6 py-5">
                    <p className="text-[9px] font-black text-indigo-500 uppercase flex items-center gap-1"><UserCheck className="w-3 h-3" /> {m.dispatcher}</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1 line-clamp-1">{m.reason || 'S/M'}</p>
                  </td>
                  <td className="px-8 py-5 text-center"><span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-700">{m.balanceAfter}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-4xl sm:rounded-[3rem] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className={`p-8 border-b border-slate-100 flex justify-between items-center ${type === 'INGRESO' ? 'bg-indigo-50/40' : 'bg-rose-50/40'}`}>
               <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Módulo de {type === 'INGRESO' ? 'Ingreso Logístico' : 'Despacho de Materiales'}</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Sincronización Directa a Stock</p>
               </div>
               <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-white rounded-2xl transition-all shadow-sm"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar">
               {error && <div className="p-5 bg-rose-50 text-rose-700 rounded-[1.5rem] text-[11px] font-black uppercase border-2 border-rose-100 flex items-center gap-3 animate-bounce"><AlertTriangle className="w-5 h-5" /> {error}</div>}
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                     <div className="relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3 mb-2 block">Seleccionar Productos</label>
                        <div className="relative">
                           <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                           <input type="text" className="w-full pl-12 pr-6 py-5 bg-slate-50 rounded-[1.5rem] outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-500 transition-all shadow-inner" placeholder="Escriba nombre o SKU..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                        </div>
                        {productSearch && filteredProductsForSearch.length > 0 && (
                          <div className="absolute z-10 w-full mt-3 bg-white border border-slate-100 rounded-[1.5rem] shadow-2xl max-h-60 overflow-y-auto no-scrollbar border-indigo-100">
                            {filteredProductsForSearch.map(p => (
                              <button key={p.id} type="button" onClick={() => addToCart(p)} className="w-full p-5 text-left hover:bg-indigo-50 flex items-center justify-between border-b border-slate-50 last:border-0 transition-colors group">
                                <div><p className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{p.name}</p><p className="text-[9px] text-slate-400 font-black tracking-widest">{p.code}</p></div>
                                <div className="text-right"><p className="text-[11px] font-black text-indigo-600">STOCK: {p.stock}</p></div>
                              </button>
                            ))}
                          </div>
                        )}
                     </div>

                     <div className="space-y-5">
                        {type === 'SALIDA' && (
                           <>
                              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Centro de Costo / Destino *</label>
                                 <select className="w-full p-4 bg-slate-50 rounded-[1.2rem] font-black text-xs uppercase" value={selectedDestinoId} onChange={e => setSelectedDestinoId(e.target.value)}>
                                    <option value="">-- SELECCIONAR --</option>
                                    {destinos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                 </select>
                              </div>
                              <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Nombre del Portador (Quién Lleva) *</label>
                                 <input type="text" className="w-full p-4 bg-slate-50 rounded-[1.2rem] font-bold text-sm" placeholder="Ej: Juan Pérez / Conductor de Unidad..." value={carriedBy} onChange={e => setCarriedBy(e.target.value)} />
                              </div>
                           </>
                        )}
                        <div className="space-y-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Motivo / Observaciones</label>
                           <textarea className="w-full p-4 bg-slate-50 rounded-[1.2rem] font-bold text-sm h-24 resize-none" placeholder="Justificación del movimiento..." value={reason} onChange={e => setReason(e.target.value)} />
                        </div>
                        <div className="p-4 bg-indigo-50/50 rounded-[1.2rem] border border-indigo-100">
                           <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Autorizado Automáticamente por:</p>
                           <p className="text-xs font-black text-indigo-600 truncate uppercase">{userEmail}</p>
                        </div>
                     </div>
                  </div>

                  <div className="bg-slate-50 rounded-[2.5rem] p-8 flex flex-col h-full border border-slate-100 shadow-inner">
                     <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center justify-between">Carrito de Despacho <span className="bg-white px-3 py-1 rounded-full text-slate-800 shadow-sm">{cartItems.length}</span></h4>
                     <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar pr-1">
                        {cartItems.length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-30">
                              <ShoppingCart className="w-16 h-16 mb-4" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Agregue productos para procesar</p>
                           </div>
                        ) : cartItems.map(item => (
                           <div key={item.productId} className="bg-white p-5 rounded-[1.5rem] shadow-sm border border-slate-100 flex items-center justify-between group animate-in slide-in-from-right-4">
                              <div className="max-w-[55%]">
                                 <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate">{item.name}</p>
                                 <div className="flex items-center gap-2 mt-1">
                                    <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${item.stock <= 0 ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>STOCK: {item.stock}</span>
                                 </div>
                              </div>
                              <div className="flex items-center gap-3">
                                 <div className="flex flex-col items-center">
                                    <label className="text-[8px] font-black text-slate-400 uppercase mb-1">CANT.</label>
                                    <input type="number" min="1" className={`w-20 p-2 rounded-xl text-center font-black text-xs outline-none focus:ring-2 ${item.quantity > item.stock && type === 'SALIDA' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-slate-50'}`} value={item.quantity} onChange={e => updateQuantity(item.productId, Math.max(1, Number(e.target.value)))} />
                                 </div>
                                 <button type="button" onClick={() => setCartItems(cartItems.filter(i => i.productId !== item.productId))} className="p-3 text-slate-200 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash className="w-4 h-4" /></button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-8 border-t border-slate-100 flex gap-4 bg-white shrink-0">
               <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-[10px] font-black uppercase text-slate-400 tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Cancelar</button>
               <button type="submit" disabled={saving || cartItems.length === 0} className={`flex-[2] py-5 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 disabled:opacity-50 ${type === 'INGRESO' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                  {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <><Save className="w-5 h-5" /> Procesar Movimiento</>}
               </button>
            </div>
          </form>
        </div>
      )}

      {dialog && (
        <CustomDialog isOpen={dialog.isOpen} title={dialog.title} message={dialog.message} type={dialog.type} onCancel={() => setDialog(null)} />
      )}
    </div>
  );
};
