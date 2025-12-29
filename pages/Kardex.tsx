
import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Product, TransactionType, Destination, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { CustomDialog } from '../components/CustomDialog.tsx';
// Fixed error: Added missing 'Box' import from lucide-react
import { 
  ArrowDownCircle, ArrowUpCircle, User, 
  Calendar, Loader2, X, MapPin, Building2, ShoppingBag, 
  Info, AlertTriangle, ArrowRight, Truck, Package, 
  Check, CheckCircle, Search, Trash2, Plus, ArrowUp, ArrowDown, FileSpreadsheet, Save, UserCheck, Trash,
  Zap, ShoppingCart, UserPlus, Factory, Box
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
  const [carriedBy, setCarriedBy] = useState(''); // Portador físico
  const [supplierName, setSupplierName] = useState(''); // Proveedor en ingresos
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
      showDialog("Conexión", "Error al sincronizar datos logísticos", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const filteredProductsForSearch = useMemo(() => {
    if (!productSearch) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.code.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 5);
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
    setSupplierName('');
    setReason('');
    setProductSearch('');
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (cartItems.length === 0) return setError("El carrito de movimiento está vacío.");
    
    if (type === 'SALIDA') {
      if (!selectedDestinoId) return setError("Indique el Centro de Costo o Destino final.");
      if (!carriedBy.trim()) return setError("Indique el nombre del portador (quién retira físicamente).");
      
      const stockError = cartItems.find(item => item.quantity > item.stock);
      if (stockError) return setError(`Stock insuficiente para "${stockError.name}". Saldo real: ${stockError.stock}`);
    }

    if (type === 'INGRESO' && !supplierName.trim()) {
      return setError("Debe indicar el Proveedor o Procedencia del material.");
    }
    
    setSaving(true);
    try {
      const destinoObj = destinos.find(d => d.id === selectedDestinoId);
      const batchPayload = cartItems.map(item => ({
        productId: item.productId,
        type,
        quantity: item.quantity,
        dispatcher: userEmail, // Automático por seguridad
        reason: type === 'SALIDA' 
          ? `${reason} (Portador: ${carriedBy})` 
          : `${reason} (Proveedor: ${supplierName})`,
        destinationName: destinoObj?.name,
        supplierName: type === 'INGRESO' ? supplierName : null,
        carriedBy: type === 'SALIDA' ? carriedBy : null
      }));

      await api.registerBatchMovements(batchPayload);
      showDialog("Operación Exitosa", `${cartItems.length} registros sincronizados con stock maestro.`, "success");
      setIsModalOpen(false);
      loadData();
    } catch (err: any) { 
      showDialog("Fallo Logístico", err.message, "error");
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Kardex Logístico</h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Gestión Dinámica de Entradas y Despachos</p>
        </div>
        <div className="flex gap-3">
          {role !== 'VIEWER' && (
            <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-slate-100 flex gap-2">
              <button onClick={() => handleOpenModal('INGRESO')} className="bg-indigo-600 text-white px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center gap-2 tracking-widest"><ArrowUpCircle className="w-5 h-5" /> Ingreso Stock</button>
              <button onClick={() => handleOpenModal('SALIDA')} className="bg-rose-600 text-white px-6 py-4 rounded-[1.5rem] text-[10px] font-black uppercase hover:bg-rose-700 shadow-xl shadow-rose-100 transition-all flex items-center gap-2 tracking-widest"><ArrowDownCircle className="w-5 h-5" /> Despacho Salida</button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[4rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              <tr>
                <th className="px-10 py-8 text-left">Fecha / Hora</th>
                <th className="px-6 py-8 text-left">Producto / Detalle</th>
                <th className="px-6 py-8 text-center">Cantidad</th>
                <th className="px-6 py-8 text-left">Responsable / Info</th>
                <th className="px-10 py-8 text-center">Saldo final</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="py-24 text-center"><Loader2 className="w-12 h-12 text-indigo-500 animate-spin mx-auto" /></td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan={5} className="py-24 text-center text-slate-300 font-black uppercase text-[11px] tracking-widest">No se detectan movimientos en la base de datos</td></tr>
              ) : movements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-10 py-6 text-[10px] font-black text-slate-400 uppercase leading-tight">{new Date(m.date).toLocaleDateString()}<br/><span className="text-slate-300 font-bold">{new Date(m.date).toLocaleTimeString()}</span></td>
                  <td className="px-6 py-6">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${m.type === 'INGRESO' ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600 shadow-inner'}`}>
                        {m.type === 'INGRESO' ? <ArrowUp className="w-5 h-5" /> : <ArrowDown className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{m.productName}</p>
                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{m.destinationName ? `Destino: ${m.destinationName}` : 'Ingreso Logístico'}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-6 text-center font-black text-lg ${m.type === 'INGRESO' ? 'text-indigo-600' : 'text-rose-600'}`}>
                    {m.type === 'INGRESO' ? '+' : '-'}{m.quantity}
                  </td>
                  <td className="px-6 py-6">
                    <p className="text-[9px] font-black text-indigo-500 uppercase flex items-center gap-1.5"><UserCheck className="w-4 h-4" /> {m.dispatcher}</p>
                    <p className="text-[10px] text-slate-500 font-bold mt-1 line-clamp-1 italic">{m.reason || 'Sin observación técnica'}</p>
                  </td>
                  <td className="px-10 py-6 text-center"><span className="px-4 py-2 bg-slate-100 rounded-xl text-xs font-black text-slate-700 shadow-inner">{m.balanceAfter} UND</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-0 sm:p-4 animate-in fade-in duration-300">
          <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-xl" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-5xl sm:rounded-[4rem] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500">
            <div className={`p-8 sm:p-10 border-b border-slate-100 flex justify-between items-center ${type === 'INGRESO' ? 'bg-indigo-50/50' : 'bg-rose-50/50'}`}>
               <div>
                  <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Módulo de {type === 'INGRESO' ? 'Ingreso Logístico' : 'Despacho Multiproducto'}</h3>
                  <p className="text-[10px] text-slate-400 font-black uppercase mt-1 tracking-widest flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500 animate-pulse" /> Sincronización Directa a Kardex Maestro</p>
               </div>
               <button type="button" onClick={() => setIsModalOpen(false)} className="p-4 bg-white/50 hover:bg-white rounded-[1.5rem] transition-all shadow-sm"><X className="w-8 h-8 text-slate-400" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-10 no-scrollbar">
               {error && <div className="p-6 bg-rose-50 text-rose-700 rounded-[2rem] text-[11px] font-black uppercase border-2 border-rose-100 flex items-center gap-4 animate-bounce"><AlertTriangle className="w-6 h-6 shrink-0" /> {error}</div>}
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                     <div className="relative">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-3 block">Escaneo o Búsqueda de Productos</label>
                        <div className="relative">
                           <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                           <input type="text" className="w-full pl-14 pr-6 py-6 bg-slate-50 rounded-[2rem] outline-none font-black text-sm shadow-inner focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all" placeholder="Escriba NOMBRE o SKU para agregar..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                        </div>
                        {productSearch && filteredProductsForSearch.length > 0 && (
                          <div className="absolute z-[110] w-full mt-4 bg-white border border-slate-100 rounded-[2rem] shadow-2xl max-h-72 overflow-y-auto no-scrollbar border-indigo-100 animate-in slide-in-from-top-4">
                            {filteredProductsForSearch.map(p => (
                              <button key={p.id} type="button" onClick={() => addToCart(p)} className="w-full p-6 text-left hover:bg-indigo-50 flex items-center justify-between border-b border-slate-50 last:border-0 transition-all group">
                                <div className="flex items-center gap-4">
                                   <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-100 shadow-sm"><Package className="w-5 h-5 text-slate-300 group-hover:text-indigo-500" /></div>
                                   <div><p className="text-xs font-black text-slate-800 uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{p.name}</p><p className="text-[9px] text-slate-400 font-black tracking-widest mt-0.5">{p.code}</p></div>
                                </div>
                                <div className="text-right"><p className="text-[11px] font-black text-indigo-600 bg-white px-3 py-1 rounded-lg border border-indigo-50">SALDO: {p.stock}</p></div>
                              </button>
                            ))}
                          </div>
                        )}
                     </div>

                     <div className="space-y-6">
                        {type === 'SALIDA' ? (
                           <>
                              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Centro de Costo / Destino *</label>
                                 <select className="w-full p-5 bg-slate-50 rounded-[1.8rem] font-black text-xs uppercase shadow-inner outline-none cursor-pointer" value={selectedDestinoId} onChange={e => setSelectedDestinoId(e.target.value)}>
                                    <option value="">-- SELECCIONAR DESTINO --</option>
                                    {destinos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                 </select>
                              </div>
                              <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Nombre de quien retira (Portador Físico) *</label>
                                 <div className="relative">
                                    <UserPlus className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                    <input type="text" className="w-full pl-14 pr-6 py-5 bg-slate-50 rounded-[1.8rem] font-black text-xs uppercase shadow-inner" placeholder="Ej: JUAN PEREZ (CONTRATISTA)" value={carriedBy} onChange={e => setCarriedBy(e.target.value.toUpperCase())} />
                                 </div>
                              </div>
                           </>
                        ) : (
                           <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Proveedor / Procedencia del Material *</label>
                              <div className="relative">
                                 <Factory className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
                                 <input type="text" className="w-full pl-14 pr-6 py-5 bg-slate-50 rounded-[1.8rem] font-black text-xs uppercase shadow-inner" placeholder="Ej: CORPORACION MINERA S.A." value={supplierName} onChange={e => setSupplierName(e.target.value.toUpperCase())} />
                              </div>
                           </div>
                        )}
                        <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Justificación Técnica / Observación</label>
                           <textarea className="w-full p-6 bg-slate-50 rounded-[2rem] font-bold text-sm h-32 resize-none shadow-inner uppercase" placeholder="Escriba motivo detallado del movimiento..." value={reason} onChange={e => setReason(e.target.value)} />
                        </div>
                        
                        <div className="p-6 bg-slate-900 rounded-[2rem] flex items-center justify-between shadow-2xl">
                           <div>
                             <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Responsable del Registro (Auto):</p>
                             <p className="text-xs font-black text-white uppercase tracking-tight">{userEmail}</p>
                           </div>
                           <UserCheck className="w-7 h-7 text-indigo-400" />
                        </div>
                     </div>
                  </div>

                  <div className="bg-slate-50 rounded-[3.5rem] p-10 flex flex-col h-full border border-slate-100 shadow-inner relative">
                     <div className="flex items-center justify-between mb-8">
                        <h4 className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center gap-3"><ShoppingCart className="w-6 h-6" /> Lista de Carga</h4>
                        <span className="bg-indigo-600 text-white px-5 py-2 rounded-full text-xs font-black shadow-lg animate-bounce">{cartItems.length} ITEMS</span>
                     </div>
                     
                     <div className="space-y-4 flex-1 overflow-y-auto no-scrollbar pr-2">
                        {cartItems.length === 0 ? (
                           <div className="h-full flex flex-col items-center justify-center text-center py-20 opacity-20 animate-pulse">
                              <Box className="w-24 h-24 mb-6" />
                              <p className="text-[11px] font-black uppercase tracking-[0.3em]">Carrito Logístico Vacío</p>
                           </div>
                        ) : cartItems.map(item => (
                           <div key={item.productId} className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex items-center justify-between group animate-in slide-in-from-right-8 transition-all hover:shadow-md">
                              <div className="max-w-[55%]">
                                 <p className="text-xs font-black text-slate-800 uppercase tracking-tight truncate mb-1">{item.name}</p>
                                 <div className="flex items-center gap-2">
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase shadow-sm ${item.stock <= 0 ? 'bg-rose-50 text-rose-600' : 'bg-indigo-50 text-indigo-600'}`}>STOCK: {item.stock}</span>
                                 </div>
                              </div>
                              <div className="flex items-center gap-4">
                                 <div className="flex flex-col items-center">
                                    <label className="text-[8px] font-black text-slate-400 uppercase mb-2">OPERAR</label>
                                    <input 
                                      type="number" 
                                      min="1" 
                                      className={`w-24 p-4 rounded-2xl text-center font-black text-sm outline-none shadow-inner transition-all ${item.quantity > item.stock && type === 'SALIDA' ? 'bg-rose-50 text-rose-600 border-2 border-rose-200 ring-4 ring-rose-100' : 'bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-50'}`} 
                                      value={item.quantity} 
                                      onChange={e => updateQuantity(item.productId, Math.max(1, Number(e.target.value)))} 
                                    />
                                 </div>
                                 <button type="button" onClick={() => setCartItems(cartItems.filter(i => i.productId !== item.productId))} className="p-4 text-slate-200 hover:text-rose-600 hover:bg-rose-50 rounded-[1.5rem] transition-all"><Trash className="w-6 h-6" /></button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-8 sm:p-12 border-t border-slate-100 flex gap-6 bg-white shrink-0 shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)]">
               <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-6 text-[11px] font-black uppercase text-slate-400 tracking-[0.3em] hover:bg-slate-50 rounded-[2rem] transition-all">Cancelar Acción</button>
               <button type="submit" disabled={saving || cartItems.length === 0} className={`flex-[2] py-6 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.4em] shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale ${type === 'INGRESO' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-200'}`}>
                  {saving ? <Loader2 className="animate-spin w-7 h-7" /> : <><Save className="w-7 h-7" /> {type === 'INGRESO' ? 'Cargar a Almacén' : 'Confirmar Despacho'}</>}
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
