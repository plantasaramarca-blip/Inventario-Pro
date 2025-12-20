import React, { useState, useEffect } from 'react';
import { Movement, Product, TransactionType, Contact } from '../types';
import * as api from '../services/supabaseService';
import { ArrowDownCircle, ArrowUpCircle, Filter, User, ImageIcon } from 'lucide-react';

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Kardex (Historial Completo)</h1>
        <div className="flex space-x-2">
            <button onClick={() => handleOpenModal('INGRESO')} className="bg-green-600 text-white px-4 py-2 rounded shadow-sm text-sm font-medium hover:bg-green-700">+ Ingreso</button>
            <button onClick={() => handleOpenModal('SALIDA')} className="bg-red-600 text-white px-4 py-2 rounded shadow-sm text-sm font-medium hover:bg-red-700">- Salida</button>
        </div>
      </div>

       <div className="flex items-center space-x-2 bg-white p-2 rounded-md border border-gray-200 max-w-sm shadow-sm">
         <Filter className="h-4 w-4 text-gray-400 ml-2" />
         <input type="text" placeholder="Filtrar por producto..." className="flex-1 outline-none text-sm p-1" value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} />
       </div>

      <div className="bg-white shadow rounded-lg border border-gray-200">
         <ul className="divide-y divide-gray-200">
            {filteredMovements.map((m) => {
                const product = products.find(p => p.id === m.productId);
                return (
                    <li key={m.id} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 rounded bg-gray-50 flex items-center justify-center border">
                                   {product?.imageUrl ? <img src={product.imageUrl} className="h-full w-full object-cover rounded" /> : <ImageIcon className="h-4 w-4 text-gray-300" />}
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{m.productName}</p>
                                    <p className="text-xs text-gray-500">{new Date(m.date).toLocaleString()} • <span className="text-indigo-600 font-medium">{m.dispatcher}</span></p>
                                    <div className="mt-1 flex gap-2">
                                        {m.contactName && <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[10px] flex items-center"><User className="w-2 h-2 mr-1" /> {m.contactName}</span>}
                                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px]">{m.reason}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className={`text-lg font-black ${m.type === 'INGRESO' ? 'text-green-600' : 'text-red-600'}`}>{m.type === 'INGRESO' ? '+' : '-'}{m.quantity}</span>
                                <span className="text-[10px] text-gray-400 block">Stock final: {m.balanceAfter}</span>
                            </div>
                        </div>
                    </li>
                );
            })}
         </ul>
      </div>

       {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setIsModalOpen(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full p-6">
               <h3 className="text-lg font-bold text-gray-900 mb-4">{type === 'INGRESO' ? 'Recibir Mercadería' : 'Despachar / Salida'}</h3>
               {error && <div className="mb-4 text-xs bg-red-50 text-red-700 p-2 rounded">{error}</div>}
               <div className="space-y-4">
                  <select required className="w-full border p-2 text-sm rounded shadow-sm" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
                    <option value="">Producto...</option>
                    {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.stock} en stock)</option>)}
                  </select>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="number" placeholder="Cantidad" min="1" required className="border p-2 text-sm rounded" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                    <select className="border p-2 text-sm rounded" value={selectedContactId} onChange={e => setSelectedContactId(e.target.value)}>
                      <option value="">Vincular Contacto...</option>
                      {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <input type="text" placeholder="¿Quién despacha/recibe?" required className="w-full border p-2 text-sm rounded" value={dispatcher} onChange={e => setDispatcher(e.target.value)} />
                  <input type="text" placeholder="Motivo / Referencia" required className="w-full border p-2 text-sm rounded" value={reason} onChange={e => setReason(e.target.value)} />
                  <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-500 text-sm">Cancelar</button>
                    <button onClick={handleSubmit} className={`px-4 py-2 text-white rounded shadow ${type === 'INGRESO' ? 'bg-green-600' : 'bg-red-600'}`}>Confirmar {type}</button>
                  </div>
               </div>
            </div>
          </div>
        </div>
       )}
    </div>
  );
};