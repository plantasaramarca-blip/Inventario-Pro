
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Movement, Product, TransactionType, Destination, Role, LocationMaster } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { useNotification } from '../contexts/NotificationContext.tsx';
import { DispatchNote } from '../components/DispatchNote.tsx';
import { QRScanner } from '../components/QRScanner.tsx';
import { 
  ArrowDownCircle, ArrowUpCircle, Loader2, X, Search, Save, UserCheck, ArrowUp, ArrowDown, Trash, ChevronLeft, ChevronRight, ScanLine
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

const ITEMS_PER_PAGE = 20;

interface KardexProps {
  role: Role;
  userEmail?: string;
  initialState?: any;
  onInitialStateConsumed: () => void;
  destinos: Destination[];
  locations: LocationMaster[];
}

export const Kardex: React.FC<KardexProps> = ({ role, userEmail, initialState, onInitialStateConsumed, destinos, locations }) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
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
  const [dispatchNoteData, setDispatchNoteData] = useState<any>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [movs, prods] = await Promise.all([api.getMovements(), api.getProducts()]);
      setMovements(movs || []);
      setProducts(prods || []);
    } catch (e) {
      addNotification('Error al cargar datos de kardex.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (initialState?.prefill) {
      const { type: prefillType, product } = initialState.prefill;
      handleOpenModal(prefillType);
      if (product) setCartItems([{ ...product, productId: product.id, quantity: 1 }]);
      onInitialStateConsumed();
    }
  }, [initialState]);

  const totalPages = Math.ceil(movements.length / ITEMS_PER_PAGE);
  const paginatedMovements = movements.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const handleOpenModal = (trxType: TransactionType) => { /* ... */ };
  const handleScanSuccessForCart = (decodedText: string) => { /* ... */ };

  const handleAddToCart = (product: Product) => {
    if (cartItems.some(item => item.productId === product.id)) {
        addNotification('Producto ya está en la lista.', 'info');
        return;
    }
    setCartItems(prev => [...prev, { ...product, productId: product.id, quantity: 1 }]);
    setProductSearch('');
    productSearchInputRef.current?.focus();
  };

  const handleProductInputBlur = () => {
    if (!productSearch) return;
    const exactMatch = products.find(p => p.code.trim().toLowerCase() === productSearch.trim().toLowerCase());
    if (exactMatch) {
      if (!cartItems.some(item => item.productId === exactMatch.id)) {
        handleAddToCart(exactMatch);
        addNotification(`"${exactMatch.name}" agregado.`, 'success');
      } else {
        addNotification('Producto ya está en la lista.', 'info');
      }
      setProductSearch('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (cartItems.length === 0) return;
    setSaving(true);
    try {
      const destinoObj = type === 'SALIDA' ? destinos.find(d => d.id === selectedDestinoId) : null;
      const locationObj = type === 'INGRESO' ? locations.find(l => l.name === selectedLocationId) : null;
      const batchPayload = cartItems.map(item => ({ productId: item.productId, name: item.name, type, quantity: item.quantity, dispatcher: userEmail, reason: type === 'SALIDA' ? `${reason} (Transp: ${carriedBy})` : `${reason} (Prov: ${supplierName})`, destinationName: type === 'SALIDA' ? destinoObj?.name : locationObj?.name }));
      await api.registerBatchMovements(batchPayload); 
      
      if (type === 'SALIDA') { setDispatchNoteData({ items: cartItems, destination: destinoObj, transportista: carriedBy, observaciones: reason, responsable: userEmail, }); }

      setIsModalOpen(false); 
      await loadData();
      addNotification('Movimiento registrado con éxito.', 'success');
    } catch (err: any) { addNotification(err.message, 'error'); 
    } finally { setSaving(false); }
  };

  const filteredSearch = useMemo(() => productSearch ? products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()) || p.code.toLowerCase().includes(productSearch.toLowerCase())).slice(0, 5) : [], [products, productSearch]);
  
  if (loading) return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-500" /></div>;

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      {isScannerOpen && <QRScanner onScanSuccess={handleScanSuccessForCart} onClose={() => setIsScannerOpen(false)} />}
      <div className="flex justify-between items-end">
        <div><h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Kardex Logístico</h1><p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Movimientos de Stock</p></div>
        <div className="flex gap-3">
          {role !== 'VIEWER' && (
            <div className="flex gap-2">
              <button onClick={() => handleOpenModal('INGRESO')} className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"><ArrowUpCircle className="w-4 h-4" /> Ingreso</button>
              <button onClick={() => handleOpenModal('SALIDA')} className="bg-rose-600 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-rose-100 hover:bg-rose-700 active:scale-95 transition-all"><ArrowDownCircle className="w-4 h-4" /> Despacho</button>
            </div>
          )}
        </div>
      </div>
      
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
          <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()} className="relative bg-white rounded-3xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 flex flex-col h-[85vh]">
            {/* ... Modal content ... */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none" />
              <input
                ref={productSearchInputRef}
                type="text"
                placeholder="Buscar por SKU o nombre..."
                value={productSearch}
                onChange={e => setProductSearch(e.target.value)}
                onBlur={handleProductInputBlur}
                className="w-full pl-12 pr-4 py-3 bg-slate-100 rounded-xl outline-none font-bold text-sm"
              />
            </div>
            {/* ... Rest of the modal ... */}
          </form>
        </div>
      )}

      {/* ... (resto del JSX es idéntico) ... */}
    </div>
  );
};
