
import React, { useState, useEffect, useMemo } from 'react';
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
  products: Product[] | null;
  setProducts: (data: Product[]) => void;
  movements: Movement[] | null;
  setMovements: (data: Movement[]) => void;
  destinos: Destination[] | null;
  setDestinos: (data: Destination[]) => void;
  locations: LocationMaster[] | null;
  setLocations: (data: LocationMaster[]) => void;
  onCacheClear: (keys: Array<'products' | 'movements' | 'destinos' | 'locations'>) => void;
}

export const Kardex: React.FC<KardexProps> = ({ role, userEmail, initialState, onInitialStateConsumed, products, setProducts, movements, setMovements, destinos, setDestinos, locations, setLocations, onCacheClear }) => {
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<TransactionType>('SALIDA');
  const [productSearch, setProductSearch] = useState('');
  const [debouncedProductSearch, setDebouncedProductSearch] = useState('');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [selectedDestinoId, setSelectedDestinoId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [carriedBy, setCarriedBy] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [reason, setReason] = useState('');
  const { addNotification } = useNotification();
  const [dispatchNoteData, setDispatchNoteData] = useState<any>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  useEffect(() => {
    const loadPageData = async () => {
      if (products === null || movements === null || destinos === null || locations === null) {
        setLoading(true);
        try {
          const [pData, mData, dData, lData] = await Promise.all([
            products === null ? api.getProducts() : Promise.resolve(products),
            movements === null ? api.getMovements() : Promise.resolve(movements),
            destinos === null ? api.getDestinos() : Promise.resolve(destinos),
            locations === null ? api.getLocationsMaster() : Promise.resolve(locations),
          ]);
          if (products === null) setProducts(pData || []);
          if (movements === null) setMovements(mData || []);
          if (destinos === null) setDestinos(dData || []);
          if (locations === null) setLocations(lData || []);
        } catch (e) {
          addNotification('Error al cargar datos del kardex.', 'error');
        } finally {
          setLoading(false);
        }
      }
    };
    loadPageData();
  }, [products, movements, destinos, locations]);

  useEffect(() => {
    if (initialState?.prefill) {
      const { type: prefillType, product } = initialState.prefill;
      handleOpenModal(prefillType);
      if (product) setCartItems([{ ...product, productId: product.id, quantity: 1 }]);
      onInitialStateConsumed();
    }
  }, [initialState]);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedProductSearch(productSearch);
    }, 300);
    return () => clearTimeout(handler);
  }, [productSearch]);

  const totalPages = Math.ceil((movements || []).length / ITEMS_PER_PAGE);
  const paginatedMovements = (movements || []).slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const handleOpenModal = (trxType: TransactionType) => { /* ... */ };
  const handleScanSuccessForCart = (decodedText: string) => { /* ... */ };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (cartItems.length === 0) return;
    setSaving(true);
    try {
      const destinoObj = type === 'SALIDA' ? (destinos || []).find(d => d.id === selectedDestinoId) : null;
      const locationObj = type === 'INGRESO' ? (locations || []).find(l => l.name === selectedLocationId) : null;
      const batchPayload = cartItems.map(item => ({ productId: item.productId, name: item.name, type, quantity: item.quantity, dispatcher: userEmail, reason: type === 'SALIDA' ? `${reason} (Transp: ${carriedBy})` : `${reason} (Prov: ${supplierName})`, destinationName: type === 'SALIDA' ? destinoObj?.name : locationObj?.name }));
      await api.registerBatchMovements(batchPayload); 
      
      if (type === 'SALIDA') { setDispatchNoteData({ items: cartItems, destination: destinoObj, transportista: carriedBy, observaciones: reason, responsable: userEmail }); }

      setIsModalOpen(false); 
      onCacheClear(['products', 'movements']);
      addNotification('Movimiento registrado con éxito.', 'success');
    } catch (err: any) { addNotification(err.message, 'error'); 
    } finally { setSaving(false); }
  };

  const filteredSearch = useMemo(() => debouncedProductSearch && products ? products.filter(p => p.name.toLowerCase().includes(debouncedProductSearch.toLowerCase()) || p.code.toLowerCase().includes(debouncedProductSearch.toLowerCase())).slice(0, 5) : [], [products, debouncedProductSearch]);

  if (loading || !products || !movements || !destinos || !locations) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-500" /></div>;
  }
  
  return (
    <div className="space-y-4 animate-in fade-in pb-10">
     {/* ... (rest of JSX is identical) ... */}
    </div>
  );
};
