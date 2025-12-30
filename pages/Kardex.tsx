
import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Product, TransactionType, Destination, Role, LocationMaster } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { useNotification } from '../contexts/NotificationContext.tsx';
import { 
  ArrowDownCircle, ArrowUpCircle, Loader2, X, Search, Save, UserCheck, ArrowUp, ArrowDown, Trash, RefreshCcw, ChevronLeft, ChevronRight
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

const ITEMS_PER_PAGE = 20;

export const Kardex: React.FC<{ role: Role; userEmail?: string }> = ({ role, userEmail }) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [destinos, setDestinos] = useState<Destination[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showRetry, setShowRetry] = useState(false);
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

  const loadData = async () => {
    setLoading(true); setShowRetry(false);
    const timer = setTimeout(() => { setShowRetry(true); }, 5000);
    try {
      const [m, p, d, l] = await Promise.all([api.getMovements(), api.getProducts(), api.getDestinos(), api.getLocationsMaster()]);
      setMovements(m || []); setProducts(p || []); setDestinos((d || []).filter(dest => dest.active)); setLocations(l || []);
      clearTimeout(timer);
    } catch (e) {
      setShowRetry(true); addNotification("Error al cargar datos del Kardex.", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const totalPages = Math.ceil(movements.length / ITEMS_PER_PAGE);
  const paginatedMovements = movements.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const handleOpenModal = (trxType: TransactionType) => {
    if (role === 'VIEWER') return;
    setType(trxType); setCartItems([]); setSelectedDestinoId(''); setSelectedLocationId(''); setCarriedBy(''); setSupplierName(''); setReason(''); setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (cartItems.length === 0) return;
    setSaving(true);
    try {
      const destinoObj = type === 'SALIDA' ? destinos.find(d => d.id === selectedDestinoId) : null;
      const locationObj = type === 'INGRESO' ? locations.find(l => l.name === selectedLocationId) : null;
      const batchPayload = cartItems.map(item => ({ productId: item.productId, type, quantity: item.quantity, dispatcher: userEmail, reason: type === 'SALIDA' ? `${reason} (Transp: ${carriedBy})` : `${reason} (Prov: ${supplierName})`, destinationName: type === 'SALIDA' ? destinoObj?.name : locationObj?.name }));
      await api.registerBatchMovements(batchPayload); 
      setIsModalOpen(false); loadData();
      addNotification('Movimiento registrado con éxito.', 'success');
    } catch (err: any) { addNotification(err.message, 'error'); 
    } finally { setSaving(false); }
  };

  const filteredSearch = useMemo(() => productSearch ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.code.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 5) : [], [products, productSearch]);

  if (loading || showRetry) { /* ... same as before ... */ }

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      <div className="flex justify-between items-end">
        <div><h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Kardex Logístico</h1><p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Movimientos de Stock</p></div>
        {role !== 'VIEWER' && <div className="flex gap-2"><button onClick={() => handleOpenModal('INGRESO')} className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-indigo-700"><ArrowUpCircle className="w-4 h-4" /> Ingreso</button><button onClick={() => handleOpenModal('SALIDA')} className="bg-rose-600 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-rose-700"><ArrowDownCircle className="w-4 h-4" /> Despacho</button></div>}
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

      {isModalOpen && ( /* ... same as before ... */ )}
    </div>
  );
};
