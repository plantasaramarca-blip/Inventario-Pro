import React, { useState, useEffect, useMemo } from 'https://esm.sh/react@19.0.0';
import { Movement, Product, TransactionType, Contact } from '../types';
import * as api from '../services/supabaseService';
import { exportToExcel, formatTimestamp } from '../services/excelService';
import { 
  ArrowDownCircle, ArrowUpCircle, Filter, User, ImageIcon, 
  FileDown, History, Calendar, FileSpreadsheet, Loader2, X 
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.0.0';

export const Kardex: React.FC = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  const [filterProduct, setFilterProduct] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | TransactionType>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [type, setType] = useState<TransactionType>('SALIDA');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [dispatcher, setDispatcher] = useState('');
  const [reason, setReason] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, p, c] = await Promise.all([api.getMovements(), api.getProducts(), api.getContacts()]);
      setMovements(m);
      setProducts(p);
      setContacts(c);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const matchProduct = m.productName.toLowerCase().includes(filterProduct.toLowerCase());
      const matchType = filterType === 'ALL' || m.type === filterType;
      
      let matchDate = true;
      if (dateFrom) {
        const dFrom = new Date(dateFrom);
        dFrom.setHours(0,0,0,0);
        matchDate = matchDate && new Date(m.date) >= dFrom;
      }
      if (dateTo) {
        const dTo = new Date(dateTo);
        dTo.setHours(23,59,59,999);
        matchDate = matchDate && new Date(m.date) <= dTo;
      }

      return matchProduct && matchType && matchDate;
    });
  }, [movements, filterProduct, filterType, dateFrom, dateTo]);

  const handleExcelExport = async () => {
    if (filteredMovements.length === 0) {
      alert("No hay movimientos para exportar.");
      return;
    }

    setExporting(true);
    try {
      const dataToExport = filteredMovements.map(m => {
        const prod = products.find(p => p.id === m.productId);
        return {
          'Fecha/Hora': new Date(m.date).toLocaleString(),
          'Tipo': m.type,
          'Producto': m.productName,
          'Código SKU': prod?.code || 'N/A',
          'Cantidad': m.quantity,
          'Saldo Final': m.balanceAfter,
          'Responsable/Despacho': m.dispatcher,
          'Motivo/Referencia': m.reason,
          'Contacto Vinculado': m.contactName || 'Ninguno'
        };
      });

      const fileName = `Kardex_${formatTimestamp(new Date())}.xlsx`;
      exportToExcel(dataToExport, fileName, 'Movimientos');
    } catch (e: any) {
      alert(`Error al exportar: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const handleOpenModal = (trxType: TransactionType) => {
    setType(trxType);
    setSelectedProductId('');
    setQuantity(1);
    setDispatcher('');
    setReason('');
    setSelectedContactId('');
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return setError("Selecciona un producto");
    
    try {
      const contact = contacts.find(c => c.id === selectedContactId);
      await api.registerMovement({
        productId: selectedProductId,
        type,
        quantity,
        dispatcher,
        reason,
        contactId: selectedContactId || null,
        contactName: contact ? contact.name : null
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
          <h1 className="text-2xl font-bold text-gray-900">Kardex de Movimientos</h1>
          <p className="text-xs text-gray-500 font-medium">Historial completo de entradas y salidas.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExcelExport} disabled={exporting} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center">
            {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
            Exportar
          </button>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
            <button onClick={() => handleOpenModal('INGRESO')} className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">+ Ingreso</button>
            <button onClick={() => handleOpenModal('SALIDA')} className="bg-rose-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest">- Salida</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
         <ul className="divide-y divide-slate-50">
            {loading ? (
              <li className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                <p className="text-sm font-bold text-slate-400">Consultando movimientos...</p>
              </li>
            ) : filteredMovements.map((m) => {
                const product = products.find(p => p.id === m.productId);
                return (
                    <li key={m.id} className="p-5 hover:bg-slate-50 transition-colors group">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center border border-slate-200 overflow-hidden shadow-inner flex-shrink-0">
                                   {product?.imageUrl ? <img src={product.imageUrl} className="h-full w-full object-cover" /> : <ImageIcon className="h-5 w-5 text-slate-300" />}
                                </div>
                                <div>
                                    <div className="flex items-center">
                                      <p className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{m.productName}</p>
                                      {m.type === 'INGRESO' ? <ArrowUpCircle className="w-3.5 h-3.5 ml-2 text-emerald-500" /> : <ArrowDownCircle className="w-3.5 h-3.5 ml-2 text-rose-500" />}
                                    </div>
                                    <div className="flex gap-4 mt-1">
                                      <p className="text-[11px] text-slate-400 flex items-center font-medium"><Calendar className="w-3 h-3 mr-1" /> {new Date(m.date).toLocaleString()}</p>
                                      <p className="text-[11px] text-indigo-600 flex items-center font-bold uppercase tracking-tight"><User className="w-3 h-3 mr-1" /> {m.dispatcher}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className={`text-xl font-black ${m.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {m.type === 'INGRESO' ? '+' : '-'}{m.quantity}
                                </div>
                                <div className="text-[10px] font-bold text-slate-300 uppercase mt-0.5">
                                  Saldo: <span className="text-slate-500">{m.balanceAfter}</span>
                                </div>
                            </div>
                        </div>
                    </li>
                );
            })}
            {filteredMovements.length === 0 && !loading && (
              <li className="py-20 text-center text-slate-300 italic text-sm">No hay movimientos para mostrar.</li>
            )}
         </ul>
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl">
               <h3 className="text-xl font-bold text-slate-800 mb-6">{type === 'INGRESO' ? 'Recibir Mercadería' : 'Despachar / Salida'}</h3>
               {error && <div className="mb-4 text-xs bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-100 font-bold">{error}</div>}
               <div className="space-y-4">
                  <select className="w-full border border-slate-100 p-3 text-sm rounded-xl bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                    <option value="">Seleccionar producto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock})</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Cantidad" min="1" required className="w-full border border-slate-100 p-3 text-sm rounded-xl bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                    <input type="text" placeholder="Responsable" required className="w-full border border-slate-100 p-3 text-sm rounded-xl bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500" value={dispatcher} onChange={e => setDispatcher(e.target.value)} />
                  </div>
                  <input type="text" placeholder="Motivo o Referencia" required className="w-full border border-slate-100 p-3 text-sm rounded-xl bg-slate-50 outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500" value={reason} onChange={e => setReason(e.target.value)} />
                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 text-xs font-bold px-4 py-2">Cancelar</button>
                    <button onClick={handleSubmit} className={`px-8 py-3 text-white rounded-xl shadow-lg font-bold ${type === 'INGRESO' ? 'bg-emerald-600' : 'bg-rose-600'}`}>
                      Confirmar {type}
                    </button>
                  </div>
               </div>
          </div>
        </div>
       )}
    </div>
  );
};