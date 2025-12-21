
import React, { useState, useEffect } from 'react';
import { Movement, Product, TransactionType, Contact } from '../types';
import * as api from '../services/supabaseService';
import { ArrowDownCircle, ArrowUpCircle, Filter, User, ImageIcon, FileDown, History, Calendar } from 'https://esm.sh/lucide-react@^0.561.0';

export const Kardex: React.FC = () => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterProduct, setFilterProduct] = useState('');

  const [type, setType] = useState<TransactionType>('SALIDA');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [dispatcher, setDispatcher] = useState('');
  const [reason, setReason] = useState('');
  const [selectedContactId, setSelectedContactId] = useState('');
  const [error, setError] = useState('');

  const loadData = async () => {
    const [m, p, c] = await Promise.all([api.getMovements(), api.getProducts(), api.getContacts()]);
    setMovements(m);
    setProducts(p);
    setContacts(c);
  };

  useEffect(() => { loadData(); }, []);

  const exportToCSV = () => {
    const headers = ['ID', 'Fecha', 'Producto', 'Tipo', 'Cantidad', 'Despacho', 'Motivo', 'Saldo Final', 'Contacto'];
    const rows = movements.map(m => [
      m.id,
      new Date(m.date).toLocaleString(),
      m.productName,
      m.type,
      m.quantity,
      m.dispatcher,
      m.reason,
      m.balanceAfter,
      m.contactName || 'N/A'
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `kardex_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

  const filteredMovements = movements.filter(m => 
    m.productName.toLowerCase().includes(filterProduct.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Kardex de Movimientos</h1>
          <p className="text-xs text-gray-500 font-medium">Historial completo de entradas y salidas de almacén.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={exportToCSV}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-md shadow-sm hover:bg-gray-50 font-bold text-sm transition-all"
          >
            <FileDown className="mr-2 h-4 w-4 text-indigo-500" /> Exportar Reporte
          </button>
          <div className="flex-1 sm:flex-none flex gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 shadow-sm">
            <button onClick={() => handleOpenModal('INGRESO')} className="flex-1 sm:flex-none bg-emerald-600 text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all">+ Ingreso</button>
            <button onClick={() => handleOpenModal('SALIDA')} className="flex-1 sm:flex-none bg-rose-600 text-white px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all">- Salida</button>
          </div>
        </div>
      </div>

       <div className="flex items-center space-x-2 bg-white px-4 py-2.5 rounded-xl border border-gray-100 max-w-sm shadow-sm group focus-within:border-indigo-500 transition-all">
         <Filter className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500" />
         <input type="text" placeholder="Filtrar por nombre de producto..." className="flex-1 outline-none text-sm bg-transparent" value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} />
       </div>

      <div className="bg-white shadow-sm rounded-2xl border border-gray-100 overflow-hidden">
         <ul className="divide-y divide-gray-50">
            {filteredMovements.map((m) => {
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
                                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                                      <p className="text-[11px] text-slate-400 flex items-center font-medium"><Calendar className="w-3 h-3 mr-1 text-slate-300" /> {new Date(m.date).toLocaleString()}</p>
                                      <p className="text-[11px] text-indigo-600 flex items-center font-bold uppercase tracking-tight"><User className="w-3 h-3 mr-1" /> {m.dispatcher}</p>
                                    </div>
                                    <div className="mt-2 flex gap-2">
                                        {m.contactName && (
                                          <span className="bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full text-[9px] font-bold border border-indigo-100 flex items-center">
                                            Vínculo: {m.contactName}
                                          </span>
                                        )}
                                        <span className="bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                                          {m.reason}
                                        </span>
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
            {filteredMovements.length === 0 && (
              <li className="py-20 text-center text-slate-400">
                <div className="flex flex-col items-center">
                  <History className="w-10 h-10 opacity-10 mb-2" />
                  <p className="text-sm italic">No hay movimientos registrados para mostrar.</p>
                </div>
              </li>
            )}
         </ul>
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full p-6 overflow-hidden">
               <div className="flex items-center mb-6">
                 <div className={`p-2.5 rounded-xl mr-3 ${type === 'INGRESO' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                    {type === 'INGRESO' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                 </div>
                 <h3 className="text-xl font-bold text-slate-800">{type === 'INGRESO' ? 'Recibir Mercadería' : 'Despachar / Salida'}</h3>
               </div>

               {error && <div className="mb-6 text-xs bg-rose-50 text-rose-700 p-3 rounded-lg border border-rose-100 font-bold flex items-center animate-shake"><span className="mr-2">⚠️</span> {error}</div>}
               
               <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seleccionar Producto</label>
                    <select required className="w-full border border-slate-200 p-3 text-sm rounded-xl shadow-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none appearance-none" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                      <option value="">Buscar producto...</option>
                      {products.map(p => <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock} {p.unit})</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Cantidad</label>
                      <input type="number" placeholder="0" min="1" required className="w-full border border-slate-200 p-3 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Vincular a Contacto</label>
                      <select className="w-full border border-slate-200 p-3 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white" value={selectedContactId} onChange={e => setSelectedContactId(e.target.value)}>
                        <option value="">Ninguno</option>
                        {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsable del Despacho</label>
                    <input type="text" placeholder="Ej: Juan Pérez" required className="w-full border border-slate-200 p-3 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={dispatcher} onChange={e => setDispatcher(e.target.value)} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Motivo o Referencia</label>
                    <input type="text" placeholder="Ej: Factura #102 / Mantenimiento preventivo" required className="w-full border border-slate-200 p-3 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" value={reason} onChange={e => setReason(e.target.value)} />
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t border-slate-50">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 text-[11px] font-black uppercase tracking-widest px-4 py-2 hover:bg-slate-100 rounded-lg">Cancelar</button>
                    <button onClick={handleSubmit} className={`px-8 py-3 text-white rounded-xl shadow-xl font-bold transition-all transform hover:scale-105 active:scale-95 ${type === 'INGRESO' ? 'bg-emerald-600 shadow-emerald-100 hover:bg-emerald-700' : 'bg-rose-600 shadow-rose-100 hover:bg-rose-700'}`}>
                      Confirmar {type}
                    </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
       )}
    </div>
  );
};
