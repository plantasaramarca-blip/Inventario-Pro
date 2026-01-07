import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Movement, Product, TransactionType, Destination, Role, LocationMaster, Contact } from '../types.ts';
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
  setDestinos: (destinos: Destination[]) => void;
  locations: LocationMaster[];
  setLocations: (locations: LocationMaster[]) => void;
}

export const Kardex: React.FC<KardexProps> = ({ role, userEmail, initialState, onInitialStateConsumed, destinos, setDestinos, locations, setLocations }) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [type, setType] = useState<TransactionType>('SALIDA');
  const [productSearch, setProductSearch] = useState('');
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [selectedDestinoId, setSelectedDestinoId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [carriedBy, setCarriedBy] = useState('');
  const [reason, setReason] = useState('');
  const { addNotification } = useNotification();
  const [dispatchNoteData, setDispatchNoteData] = useState<any>(null);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const productSearchInputRef = useRef<HTMLInputElement>(null);
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [movs, { products: prods }, conts] = await Promise.all([
        api.getMovements(), 
        api.getProducts({ fetchAll: true }), 
        api.getContacts()
      ]);
      setMovements(movs || []);
      setProducts(prods || []);
      setContacts(conts || []);
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
  
  const handleLoadDestinos = async () => { 
    if (!destinos || destinos.length === 0) { 
      try { 
        const data = await api.getDestinos(); 
        setDestinos(data || []); 
      } catch (e) { 
        addNotification('Error al cargar destinos.', 'error'); 
      } 
    } 
  };
  
  const handleLoadLocations = async () => { 
    if (!locations || locations.length === 0) { 
      try { 
        const data = await api.getLocationsMaster(); 
        setLocations(data || []); 
      } catch (e) { 
        addNotification('Error al cargar almacenes.', 'error'); 
      } 
    } 
  };

  const suppliers = useMemo(() => contacts.filter(c => c.type === 'PROVEEDOR'), [contacts]);
  const totalPages = Math.ceil(movements.length / ITEMS_PER_PAGE);
  const paginatedMovements = movements.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  // ✅ FUNCIÓN CORREGIDA: Abrir modal
  const handleOpenModal = (trxType: TransactionType) => {
    setType(trxType);
    setIsModalOpen(true);
    setCartItems([]);
    setSelectedDestinoId('');
    setSelectedLocationId('');
    setSelectedSupplierId('');
    setCarriedBy('');
    setReason('');
    setProductSearch('');
  };

  // ✅ FUNCIÓN CORREGIDA: Escanear QR
  const handleScanSuccessForCart = (decodedText: string) => {
    setIsScannerOpen(false);
    const foundProduct = products.find(p => 
      p.qrData === decodedText || 
      p.code === decodedText
    );
    
    if (foundProduct) {
      handleAddToCart(foundProduct);
      addNotification(`Producto "${foundProduct.name}" agregado`, 'success');
    } else {
      addNotification('Producto no encontrado', 'error');
    }
  };

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

  const handleUpdateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCartItems(prev => prev.map((item, i) => i === index ? {...item, quantity: newQuantity} : item));
  };

  const handleRemoveFromCart = (index: number) => {
    setCartItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (cartItems.length === 0) return;
    setSaving(true);
    try {
      const destinoObj = type === 'SALIDA' ? destinos.find(d => d.id === selectedDestinoId) : null;
      const supplierObj = type === 'INGRESO' ? suppliers.find(s => s.id === selectedSupplierId) : null;
      const locationObj = type === 'INGRESO' ? locations.find(l => l.name === selectedLocationId) : null;
      
      const batchPayload = cartItems.map(item => ({ 
        productId: item.productId, 
        name: item.name, 
        type, 
        quantity: item.quantity, 
        dispatcher: userEmail, 
        reason, 
        destinationName: type === 'SALIDA' ? destinoObj?.nombre : null, 
        locationName: type === 'INGRESO' ? locationObj?.name : null, 
        contactId: type === 'INGRESO' ? supplierObj?.id : null, 
        supplierName: type === 'INGRESO' ? supplierObj?.name : null 
      }));
      
      await api.registerBatchMovements(batchPayload); 
      
      if (type === 'SALIDA') { 
        setDispatchNoteData({ 
          items: cartItems, 
          destination: destinoObj, 
          transportista: carriedBy, 
          observaciones: reason, 
          responsable: userEmail, 
        }); 
      }

      setIsModalOpen(false); 
      await loadData();
      addNotification('Movimiento registrado con éxito.', 'success');
    } catch (err: any) { 
      addNotification(err.message || 'Error al registrar movimiento', 'error'); 
    } finally { 
      setSaving(false); 
    }
  };

  const filteredSearch = useMemo(() => 
    productSearch 
      ? products.filter(p => 
          p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
          p.code.toLowerCase().includes(productSearch.toLowerCase())
        ).slice(0, 5) 
      : [], 
    [products, productSearch]
  );
  
  if (loading) return (
    <div className="h-[70vh] flex items-center justify-center">
      <Loader2 className="animate-spin w-8 h-8 text-indigo-500" />
    </div>
  );

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      {isScannerOpen && (
        <QRScanner 
          onScanSuccess={handleScanSuccessForCart} 
          onClose={() => setIsScannerOpen(false)} 
        />
      )}
      
      {dispatchNoteData && (
        <DispatchNote 
          data={dispatchNoteData} 
          onClose={() => setDispatchNoteData(null)} 
        />
      )}
      
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">
            Kardex Logístico
          </h1>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
            Movimientos de Stock
          </p>
        </div>
        <div className="flex gap-3">
          {role !== 'VIEWER' && (
            <div className="flex gap-2">
              <button 
                onClick={() => handleOpenModal('INGRESO')} 
                className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"
              >
                <ArrowUpCircle className="w-4 h-4" /> Ingreso
              </button>
              <button 
                onClick={() => handleOpenModal('SALIDA')} 
                className="bg-rose-600 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-rose-100 hover:bg-rose-700 active:scale-95 transition-all"
              >
                <ArrowDownCircle className="w-4 h-4" /> Despacho
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* MODAL DE MOVIMIENTOS */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
          <form 
            onSubmit={handleSubmit} 
            onClick={e => e.stopPropagation()} 
            className="relative bg-white rounded-3xl w-full max-w-4xl shadow-2xl animate-in zoom-in-95 flex flex-col h-[85vh]"
          >
            {/* Header */}
            <div className="p-6 border-b flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">
                  {type === 'SALIDA' ? '📦 Despacho de Mercancía' : '📥 Ingreso de Mercancía'}
                </h3>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                  {type === 'SALIDA' ? 'Registrar salida de productos' : 'Registrar ingreso de productos'}
                </p>
                {userEmail && (
                  <p className="text-[8px] text-indigo-600 font-bold uppercase mt-1">
                    👤 Responsable: {userEmail}
                  </p>
                )}
              </div>
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Campos específicos por tipo */}
              <div className="relative">
                {type === 'SALIDA' && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <select 
                      required 
                      value={selectedDestinoId} 
                      onFocus={handleLoadDestinos} 
                      onChange={e => setSelectedDestinoId(e.target.value)} 
                      className="w-full p-3 bg-slate-100 rounded-xl font-bold text-sm uppercase"
                    >
                      <option value="">Centro de Costo (Destino)...</option>
                      {destinos.map(d => (
                        <option key={d.id} value={d.id}>{d.nombre}</option>
                      ))}
                    </select>
                    <input 
                      type="text" 
                      placeholder="Transportista..." 
                      value={carriedBy} 
                      onChange={e => setCarriedBy(e.target.value)} 
                      className="w-full p-3 bg-slate-100 rounded-xl font-bold text-sm" 
                    />
                  </div>
                )}
                
                {type === 'INGRESO' && (
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <select 
                      required 
                      value={selectedLocationId} 
                      onFocus={handleLoadLocations} 
                      onChange={e => setSelectedLocationId(e.target.value)} 
                      className="w-full p-3 bg-slate-100 rounded-xl font-bold text-sm uppercase"
                    >
                      <option value="">Almacén de Ingreso...</option>
                      {locations.map(l => (
                        <option key={l.id} value={l.name}>{l.name}</option>
                      ))}
                    </select>
                    <select 
                      required 
                      value={selectedSupplierId} 
                      onChange={e => setSelectedSupplierId(e.target.value)} 
                      className="w-full p-3 bg-slate-100 rounded-xl font-bold text-sm uppercase"
                    >
                      <option value="">Seleccionar Proveedor...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Búsqueda de productos */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 pointer-events-none z-10" />
                  <input 
                    ref={productSearchInputRef}
                    type="text" 
                    placeholder="Buscar por SKU o nombre..." 
                    value={productSearch} 
                    onChange={e => setProductSearch(e.target.value)} 
                    onBlur={handleProductInputBlur}
                    className="w-full pl-12 pr-16 py-3 bg-slate-100 rounded-xl outline-none font-bold text-sm" 
                  />
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-slate-200 rounded-lg"
                  >
                    <ScanLine className="w-4 h-4 text-slate-500" />
                  </button>
                </div>

                {/* Dropdown de búsqueda */}
                {filteredSearch.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 max-h-60 overflow-y-auto">
                    {filteredSearch.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleAddToCart(p)}
                        className="w-full px-4 py-3 text-left hover:bg-slate-50 border-b last:border-b-0"
                      >
                        <div className="font-bold text-sm">{p.name}</div>
                        <div className="text-xs text-slate-500">SKU: {p.code} | Stock: {p.stock}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Lista de productos en el carrito */}
              <div className="space-y-2">
                {cartItems.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <p className="text-sm font-bold">No hay productos agregados</p>
                    <p className="text-xs">Busca y agrega productos arriba</p>
                  </div>
                ) : (
                  cartItems.map((item, index) => (
                    <div key={index} className="bg-slate-50 p-4 rounded-xl flex items-center gap-4">
                      <div className="flex-1">
                        <h4 className="font-bold text-sm">{item.name}</h4>
                        <p className="text-xs text-slate-500">SKU: {item.code}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(index, item.quantity - 1)}
                          className="w-8 h-8 bg-white rounded-lg flex items-center justify-center hover:bg-slate-100"
                        >
                          <ArrowDown className="w-4 h-4" />
                        </button>
                        <span className="w-12 text-center font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQuantity(index, item.quantity + 1)}
                          className="w-8 h-8 bg-white rounded-lg flex items-center justify-center hover:bg-slate-100"
                        >
                          <ArrowUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveFromCart(index)}
                          className="w-8 h-8 bg-rose-50 text-rose-600 rounded-lg flex items-center justify-center hover:bg-rose-100"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Razón/Observaciones */}
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase mb-2 block">
                  Razón / Observaciones
                </label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full p-3 bg-slate-100 rounded-xl outline-none font-bold text-sm resize-none"
                  rows={3}
                  placeholder="Opcional..."
                />
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex justify-between items-center">
              <div className="text-sm font-bold text-slate-600">
                Total de productos: {cartItems.length}
              </div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)} 
                  className="px-6 py-3 text-xs font-black uppercase text-slate-500 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saving || cartItems.length === 0}
                  className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-lg flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                  Registrar {type === 'SALIDA' ? 'Despacho' : 'Ingreso'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* TABLA DE MOVIMIENTOS */}
      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50/50">
              <tr className="text-[9px] font-black uppercase text-slate-400 tracking-widest">
                <th className="px-6 py-4 text-left">Fecha</th>
                <th className="px-6 py-4 text-left">Producto</th>
                <th className="px-6 py-4 text-left">Tipo</th>
                <th className="px-6 py-4 text-right">Cantidad</th>
                <th className="px-6 py-4 text-left">Responsable</th>
                <th className="px-6 py-4 text-left">Destino</th>
              </tr>
            </thead>
            <tbody>
              {paginatedMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <p className="text-sm font-bold">No hay movimientos registrados</p>
                  </td>
                </tr>
              ) : (
                paginatedMovements.map(m => (
                  <tr key={m.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-4 text-xs font-bold">
                      {new Date(m.date).toLocaleDateString('es-PE')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-sm">{m.productName}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase ${
                        m.type === 'INGRESO' 
                          ? 'bg-indigo-50 text-indigo-600' 
                          : 'bg-rose-50 text-rose-600'
                      }`}>
                        {m.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-sm">
                      {m.quantity}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {m.dispatcher}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {m.destinationName || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="p-4 border-t flex justify-between items-center">
            <div className="text-xs text-slate-500 font-bold">
              Página {currentPage + 1} de {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                disabled={currentPage === 0}
                className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                disabled={currentPage === totalPages - 1}
                className="p-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
