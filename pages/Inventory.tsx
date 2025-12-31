
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
  Plus, Search, Edit2, ImageIcon, Loader2, X, Save, Camera, FileText, QrCode, Info, Trash2, FileSpreadsheet, RefreshCcw, CheckSquare, Square, Printer, Filter, ChevronLeft, ChevronRight, ScanLine
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

const ITEMS_PER_PAGE = 15;

interface InventoryProps {
  role: Role;
  onNavigate: (page: string, options: { push?: boolean, state?: any }) => void;
  initialState?: any;
  onInitialStateConsumed: () => void;
}

export const Inventory: React.FC<InventoryProps> = ({ role, onNavigate, initialState, onInitialStateConsumed }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryMaster[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRetry, setShowRetry] = useState(false);
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
    setLoading(true); setShowRetry(false);
    try {
      const [p, c, l] = await Promise.all([api.getProducts(), api.getCategoriesMaster(), api.getLocationsMaster()]);
      setProducts(p || []); setCategories(c || []); setLocations(l || []);
    } catch (e) { 
      setShowRetry(true); addNotification('Error de conexión con la base de datos.', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  
  useEffect(() => {
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

  const handleScanSuccess = (decodedText: string) => {
    try {
      const url = new URL(decodedText);
      const productId = url.searchParams.get('id');
      if (productId && products.some(p => p.id === productId)) {
        setIsScannerOpen(false);
        onNavigate('productDetail', { push: true, state: { productId } });
      } else {
        addNotification('Código QR no válido o producto no encontrado.', 'error');
      }
    } catch (e) {
      addNotification('Código QR mal formado.', 'error');
    }
  };
  
  const handleExportPDF = () => {
    if (filteredProducts.length === 0) {
      addNotification('No hay productos para exportar.', 'error');
      return;
    }
    const headers = [['SKU', 'Producto', 'Marca', 'Categoría', 'Almacén', 'Stock', 'Costo', 'Venta']];
    const body = filteredProducts.map(p => [
      p.code, p.name, p.brand || '-', p.category, p.location, p.stock,
      formatCurrency(p.purchasePrice), formatCurrency(p.salePrice || 0)
    ]);
    exportToPDF('Reporte de Inventario', headers, body, 'Inventario_KardexPro');
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedProducts.length) setSelectedIds([]);
    else setSelectedIds(paginatedProducts.map(p => p.id));
  };
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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageInfo({ size: '...', status: 'Procesando' });
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600;
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          const kbSize = Math.round((dataUrl.length * 3/4) / 1024);
          setFormData({ ...formData, imageUrl: dataUrl });
          setImageInfo({ size: `${kbSize} KB`, status: 'Optimizado' });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { 
      await api.saveProduct(formData); setIsModalOpen(false); loadData(); 
      addNotification(`"${formData.name}" guardado con éxito.`, 'success');
    } catch (err) { addNotification("Error al guardar producto.", 'error');
    } finally { setSaving(false); }
  };

  const handleConfirmDelete = async () => {
    if (!productToDelete) return;
    try {
      await api.deleteProduct(productToDelete.id); loadData();
      addNotification(`Producto "${productToDelete.name}" eliminado.`, 'success');
    } catch (err) { addNotification('Error al eliminar el producto.', 'error');
    } finally { setProductToDelete(null); }
  };

  if (loading || showRetry) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-6">
        {loading ? (
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 text-indigo-600 mx-auto" />
            <p className="mt-4 text-[10px] font-black uppercase text-slate-400 tracking-widest animate-pulse">Consultando Base de Datos...</p>
          </div>
        ) : (
          <div className="text-center animate-in zoom-in-95 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl">
             <RefreshCcw className="h-12 w-12 text-rose-500 mx-auto mb-4" />
             <h3 className="text-sm font-black text-slate-800 uppercase mb-2">Conexión interrumpida</h3>
             <p className="text-[10px] font-bold text-slate-400 uppercase mb-6">El servidor está tardando demasiado en responder</p>
             <button onClick={() => window.location.reload()} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">Forzar Recarga Completa</button>
          </div>
        )}
      </div>
    );
  }

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

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-xs min-w-[1200px]">
            <thead className="bg-slate-50/50 text-[8px] font-black uppercase text-slate-400 tracking-widest border-b">
              <tr>
                <th className="px-6 py-4 text-left w-10"><button onClick={toggleSelectAll} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">{selectedIds.length === paginatedProducts.length && paginatedProducts.length > 0 ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}</button></th>
                <th className="px-6 py-4 text-left">Producto</th><th className="px-4 py-4 text-left">Especificaciones</th><th className="px-4 py-4 text-center">Estado</th><th className="px-4 py-4 text-center">Stock</th><th className="px-4 py-4 text-center">Costo</th><th className="px-4 py-4 text-center">Venta</th><th className="px-4 py-4 text-center">Margen</th><th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedProducts.map(p => {
                const margin = calculateMargin(p.purchasePrice, p.salePrice || 0);
                return (
                <tr key={p.id} className={`transition-colors group ${selectedIds.includes(p.id) ? 'bg-indigo-50/30' : 'hover:bg-slate-50/40'}`}>
                  <td className="px-6 py-3"><button onClick={() => toggleSelect(p.id)} className="p-1 hover:bg-slate-200 rounded-lg transition-colors">{selectedIds.includes(p.id) ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-300" />}</button></td>
                  <td className="px-6 py-3"><div className="flex items-center gap-3"><div className="w-10 h-10 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shrink-0">{p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-slate-300 m-auto mt-3" />}</div><div><p className="font-black text-slate-800 text-[11px] uppercase truncate max-w-[150px]">{p.name}</p><p className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">{p.code}</p></div></div></td>
                  <td className="px-4 py-3"><p className="text-[10px] font-bold text-slate-700 uppercase">{p.brand || 'S/M'}</p><p className="text-[8px] text-slate-400 uppercase font-black">{p.model || '-'} | Talla: {p.size || '-'}</p></td>
                  <td className="px-4 py-3 text-center"><StockBadge stock={p.stock} minStock={p.minStock} /></td>
                  <td className="px-4 py-3 text-center"><span className="font-black text-slate-800 text-sm">{p.stock}</span><span className="text-[8px] text-slate-400 uppercase font-black ml-1">{p.unit}</span></td>
                  <td className="px-4 py-3 text-center font-black text-indigo-600 text-[11px]">{formatCurrency(p.purchasePrice)}</td>
                  <td className="px-4 py-3 text-center font-black text-emerald-600 text-[11px]">{formatCurrency(p.salePrice || 0)}</td>
                  <td className={`px-4 py-3 text-center font-black text-[11px] ${margin.percent >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{margin.percent.toFixed(1)}%</td>
                  <td className="px-6 py-3 text-right"><div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => setSelectedQRProduct(p)} className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all"><QrCode className="w-4 h-4" /></button>{role !== 'VIEWER' && <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>}{role === 'ADMIN' && <button onClick={() => setProductToDelete(p)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>}</div></td>
                </tr>
              )})}
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

      {selectedIds.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[80] animate-in slide-in-from-bottom-10">
          <button 
            onClick={() => setIsMultiQRModalOpen(true)}
            className="bg-slate-900 text-white px-8 py-4 rounded-[2rem] text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl hover:bg-indigo-600 transition-all active:scale-95"
          >
            <Printer className="w-4 h-4" /> Imprimir Seleccionados ({selectedIds.length})
          </button>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white w-full max-w-4xl rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 max-h-[92vh]">
            <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50/50">
               <div>
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h3>
                 <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Control de Inventario Especializado</p>
               </div>
               <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all"><X className="w-6 h-6 text-slate-400" /></button>
            </div>

            <div className="overflow-y-auto p-8 space-y-8 no-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                  <div className="md:col-span-4 space-y-4">
                    <div className="aspect-square bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group shadow-inner transition-all hover:border-indigo-300">
                      {formData.imageUrl ? (
                        <img src={formData.imageUrl} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="text-slate-200 w-16 h-16 mx-auto mb-2" />
                          <p className="text-[8px] font-black text-slate-300 uppercase">Sin Imagen</p>
                        </div>
                      )}
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-indigo-600/80 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[9px] font-black uppercase transition-all backdrop-blur-sm">
                        <Camera className="w-8 h-8 mb-2" /> Tomar Foto / Subir
                      </button>
                      <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    </div>
                    {imageInfo && (
                      <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100 flex items-center gap-3">
                        <Info className="w-4 h-4 text-indigo-500" />
                        <div>
                          <p className="text-[8px] font-black text-indigo-500 uppercase">Peso: {imageInfo.size}</p>
                          <p className="text-[7px] text-indigo-300 font-bold">OPTIMIZADO PARA WEB</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nombre del Producto *</label>
                      <input type="text" required placeholder="EJ: ZAPATILLAS DEPORTIVAS" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs uppercase border-2 border-transparent focus:border-indigo-500 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Código SKU / QR</label><input type="text" placeholder="AUTO-GENERADO" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs uppercase" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Marca</label><input type="text" placeholder="MARCA..." className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs uppercase" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Modelo</label><input type="text" placeholder="MODELO..." className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs uppercase" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} /></div>
                    <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Unidad</label><select className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-xs uppercase outline-none" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}><option value="PAR">PAR</option><option value="UND">UNIDAD</option><option value="CJ">CAJA</option><option value="PQ">PAQUETE</option></select></div>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Almacén</label><select required className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-xs uppercase" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}><option value="" disabled>Seleccione...</option>{locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select></div>
                  <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Categoría</label><select required className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-xs uppercase" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}><option value="" disabled>Seleccione...</option>{categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}</select></div>
                  <div className="space-y-1.5"><label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Talla / Medida</label><input type="text" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs uppercase" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} /></div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl">
                  <div className="text-center space-y-2"><label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Stock Inicial</label><input type="number" className="w-full p-4 bg-white/10 rounded-2xl text-center font-black text-xl text-white outline-none" value={formData.stock || ''} placeholder="0" onChange={e => setFormData({...formData, stock: Number(e.target.value)})} disabled={!!editingProduct} /></div>
                  <div className="text-center space-y-2"><label className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Alerta Stock Bajo</label><input type="number" className="w-full p-4 bg-white/10 rounded-2xl text-center font-black text-xl text-rose-400 outline-none" value={formData.minStock || ''} placeholder="30" onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} /></div>
                  <div className="text-center space-y-2"><label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Costo Unitario</label><input type="number" step="0.01" className="w-full p-4 bg-white/10 rounded-2xl text-center font-black text-xl text-emerald-400 outline-none" value={formData.purchasePrice || ''} placeholder="0.00" onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} /></div>
                  <div className="text-center space-y-2"><label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Precio Venta</label><input type="number" step="0.01" className="w-full p-4 bg-white/10 rounded-2xl text-center font-black text-xl text-emerald-400 outline-none" value={formData.salePrice || ''} placeholder="0.00" onChange={e => setFormData({...formData, salePrice: Number(e.target.value)})} /></div>
               </div>
            </div>

            <div className="px-10 py-6 border-t bg-white flex gap-5 shrink-0">
               <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cancelar</button>
               <button type="submit" disabled={saving} className="flex-[3] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 disabled:opacity-50">{saving ? <Loader2 className="animate-spin w-5 h-5" /> : <Save className="w-5 h-5" />} Confirmar Cambios</button>
            </div>
          </form>
        </div>
      )}

      {selectedQRProduct && <ProductQRCode product={selectedQRProduct} onClose={() => setSelectedQRProduct(null)} />}
      {isMultiQRModalOpen && <MultiQRCode products={products.filter(p => selectedIds.includes(p.id))} onClose={() => setIsMultiQRModalOpen(false)} />}
      <CustomDialog isOpen={!!productToDelete} title="Confirmar Eliminación" message={`¿Eliminar "${productToDelete?.name}"? Esta acción es irreversible.`} type="error" onConfirm={handleConfirmDelete} onCancel={() => setProductToDelete(null)} confirmText="Sí, Eliminar" />
    </div>
  );
};
