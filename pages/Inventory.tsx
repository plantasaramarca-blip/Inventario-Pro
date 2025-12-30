
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Product, Role, CategoryMaster, LocationMaster } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { StockBadge } from '../components/StockBadge.tsx';
import { formatCurrency, calculateMargin } from '../utils/currencyUtils.ts';
import { exportToPDF } from '../services/excelService.ts';
import { exportToExcel } from '../services/excelService.ts';
import { ProductQRCode } from '../components/ProductQRCode.tsx';
import { MultiQRCode } from '../components/MultiQRCode.tsx';
import { useNotification } from '../contexts/NotificationContext.tsx';
import { CustomDialog } from '../components/CustomDialog.tsx';
import { 
  Plus, Search, Edit2, ImageIcon, Loader2, X, Save, Camera, FileText, QrCode, Info, Trash2, FileSpreadsheet, RefreshCcw, CheckSquare, Square, Printer, Filter, ChevronLeft, ChevronRight
} from 'lucide-react';

const ITEMS_PER_PAGE = 15;

export const Inventory: React.FC<{ role: Role }> = ({ role }) => {
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<any>({});
  
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const { addNotification } = useNotification();

  const loadData = async () => {
    setLoading(true); setShowRetry(false);
    const timer = setTimeout(() => { setShowRetry(true); }, 6000);
    try {
      const [p, c, l] = await Promise.all([api.getProducts(), api.getCategoriesMaster(), api.getLocationsMaster()]);
      setProducts(p || []); setCategories(c || []); setLocations(l || []); clearTimeout(timer);
    } catch (e) { 
      setShowRetry(true); addNotification('Error de conexión con la base de datos.', 'error');
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);
  
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

  const toggleSelectAll = () => {
    if (selectedIds.length === paginatedProducts.length) setSelectedIds([]);
    else setSelectedIds(paginatedProducts.map(p => p.id));
  };
  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const handleOpenModal = (product?: Product) => {
    if (product) { setEditingProduct(product); setFormData({ ...product }); }
    else {
      setEditingProduct(null);
      setFormData({ code: `SKU-${String(products.length + 1).padStart(4, '0')}`, name: '', brand: '', size: '', model: '', category: '', location: '', stock: 0, minStock: 30, criticalStock: 10, purchasePrice: 0, salePrice: 0, currency: 'PEN', unit: 'PAR', imageUrl: '' });
    }
    setIsModalOpen(true);
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

  if (loading || showRetry) { /* ... same as before ... */ }

  return (
    <div className="space-y-4 animate-in fade-in pb-24">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div><h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">PRODUCTOS</h1><p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Inventario Maestro</p></div>
        <div className="flex gap-2 w-full sm:w-auto">
          <div className="bg-white border border-slate-200 rounded-xl flex overflow-hidden shadow-sm flex-1 sm:flex-none">
             <button onClick={() => exportToPDF("CATALOGO DE PRODUCTOS", [['SKU', 'PRODUCTO', 'MARCA', 'ALMACEN', 'STOCK', 'COSTO', 'VENTA']], filteredProducts.map(p => [p.code, p.name, p.brand, p.location, p.stock.toString(), formatCurrency(p.purchasePrice), formatCurrency(p.salePrice || 0)]), "Inventario_Filtrado")} className="flex-1 px-4 py-3 text-slate-600 text-[9px] font-black uppercase flex items-center justify-center gap-1.5 hover:bg-slate-50 transition-all border-r border-slate-100"><FileText className="w-3.5 h-3.5" /> PDF</button>
             <button onClick={() => exportToExcel(filteredProducts, "Inventario", "Stock")} className="flex-1 px-4 py-3 text-emerald-600 text-[9px] font-black uppercase flex items-center justify-center gap-1.5 hover:bg-emerald-50 transition-all"><FileSpreadsheet className="w-3.5 h-3.5" /> EXCEL</button>
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

      {selectedIds.length > 0 && ( /* ... same as before ... */ )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white w-full max-w-4xl rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 max-h-[92vh]">
            <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50/50">{/* ... same as before ... */}</div>
            <div className="overflow-y-auto p-8 space-y-8 no-scrollbar">
               {/* ... same layout as before ... */}
               <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl">
                  <div className="text-center space-y-2">
                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Stock Inicial</label>
                    <input type="number" className="w-full p-4 bg-white/10 rounded-2xl text-center font-black text-xl text-white outline-none" value={formData.stock || ''} placeholder="0" onChange={e => setFormData({...formData, stock: Number(e.target.value)})} disabled={!!editingProduct} />
                  </div>
                  <div className="text-center space-y-2">
                    <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Alerta Stock Bajo</label>
                    <input type="number" className="w-full p-4 bg-white/10 rounded-2xl text-center font-black text-xl text-rose-400 outline-none" value={formData.minStock || ''} placeholder="30" onChange={e => setFormData({...formData, minStock: Number(e.target.value)})} />
                  </div>
                  <div className="text-center space-y-2">
                    <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Costo Unitario</label>
                    <input type="number" step="0.01" className="w-full p-4 bg-white/10 rounded-2xl text-center font-black text-xl text-emerald-400 outline-none" value={formData.purchasePrice || ''} placeholder="0.00" onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} />
                  </div>
                  <div className="text-center space-y-2">
                    <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Precio Venta</label>
                    <input type="number" step="0.01" className="w-full p-4 bg-white/10 rounded-2xl text-center font-black text-xl text-emerald-400 outline-none" value={formData.salePrice || ''} placeholder="0.00" onChange={e => setFormData({...formData, salePrice: Number(e.target.value)})} />
                  </div>
               </div>
            </div>
            <div className="px-10 py-6 border-t bg-white flex gap-5 shrink-0">{/* ... same as before ... */}</div>
          </form>
        </div>
      )}

      {selectedQRProduct && <ProductQRCode product={selectedQRProduct} onClose={() => setSelectedQRProduct(null)} />}
      {isMultiQRModalOpen && <MultiQRCode products={products.filter(p => selectedIds.includes(p.id))} onClose={() => setIsMultiQRModalOpen(false)} />}
      <CustomDialog isOpen={!!productToDelete} title="Confirmar Eliminación" message={`¿Eliminar "${productToDelete?.name}"? Esta acción es irreversible.`} type="error" onConfirm={handleConfirmDelete} onCancel={() => setProductToDelete(null)} confirmText="Sí, Eliminar" />
    </div>
  );
};
