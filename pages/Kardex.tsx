
import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Product, TransactionType, Contact, Destination } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { exportToExcel, formatTimestamp } from '../services/excelService.ts';
import { formatCurrency } from '../utils/currencyUtils.ts';
import { 
  ArrowDownCircle, ArrowUpCircle, Filter, User, ImageIcon, 
  DollarSign, TrendingUp, Calendar, FileSpreadsheet, Loader2, X, MapPin, Building2, ShoppingBag, Info, AlertTriangle, ArrowRight, Settings
} from 'lucide-react';

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
  const [updatedPrice, setUpdatedPrice] = useState<number | ''>('');
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
    setUpdatedPrice('');
    setDispatcher('');
    setReason('');
    setError('');
    setIsModalOpen(true);
  };

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
        updatedPrice: updatedPrice || undefined,
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
          <p className="text-xs text-gray-500 font-medium">Trazabilidad de existencias y centros de costo.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExcelExport}
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-md hover:bg-emerald-700 transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
          </button>
          <div className="flex gap-1 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
            <button onClick={() => handleOpenModal('INGRESO')} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-indigo-700 transition-colors">Recibir</button>
            <button onClick={() => handleOpenModal('SALIDA')} className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-md hover:bg-rose-700 transition-colors">Despachar</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
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
                <tr>
                  <td colSpan={6} className="py-20 text-center">
                    <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sincronizando Historial...</p>
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-20 text-center text-slate-400 uppercase text-[10px] font-black tracking-widest">
                    No hay movimientos registrados
                  </td>
                </tr>
              ) : movements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center text-[10px] font-bold text-slate-500">
                      <Calendar className="w-3 h-3 mr-2 text-slate-300" />
                      {new Date(m.date).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-3 ${m.type === 'INGRESO' ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                      <div>
                        <p className="font-bold text-slate-800">{m.productName}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">{m.reason}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`text-sm font-black ${m.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {m.type === 'INGRESO' ? '+' : '-'}{m.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-[10px] font-black text-indigo-500 uppercase">
                      <User className="w-3 h-3 mr-2" /> {m.dispatcher}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {m.type === 'SALIDA' ? getDestinationBadge(m.destinationName, m.destinationType) : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-xs font-black text-slate-700">{m.balanceAfter}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl overflow-y-auto max-h-[95vh]">
               <div className="flex items-center mb-8">
                 <div className={`p-3 rounded-2xl mr-4 shadow-lg ${type === 'INGRESO' ? 'bg-indigo-600 shadow-indigo-200' : 'bg-rose-600 shadow-rose-200'} text-white`}>
                   {type === 'INGRESO' ? <ArrowUpCircle /> : <ArrowDownCircle />}
                 </div>
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{type === 'INGRESO' ? 'Entrada (Compra/Dev)' : 'Salida (Venta/Trans)'}</h3>
               </div>

               {error && <div className="mb-4 text-[10px] font-black bg-rose-50 text-rose-700 p-4 rounded-2xl border border-rose-100 uppercase tracking-widest">{error}</div>}
               
               <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Producto a Movilizar</label>
                    <select className="w-full border-none p-4 text-sm font-bold rounded-2xl bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                      <option value="">Seleccionar producto...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} (Saldo: {p.stock} {p.unit})</option>)}
                    </select>
                  </div>

                  {type === 'SALIDA' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Centro de Costo / Destino *</label>
                      
                      {destinos.length === 0 ? (
                        <div className="p-5 bg-amber-50 border border-amber-100 rounded-3xl flex flex-col items-center text-center space-y-3">
                           <AlertTriangle className="w-8 h-8 text-amber-500" />
                           <div>
                             <p className="text-[10px] font-black text-amber-700 uppercase tracking-tight">No hay destinos configurados</p>
                             <p className="text-[9px] text-amber-600 font-bold leading-tight mt-1">Debes configurar al menos una sucursal o punto de venta para procesar despachos.</p>
                           </div>
                           <button 
                             type="button" 
                             onClick={() => {
                               setIsModalOpen(false);
                               onNavigateToDestinos?.();
                             }}
                             className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-[9px] font-black uppercase rounded-xl hover:bg-amber-700 transition-colors"
                           >
                             <Settings className="w-3 h-3" /> Configurar Destinos <ArrowRight className="w-3 h-3" />
                           </button>
                        </div>
                      ) : (
                        <>
                          <select required className="w-full border-none p-4 text-sm font-bold rounded-2xl bg-indigo-50 text-indigo-700 outline-none focus:ring-2 focus:ring-indigo-500" value={selectedDestinoId} onChange={e => setSelectedDestinoId(e.target.value)}>
                            <option value="">¿A dónde va este producto?</option>
                            {destinos.map(d => (
                              <option key={d.id} value={d.id}>{d.name} ({d.type})</option>
                            ))}
                          </select>
                          <p className="text-[9px] text-slate-400 font-bold ml-1 uppercase tracking-tighter">Campo obligatorio para trazabilidad de inventario</p>
                        </>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cantidad</label>
                      <input type="number" placeholder="0" min="1" required className="w-full p-4 text-sm font-black rounded-2xl bg-slate-50 outline-none" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsable</label>
                      <input type="text" placeholder="Quien despacha" required className="w-full p-4 text-sm font-bold rounded-2xl bg-slate-50 outline-none" value={dispatcher} onChange={e => setDispatcher(e.target.value)} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Referencia / Glosa</label>
                    <input type="text" placeholder="Ej: Factura #123 / Guía #45" required className="w-full p-4 text-sm font-medium rounded-2xl bg-slate-50 outline-none" value={reason} onChange={e => setReason(e.target.value)} />
                  </div>

                  <div className="flex gap-4 pt-6">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] py-4">Cancelar</button>
                    <button 
                      type="submit" 
                      disabled={type === 'SALIDA' && destinos.length === 0}
                      className={`flex-[2] py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-white shadow-xl disabled:opacity-50 disabled:cursor-not-allowed ${type === 'INGRESO' ? 'bg-indigo-600 shadow-indigo-100' : 'bg-rose-600 shadow-rose-200'}`}
                    >
                      Confirmar Movimiento
                    </button>
                  </div>
               </div>
          </form>
        </div>
       )}
    </div>
  );
};
