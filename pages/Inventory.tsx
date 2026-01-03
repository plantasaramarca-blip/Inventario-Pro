
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Role, CategoryMaster, LocationMaster } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { StockBadge } from '../components/StockBadge.tsx';
import { formatCurrency, calculateMargin } from '../utils/currencyUtils.ts';
import { exportToPDF, exportToExcel } from '../services/excelService.ts';
import { ProductQRCode } from '../components/ProductQRCode.tsx';
import { MultiQRCode } from '../components/MultiQRCode.tsx';
import { QRScanner } from '../components/QRScanner.tsx';
import { useNotification } from '../contexts/NotificationContext.tsx';
import { CustomDialog } from '../components/CustomDialog.tsx';
import { 
  Plus, Search, Edit2, ImageIcon, Loader2, X, Save, Camera, FileText, QrCode, Info, Trash2, FileSpreadsheet, CheckSquare, Square, Printer, ChevronLeft, ChevronRight, ScanLine
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

const ITEMS_PER_PAGE = 15;

interface InventoryProps {
  role: Role;
  onNavigate: (page: string, options: { push?: boolean, state?: any }) => void;
  initialState?: any;
  onInitialStateConsumed: () => void;
  categories: CategoryMaster[];
  locations: LocationMaster[];
}

export const Inventory: React.FC<InventoryProps> = ({ role, onNavigate, initialState, onInitialStateConsumed, categories, locations }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ category: 'ALL', location: 'ALL' });
  const [currentPage, setCurrentPage] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMultiQRModalOpen, setIsMultiQRModalOpen] = useState(false);
  const [selectedQRProduct, setSelectedQRProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageInfo, setImageInfo] = useState<{ size: string; status: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<any>({});
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const { addNotification } = useNotification();
  
  const loadData = async () => {
    setLoading(true);
    try {
      const prods = await api.getProducts();
      setProducts(prods || []);
    } catch (e) {
      addNotification('Error al cargar productos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (initialState?.openNewProductModal) {
      handleOpenModal();
      onInitialStateConsumed();
    }
  }, [initialState]);

  const filteredProducts = useMemo(() => {
    setCurrentPage(0);
    return products.filter(p => 
      (p.name.toLowerCase().includes(search.toLowerCase()) || 
       p.code.toLowerCase().includes(search.toLowerCase()) || 
       (p.brand && p.brand.toLowerCase().includes(search.toLowerCase()))) &&
      (filters.category === 'ALL' || p.category === filters.category) &&
      (filters.location === 'ALL' || p.location === filters.location)
    );
  }, [products, search, filters]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE);

  const handleScanSuccess = (decodedText: string) => { /* ... */ };
  const handleExportPDF = () => { /* ... */ };
  const toggleSelectAll = () => { /* ... */ };
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleOpenModal = (product?: Product) => {
    setImageInfo(null);
    if (product) { setEditingProduct(product); setFormData({ ...product }); }
    else {
      setEditingProduct(null);
      setFormData({ id: crypto.randomUUID(), code: `SKU-${String(products.length + 1).padStart(4, '0')}`, name: '', brand: '', size: '', model: '', category: '', location: '', stock: 0, minStock: 30, criticalStock: 10, purchasePrice: 0, salePrice: 0, currency: 'PEN', unit: 'PAR', imageUrl: '' });
    }
    setIsModalOpen(true);
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => { /* ... */ };
  
  const checkExistingCode = () => {
    const codeToCheck = formData.code?.trim().toLowerCase();
    if (!codeToCheck || (editingProduct && editingProduct.code.trim().toLowerCase() === codeToCheck)) return;
    
    const existingProduct = products.find(p => p.code.trim().toLowerCase() === codeToCheck);
    if (existingProduct) {
      setFormData(existingProduct);
      setEditingProduct(existingProduct);
      addNotification('Código existente. Se cargaron los datos para edición.', 'info');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); 
    const codeToCheck = formData.code?.trim().toLowerCase();
    
    // Validar si el código ya existe SOLO al crear un nuevo producto
    if (!editingProduct && products.some(p => p.code.trim().toLowerCase() === codeToCheck)) {
      addNotification(`El código SKU "${formData.code}" ya existe.`, 'error');
      return;
    }
    // Si estamos editando, nos aseguramos que no colisione con OTRO producto
    if (editingProduct && products.some(p => p.code.trim().toLowerCase() === codeToCheck && p.id !== editingProduct.id)) {
      addNotification(`El código SKU "${formData.code}" ya pertenece a otro producto.`, 'error');
      return;
    }
    
    setSaving(true);
    try { 
      await api.saveProduct(formData); setIsModalOpen(false); await loadData();
      addNotification(`"${formData.name}" guardado con éxito.`, 'success');
    } catch (err) { addNotification("Error al guardar producto.", 'error');
    } finally { setSaving(false); }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await api.deleteProduct(productToDelete.id); await loadData();
      addNotification(`Producto "${productToDelete.name}" eliminado.`, 'success');
    } catch (err) { addNotification('Error al eliminar el producto.', 'error');
    } finally { setProductToDelete(null); }
  };
  
  if (loading) return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-500" /></div>;

  return (
    <div className="space-y-4 animate-in fade-in pb-24">
      {isScannerOpen && <QRScanner onScanSuccess={handleScanSuccess} onClose={() => setIsScannerOpen(false)} />}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div><h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">PRODUCTOS</h1><p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Inventario Maestro</p></div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="bg-white border border-slate-200 rounded-2xl flex overflow-hidden shadow-sm flex-1 sm:flex-none">
             <button onClick={() => setIsScannerOpen(true)} className="px-4 py-3 text-slate-600 text-[9px] font-black uppercase flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-all border-r border-slate-100"><ScanLine className="w-3.5 h-3.5" /> SCAN</button>
             <button onClick={handleExportPDF} className="px-4 py-3 text-rose-600 text-[9px] font-black uppercase flex items-center justify-center gap-1.5 hover:bg-rose-50 transition-all border-r border-slate-100"><FileText className="w-3.5 h-3.5" /> PDF</button>
             <button onClick={() => exportToExcel(filteredProducts, "Inventario", "Stock")} className="px-4 py-3 text-emerald-600 text-[9px] font-black uppercase flex items-center justify-center gap-1.5 hover:bg-emerald-50 transition-all"><FileSpreadsheet className="w-3.5 h-3.5" /> EXCEL</button>
          </div>
          {role !== 'VIEWER' && <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"><Plus className="w-4 h-4" /> NUEVO</button>}
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="relative group md:col-span-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
          <input type="text" className="w-full pl-12 pr-12 py-4 bg-white border border-slate-100 rounded-2xl text-xs outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all font-bold" placeholder="Buscar por nombre, SKU o marca..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"><X className="w-3 h-3 text-slate-400" /></button>}
        </div>
        <select onChange={(e) => setFilters(f => ({ ...f, location: e.target.value }))} className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-xs outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 font-bold uppercase">
          <option value="ALL">TODOS LOS ALMACENES</option>{locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
        </select>
        <select onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))} className="w-full p-4 bg-white border border-slate-100 rounded-2xl text-xs outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 font-bold uppercase">
          <option value="ALL">TODAS LAS CATEGORÍAS</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>
      
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-[2.5rem] p-8 w-full max-w-4xl shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="text-slate-400 w-5 h-5" /></button>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
                <div className="md:col-span-1 space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">SKU / Código</label>
                   <input onBlur={checkExistingCode} type="text" required value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full p-3 bg-slate-100 rounded-xl outline-none font-bold text-sm uppercase" />
                </div>
                 <div className="md:col-span-2 space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre del Producto</label>
                   <input type="text" required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 bg-slate-100 rounded-xl outline-none font-bold text-sm uppercase" />
                </div>
                {/* ... (resto del formulario sin cambios) ... */}
                <div className="md:col-span-3 flex justify-end gap-3 pt-4 border-t mt-2">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-[10px] font-black uppercase text-slate-400">Cancelar</button>
                   <button type="submit" disabled={saving} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl flex items-center gap-2">
                     {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />} {editingProduct ? 'Actualizar' : 'Guardar'}
                   </button>
                </div>
             </div>
          </form>
        </div>
      )}

      {/* ... (resto del JSX es idéntico) ... */}
    </div>
  );
};
