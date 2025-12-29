
import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Product, TransactionType, Destination, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { exportToExcel, exportToPDF } from '../services/excelService.ts';
import { CustomDialog } from '../components/CustomDialog.tsx';
import { 
  ArrowDownCircle, ArrowUpCircle, User, 
  Calendar, Loader2, X, MapPin, Building2, ShoppingBag, 
  Info, AlertTriangle, ArrowRight, Truck, Package, 
  Check, CheckCircle, Search, Trash2, Plus, ArrowUp, ArrowDown, FileSpreadsheet, FileText, Save
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
      const [m, p, d] = await Promise.all([
        api.getMovements(), 
        api.getProducts(),
        api.getDestinos()
      ]);
      setMovements(m || []);
      setProducts(p || []);
      setDestinos((d || []).filter((dest: any) => dest.active));

      if (initialProductId && p) {
        const prod = (p as Product[]).find(prod => prod.id === initialProductId);
        if (prod) {
          setType('SALIDA');
          setCartItems([{ productId: prod.id, name: prod.name, code: prod.code, quantity: 1, stock: prod.stock }]);
          setIsModalOpen(true);
        }
      }
    } catch (e) {
      showDialog("Conexión", "Error al sincronizar datos de Kardex", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [initialProductId]);

  const filteredProductsForSearch = useMemo(() => {
    if (!productSearch) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.code.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 8);
  }, [products, productSearch]);

  const addToCart = (p: Product) => {
    if (cartItems.find(i => i.productId === p.id)) return;
    setCartItems([...cartItems, { productId: p.id, name: p.name, code: p.code, quantity: 1, stock: p.stock }]);
    setProductSearch('');
  };

  const removeFromCart = (id: string) => {
    setCartItems(cartItems.filter(i => i.productId !== id));
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
    if (cartItems.length === 0) return setError("Debe agregar al menos un producto");
    if (type === 'SALIDA' && !selectedDestinoId) return setError("Debe seleccionar un destino");
    
    setSaving(true);
    try {
      const destinoObj = destinos.find(d => d.id === selectedDestinoId);
      const batchPayload = cartItems.map(item => ({
        productId: item.productId,
        type,
        quantity: item.quantity,
        dispatcher: userEmail,
        reason: type === 'SALIDA' ? `${reason} (Retira: ${carriedBy})` : reason,
        destinationName: destinoObj?.name
      }));
      await api.registerBatchMovements(batchPayload);
      showDialog("Operación Exitosa", `Se han procesado ${cartItems.length} movimientos correctamente`, "success");
      setIsModalOpen(false);
      loadData();
    } catch (err: any) { 
      showDialog("Error", err.message, "error");
    } finally { 
      setSaving(false); 
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kardex de Movimientos</h1>
          <p className="text-xs text-slate-500 font-black uppercase tracking-widest mt-0.5">Control Logístico de Stock</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {role !== 'VIEWER' && (
            <div className="flex gap-1 bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
              <button onClick={() => handleOpenModal('INGRESO')} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">Stock Entrada</button>
              <button onClick={() => handleOpenModal('SALIDA')} className="bg-rose-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all">Stock Despacho</button>
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
                <th className="px-6 py-5 text-left">Autorizó / Detalle</th>
                <th className="px-6 py-5 text-center">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" /></td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-black uppercase text-[10px]">No hay movimientos registrados</td></tr>
              ) : movements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase">{new Date(m.date).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${m.type === 'INGRESO' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {m.type === 'INGRESO' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs">{m.productName}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase truncate max-w-[150px]">{m.type === 'SALIDA' ? `Destino: ${m.destinationName || 'Interno'}` : 'Entrada Almacén'}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-center font-black text-sm ${m.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.type === 'INGRESO' ? '+' : '-'}{m.quantity}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] font-black text-indigo-500 uppercase leading-none">{m.dispatcher}</p>
                    {m.reason && <p className="text-[9px] text-slate-400 font-bold mt-1 truncate max-w-[200px]">{m.reason}</p>}
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
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-3xl sm:rounded-[3rem] flex flex-col shadow-2xl overflow-hidden">
            <div className={`p-6 border-b border-slate-100 flex justify-between items-center ${type === 'INGRESO' ? 'bg-indigo-50/50' : 'bg-rose-50/50'}`}>
               <div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Registrar {type === 'INGRESO' ? 'Ingreso a Almacén' : 'Despacho de Stock'}</h3>
                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">Sincronización en Tiempo Real</p>
               </div>
               <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 no-scrollbar">
               {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl text-[10px] font-black uppercase border border-rose-100">{error}</div>}
               
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <div className="relative">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Buscar Producto</label>
                        <div className="relative">
                           <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
                           <input type="text" className="w-full pl-11 pr-4 py-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm" placeholder="Nombre o SKU..." value={productSearch} onChange={e => setProductSearch(e.target.value)} />
                        </div>
                        {productSearch && filteredProductsForSearch.length > 0 && (
                          <div className="absolute z-10 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl max-h-48 overflow-y-auto no-scrollbar">
                            {filteredProductsForSearch.map(p => (
                              <button key={p.id} type="button" onClick={() => addToCart(p)} className="w-full p-4 text-left hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0">
                                <div><p className="text-xs font-bold text-slate-800">{p.name}</p><p className="text-[8px] text-slate-400 font-black uppercase">{p.code}</p></div>
                                <p className="text-[10px] font-black text-indigo-600">Stock: {p.stock}</p>
                              </button>
                            ))}
                          </div>
                        )}
                     </div>

                     {type === 'SALIDA' && (
                        <div className="space-y-4 pt-2">
                           <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Centro de Costo / Destino *</label>
                              <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" value={selectedDestinoId} onChange={e => setSelectedDestinoId(e.target.value)}>
                                 <option value="">Seleccionar...</option>
                                 {destinos.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                              </select>
                           </div>
                           <div>
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Recibido por (Nombre Completo) *</label>
                              <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm" placeholder="Nombre de quien retira..." value={carriedBy} onChange={e => setCarriedBy(e.target.value)} />
                           </div>
                        </div>
                     )}
                     
                     <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 mb-1 block">Observación / Motivo</label>
                        <textarea className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-sm h-24 resize-none" placeholder="Motivo del movimiento..." value={reason} onChange={e => setReason(e.target.value)} />
                     </div>
                  </div>

                  <div className="bg-slate-50 rounded-[2rem] p-6 space-y-4">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Productos en Lista ({cartItems.length})</h4>
                     <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar pr-2">
                        {cartItems.length === 0 ? (
                           <div className="py-20 text-center text-[9px] font-black text-slate-300 uppercase">Sin productos seleccionados</div>
                        ) : cartItems.map(item => (
                           <div key={item.productId} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
                              <div className="max-w-[60%]">
                                 <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                                 <p className="text-[8px] text-slate-400 font-black uppercase">Saldo Actual: {item.stock}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                 <input type="number" min="1" className="w-16 p-2 bg-slate-50 rounded-lg text-center font-black text-xs" value={item.quantity} onChange={e => updateQuantity(item.productId, Number(e.target.value))} />
                                 <button type="button" onClick={() => removeFromCart(item.productId)} className="p-2 text-rose-300 hover:text-rose-600"><X className="w-4 h-4" /></button>
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>

            <div className="p-6 border-t border-slate-100 flex gap-4 bg-slate-50/50">
               <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cancelar</button>
               <button type="submit" disabled={saving} className={`flex-[2] py-4 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 ${type === 'INGRESO' ? 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-100'}`}>
                  {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <><Save className="w-4 h-4" /> Procesar Movimiento</>}
               </button>
            </div>
          </form>
        </div>
      )}

      {dialog && (
        <CustomDialog 
          isOpen={dialog.isOpen}
          title={dialog.title}
          message={dialog.message}
          type={dialog.type}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
};
