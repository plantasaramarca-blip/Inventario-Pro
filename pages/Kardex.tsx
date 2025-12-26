
import React, { useState, useEffect } from 'https://esm.sh/react@19.2.3';
import { Movement, Product, TransactionType, Destination } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { exportToExcel, formatTimestamp } from '../services/excelService.ts';
import { 
  ArrowDownCircle, ArrowUpCircle, User, 
  Calendar, FileSpreadsheet, Loader2, X, MapPin, Building2, ShoppingBag, Info, AlertTriangle, ArrowRight, Truck, Package, Check
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

interface KardexProps {
  onNavigateToDestinos?: () => void;
}

export const Kardex: React.FC<KardexProps> = ({ onNavigateToDestinos }) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [destinos, setDestinos] = useState<Destination[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [type, setType] = useState<TransactionType>('SALIDA');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedDestinoId, setSelectedDestinoId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [dispatcher, setDispatcher] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

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
    setType(trxType);
    setSelectedProductId('');
    setSelectedDestinoId('');
    setQuantity(1);
    setDispatcher('');
    setReason('');
    setError('');
    setIsModalOpen(true);
  };

  const selectedProduct = products.find(p => p.id === selectedProductId);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return setError("Selecciona un producto");
    
    if (type === 'SALIDA') {
      if (destinos.length === 0) {
        return setError("⚠️ Debes configurar al menos un destino antes de registrar salidas.");
      }
      if (!selectedDestinoId) {
        return setError("Selecciona un destino de salida");
      }
    }
    
    const destinoObj = destinos.find(d => d.id === selectedDestinoId);
    
    try {
      await api.registerMovement({
        productId: selectedProductId,
        type,
        quantity,
        dispatcher,
        reason,
        destinationId: selectedDestinoId || undefined,
        destinationName: destinoObj?.name,
        destinationType: destinoObj?.type
      });
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || 'Error');
    }
  };

  const getDestinationBadge = (name?: string, type?: string) => {
    if (!name) return <span className="text-slate-300">-</span>;
    let style = "bg-slate-100 text-slate-600 border-slate-200";
    let icon = <MapPin className="w-2.5 h-2.5 mr-1" />;
    
    if (type === 'cliente') {
      style = "bg-blue-50 text-blue-700 border-blue-100";
      icon = <ShoppingBag className="w-2.5 h-2.5 mr-1" />;
    } else if (type === 'sucursal') {
      style = "bg-emerald-50 text-emerald-700 border-emerald-100";
      icon = <Building2 className="w-2.5 h-2.5 mr-1" />;
    } else if (type === 'interno') {
      style = "bg-gray-100 text-gray-700 border-gray-200";
      icon = <Info className="w-2.5 h-2.5 mr-1" />;
    }
    
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border ${style}`}>
        {icon} {name}
      </span>
    );
  };

  const handleExcelExport = () => {
    const dataToExport = movements.map(m => ({
      'Fecha': new Date(m.date).toLocaleString(),
      'Tipo': m.type,
      'Producto': m.productName,
      'Cantidad': m.quantity,
      'Responsable': m.dispatcher,
      'Destino': m.type === 'SALIDA' ? (m.destinationName || '-') : '-',
      'Tipo Destino': m.type === 'SALIDA' ? (m.destinationType || '-') : '-',
      'Motivo/Referencia': m.reason,
      'Stock Final': m.balanceAfter
    }));
    const fileName = `Kardex_${formatTimestamp(new Date())}.xlsx`;
    exportToExcel(dataToExport, fileName, 'Movimientos');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Kardex Central</h1>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-widest mt-1">Control Maestro de Stock</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExcelExport} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg hover:bg-emerald-700 transition-all">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Reporte Excel
          </button>
          <div className="flex gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
            <button onClick={() => handleOpenModal('INGRESO')} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-all">Ingreso</button>
            <button onClick={() => handleOpenModal('SALIDA')} className="bg-rose-600 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-rose-700 transition-all">Despacho</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 text-left">Fecha / Hora</th>
                <th className="px-6 py-5 text-left">Producto</th>
                <th className="px-6 py-5 text-center">Cant.</th>
                <th className="px-6 py-5 text-left">Responsable</th>
                <th className="px-6 py-5 text-left">Destino</th>
                <th className="px-6 py-5 text-center">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" /></td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan={6} className="py-20 text-center">
                  <Package className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin movimientos registrados</p>
                </td></tr>
              ) : movements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-[10px] font-bold text-slate-500">
                    <Calendar className="inline w-3 h-3 mr-2" /> {new Date(m.date).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className={`p-1.5 rounded-lg mr-3 ${m.type === 'INGRESO' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {m.type === 'INGRESO' ? <ArrowUpCircle className="w-4 h-4" /> : <ArrowDownCircle className="w-4 h-4" />}
                      </div>
                      <p className="font-bold text-slate-800">{m.productName}</p>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-center font-black text-base ${m.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.type === 'INGRESO' ? '+' : '-'}{m.quantity}
                  </td>
                  <td className="px-6 py-4 text-[10px] font-black text-indigo-500 uppercase">
                    <User className="inline w-3 h-3 mr-2" /> {m.dispatcher}
                  </td>
                  <td className="px-6 py-4">
                    {m.type === 'SALIDA' ? getDestinationBadge(m.destinationName, m.destinationType) : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="inline-block px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-700">
                      {m.balanceAfter}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-[3.5rem] p-10 w-full max-w-lg shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95">
               
               <div className="flex items-center justify-between mb-8">
                 <div className="flex items-center">
                   <div className={`p-4 rounded-[1.5rem] mr-5 shadow-lg ${type === 'INGRESO' ? 'bg-indigo-600 shadow-indigo-200' : 'bg-rose-600 shadow-rose-200'} text-white`}>
                     {type === 'INGRESO' ? <Truck className="w-6 h-6" /> : <ArrowRight className="w-6 h-6 rotate-45" />}
                   </div>
                   <div>
                     <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{type === 'INGRESO' ? 'Entrada' : 'Despacho'}</h3>
                     <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Registro de Kardex</p>
                   </div>
                 </div>
                 <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-2xl transition-colors"><X className="w-6 h-6 text-slate-300" /></button>
               </div>
               
               {error && (
                 <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2">
                   <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                   <p className="text-xs font-bold text-rose-700">{error}</p>
                 </div>
               )}

               <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">¿Qué producto sale?</label>
                    <select className="w-full p-5 text-sm font-bold rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} (Saldo: {p.stock})</option>)}
                    </select>
                  </div>

                  {type === 'SALIDA' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">¿A dónde va?</label>
                      <select required className="w-full p-5 text-sm font-bold rounded-[1.5rem] bg-indigo-50 text-indigo-700 border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all outline-none" value={selectedDestinoId} onChange={e => setSelectedDestinoId(e.target.value)}>
                        <option value="">Destino del despacho...</option>
                        {destinos.map(d => (
                          <option key={d.id} value={d.id}>
                            {d.type === 'cliente' ? '🛒' : d.type === 'sucursal' ? '🏢' : '⚙️'} {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Cantidad</label>
                      <input type="number" placeholder="0" min="1" required className="w-full p-5 text-lg font-black rounded-[1.5rem] bg-slate-50 text-center outline-none focus:ring-2 focus:ring-indigo-500" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Despachador</label>
                      <input type="text" placeholder="Tu nombre" required className="w-full p-5 text-sm font-bold rounded-[1.5rem] bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" value={dispatcher} onChange={e => setDispatcher(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Motivo o Referencia</label>
                    <input type="text" placeholder="Ej: Pedido #452 / Reemplazo" required className="w-full p-5 text-sm font-medium rounded-[1.5rem] bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" value={reason} onChange={e => setReason(e.target.value)} />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-4 pt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="order-2 sm:order-1 flex-1 py-5 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Cancelar</button>
                    <button type="submit" className={`order-1 sm:order-2 flex-[2] py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] text-white shadow-2xl transition-all flex items-center justify-center gap-3 ${type === 'INGRESO' ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-rose-600 hover:bg-rose-700'}`}>
                      <Check className="w-5 h-5" /> Confirmar
                    </button>
                  </div>
               </div>
          </form>
        </div>
       )}
    </div>
  );
};
