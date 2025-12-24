
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Role } from '../types';
import * as api from '../services/supabaseService';
import { exportToExcel, formatTimestamp, getStockStatusLabel } from '../services/excelService';
import { StockBadge } from '../components/StockBadge';
import { 
  Plus, Search, Edit2, Trash2, MapPin, ImageIcon, 
  Loader2, CheckCircle2, Zap, FileDown, X, Filter, 
  PackageOpen, ChevronDown, Download, FileSpreadsheet, 
  DollarSign, AlertCircle, TrendingUp
} from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface InventoryProps {
  role: Role;
}

type StockStatusFilter = 'ALL' | 'CRITICAL' | 'LOW' | 'GOOD';

export const Inventory: React.FC<InventoryProps> = ({ role }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedStockStatus, setSelectedStockStatus] = useState<StockStatusFilter>('ALL');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationStats, setOptimizationStats] = useState<{ original: string, compressed: string } | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    code: '', name: '', category: '', location: '', stock: 0, minStock: 30, criticalStock: 10, price: 0, unit: 'und', imageUrl: ''
  });
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const loadData = async () => {
    setLoading(true);
    const [prods, cats] = await Promise.all([api.getProducts(), api.getCategories()]);
    setProducts(prods);
    setCategories(cats);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const uniqueLocations = useMemo(() => {
    const locations = products
      .map(p => p.location)
      .filter((loc): loc is string => !!loc);
    return Array.from(new Set(locations)).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      const searchMatch = !debouncedSearch || 
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (p.location && p.location.toLowerCase().includes(debouncedSearch.toLowerCase()));

      const categoryMatch = selectedCategory === 'ALL' || p.category === selectedCategory;
      const locationMatch = selectedLocation === 'ALL' || p.location === selectedLocation;

      let stockMatch = true;
      if (selectedStockStatus === 'CRITICAL') stockMatch = p.stock <= p.criticalStock;
      else if (selectedStockStatus === 'LOW') stockMatch = p.stock > p.criticalStock && p.stock <= p.minStock;
      else if (selectedStockStatus === 'GOOD') stockMatch = p.stock > p.minStock;

      return searchMatch && categoryMatch && locationMatch && stockMatch;
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, debouncedSearch, selectedCategory, selectedLocation, selectedStockStatus]);

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('ALL');
    setSelectedLocation('ALL');
    setSelectedStockStatus('ALL');
  };

  const handleExcelExport = async () => {
    if (filteredProducts.length === 0) {
      alert("No hay datos para exportar con los filtros actuales.");
      return;
    }

    setExporting(true);
    try {
      const dataToExport = filteredProducts.map(p => ({
        'Código': p.code,
        'Producto': p.name,
        'Categoría': p.category,
        'Stock Actual': p.stock,
        'Unidad': p.unit,
        'Precio Unit.': p.price,
        'Valor Total': p.stock * p.price,
        'Stock Mínimo': p.minStock,
        'Stock Crítico': p.criticalStock,
        'Estado': getStockStatusLabel(p.stock, p.minStock),
        'Ubicación': p.location || 'N/A',
        'Última Actualización': new Date(p.updatedAt).toLocaleString()
      }));

      const fileName = `Inventario_${formatTimestamp(new Date())}.xlsx`;
      exportToExcel(dataToExport, fileName, 'Inventario');
    } catch (e: any) {
      alert(`Error al exportar: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Codigo', 'Producto', 'Categoria', 'Ubicacion', 'Stock', 'Precio', 'Unidad', 'Stock Minimo', 'Stock Critico', 'Ultima Actualizacion'];
    const rows = filteredProducts.map(p => [
      p.code,
      p.name,
      p.category,
      p.location || 'N/A',
      p.stock,
      p.price,
      p.unit,
      p.minStock,
      p.criticalStock,
      new Date(p.updatedAt).toLocaleDateString()
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `inventario_filtrado_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleOpenModal = (product?: Product) => {
    setOptimizationStats(null);
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({ code: '', name: '', category: categories[0] || '', location: '', stock: 0, minStock: 30, criticalStock: 10, price: 0, unit: 'und', imageUrl: '' });
    }
    setIsModalOpen(true);
    setIsAddingCategory(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsOptimizing(true);
      const options = { maxSizeMB: 0.3, maxWidthOrHeight: 800, useWebWorker: true };
      const compressedFile = await imageCompression(file, options);
      setOptimizationStats({ 
        original: (file.size / 1024 / 1024).toFixed(2) + " MB", 
        compressed: (compressedFile.size / 1024).toFixed(0) + " KB" 
      });
      setIsOptimizing(false);
      setIsUploading(true);
      const url = await api.uploadProductImage(compressedFile);
      if (url) setFormData(prev => ({ ...prev, imageUrl: url }));
    } catch (error) {
      console.error(error);
      setIsOptimizing(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      await api.deleteProduct(id);
      loadData();
    }
  };

  const handleSaveCategory = async () => {
    if (newCategoryName.trim()) {
      await api.saveCategory(newCategoryName.trim());
      await loadData();
      setFormData(prev => ({...prev, category: newCategoryName.trim()}));
      setIsAddingCategory(false);
      setNewCategoryName('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((formData.criticalStock || 0) >= (formData.minStock || 0)) {
      alert("El stock crítico debe ser menor que el stock mínimo.");
      return;
    }
    await api.saveProduct(formData);
    setIsModalOpen(false);
    loadData();
  };

  const hasActiveFilters = debouncedSearch || selectedCategory !== 'ALL' || selectedLocation !== 'ALL' || selectedStockStatus !== 'ALL';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario Central</h1>
          <p className="text-xs text-gray-500 font-medium">Administración de stock y activos valorizados.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button 
            onClick={handleExcelExport}
            disabled={exporting}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-green-600 border border-green-700 text-white rounded-xl shadow-sm hover:bg-green-700 font-bold text-xs transition-all disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            {exporting ? 'Exportando...' : 'Excel'}
          </button>
          
          <button 
            onClick={exportToCSV}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 font-bold text-xs transition-all"
          >
            <Download className="mr-2 h-4 w-4 text-indigo-500" /> CSV
          </button>
          
          {role === 'ADMIN' && (
            <button onClick={() => handleOpenModal()} className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 font-bold text-xs transition-all shadow-indigo-100">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Ítem
            </button>
          )}
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
            </div>
            <input 
              type="text" 
              className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
              placeholder="Buscar por nombre, código o ubicación..." 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:w-[550px]">
            <div className="relative">
              <select 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className={`w-full appearance-none pl-3 pr-8 py-2.5 bg-slate-50 border ${selectedCategory !== 'ALL' ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-transparent'} rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white transition-all`}
              >
                <option value="ALL">Categoría: Todas</option>
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select 
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className={`w-full appearance-none pl-3 pr-8 py-2.5 bg-slate-50 border ${selectedLocation !== 'ALL' ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-transparent'} rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white transition-all`}
              >
                <option value="ALL">Ubicación: Todas</option>
                {uniqueLocations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
              </select>
              <ChevronDown className="absolute right-2.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>

            <div className="relative">
              <select 
                value={selectedStockStatus}
                onChange={(e) => setSelectedStockStatus(e.target.value as StockStatusFilter)}
                className={`w-full appearance-none pl-3 pr-8 py-2.5 bg-slate-50 border ${selectedStockStatus !== 'ALL' ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-transparent'} rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white transition-all`}
              >
                <option value="ALL">Stock: Todos</option>
                <option value="CRITICAL">🔴 Stock Crítico</option>
                <option value="LOW">🟡 Stock Bajo</option>
                <option value="GOOD">🟢 Stock Bueno</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-colors border border-rose-100"
            >
              <X className="w-3.5 h-3.5 mr-2" /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white shadow-sm overflow-hidden sm:rounded-2xl border border-gray-100">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sincronizando inventario...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">
                <tr>
                  <th className="px-6 py-4 text-left">Imagen</th>
                  <th className="px-6 py-4 text-left">Producto / Código</th>
                  <th className="px-6 py-4 text-left">Ubicación</th>
                  <th className="px-6 py-4 text-center">Existencias</th>
                  <th className="px-6 py-4 text-center">Valor Total</th>
                  <th className="px-6 py-4 text-center">Semáforo</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-indigo-50/20 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-11 w-11 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200 shadow-inner group-hover:scale-110 transition-transform">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-slate-300" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-black text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors">{product.name}</div>
                      <div className="text-[10px] font-black text-gray-400 mt-1 uppercase tracking-widest">#{product.code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[11px] text-gray-700 font-bold uppercase">{product.category}</div>
                      <div className="text-[10px] text-gray-400 flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1 text-slate-300" /> {product.location || 'S/U'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-slate-800">{product.stock}</span> 
                      <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">{product.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-xs font-bold text-slate-500">S/ {(product.stock * product.price).toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StockBadge stock={product.stock} minStock={product.minStock} criticalStock={product.criticalStock} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {role === 'ADMIN' ? (
                          <div className="flex justify-end space-x-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => handleOpenModal(product)} className="text-slate-400 hover:text-indigo-600 hover:bg-white p-2 rounded-lg transition-all shadow-sm border border-transparent hover:border-indigo-100"><Edit2 className="h-4 w-4" /></button>
                              <button onClick={() => handleDelete(product.id)} className="text-slate-400 hover:text-red-600 hover:bg-white p-2 rounded-lg transition-all shadow-sm border border-transparent hover:border-red-100"><Trash2 className="h-4 w-4" /></button>
                          </div>
                      ) : <span className="text-gray-300 text-[10px] uppercase font-black tracking-widest italic">Solo Lectura</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-24 flex flex-col items-center text-center">
              <PackageOpen className="w-16 h-16 text-slate-200 mb-4" />
              <h3 className="text-lg font-bold text-slate-800">Sin resultados</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto mb-6 uppercase tracking-widest font-bold">No hay ítems que coincidan con los criterios de búsqueda.</p>
              <button onClick={clearFilters} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Restablecer Filtros</button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL SECTION */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-[32px] text-left shadow-2xl transform transition-all sm:my-8 sm:max-w-xl w-full overflow-hidden">
              <form onSubmit={handleSubmit}>
                <div className="bg-white p-8 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">{editingProduct ? 'Configurar Ficha' : 'Nueva Alta de Stock'}</h3>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-600">✕</button>
                  </div>
                  
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-shrink-0">
                      <div className="h-40 w-40 rounded-3xl border-2 border-slate-100 flex items-center justify-center overflow-hidden bg-slate-50 relative group shadow-inner">
                         {formData.imageUrl ? (
                           <img src={formData.imageUrl} className="h-full w-full object-cover" />
                         ) : <ImageIcon className="text-slate-200 w-12 h-12" />}
                         {(isUploading || isOptimizing) && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center">
                               <Loader2 className="animate-spin text-indigo-500 mb-2 w-6 h-6" />
                               <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">{isOptimizing ? 'Optimizando' : 'Subiendo'}</span>
                            </div>
                         )}
                      </div>
                      <input type="file" accept="image/*" id="img-up" className="hidden" onChange={handleFileChange} />
                      <label htmlFor="img-up" className="mt-3 flex items-center justify-center w-full py-2.5 px-4 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 cursor-pointer transition-all">Subir Imagen</label>
                    </div>

                    <div className="flex-1 space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código SKU</label>
                            <input type="text" placeholder="REF-001" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full border-slate-100 bg-slate-50 p-3 text-sm font-bold rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicación</label>
                            <input type="text" placeholder="Fila 2-B" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full border-slate-100 bg-slate-50 p-3 text-sm font-bold rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner" />
                          </div>
                       </div>
                       
                       <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Producto</label>
                          <input type="text" placeholder="Ej: Monitor LED 24'" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border-slate-100 bg-slate-50 p-3 text-sm font-black rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner" />
                       </div>

                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Existencias</label>
                            <input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} className="w-full border-slate-100 bg-slate-50 p-3 text-sm font-black rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><DollarSign className="w-3 h-3 mr-1" /> Precio Unitario</label>
                            <input type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: parseFloat(e.target.value) || 0})} className="w-full border-slate-100 bg-slate-50 p-3 text-sm font-black text-indigo-600 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner" />
                          </div>
                       </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-100 space-y-4">
                     <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                        <TrendingUp className="w-4 h-4 mr-2 text-indigo-500" /> Configuración de Umbrales de Alerta
                     </div>
                     <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-amber-500 uppercase tracking-widest">⚠️ Stock Bajo (Min)</label>
                          <input type="number" required value={formData.minStock} onChange={e => setFormData({...formData, minStock: parseInt(e.target.value) || 0})} className="w-full bg-white border border-amber-100 p-2.5 text-xs font-black rounded-xl outline-none focus:ring-2 focus:ring-amber-500" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[9px] font-black text-red-500 uppercase tracking-widest">🚨 Stock Crítico</label>
                          <input type="number" required value={formData.criticalStock} onChange={e => setFormData({...formData, criticalStock: parseInt(e.target.value) || 0})} className="w-full bg-white border border-red-100 p-2.5 text-xs font-black rounded-xl outline-none focus:ring-2 focus:ring-red-500" />
                        </div>
                        <div className="space-y-1.5 col-span-2 md:col-span-1">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unidad de Medida</label>
                          <input type="text" placeholder="unidades" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full bg-white border border-slate-100 p-2.5 text-xs font-bold rounded-xl outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                     </div>
                     <p className="text-[9px] text-slate-400 italic font-medium">El sistema notificará cuando el stock sea inferior a estos valores.</p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Clasificación / Categoría</label>
                    <div className="flex gap-2">
                      <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="flex-1 border-slate-100 bg-slate-50 p-3 text-xs font-bold rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 shadow-inner">
                        <option value="">Seleccione categoría...</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button type="button" onClick={() => setIsAddingCategory(true)} className="bg-indigo-50 p-3 border border-indigo-100 rounded-2xl text-indigo-600 hover:bg-indigo-100 transition-colors"><Plus className="w-5 h-5" /></button>
                    </div>
                  </div>

                  {isAddingCategory && (
                    <div className="flex gap-2 bg-indigo-50/50 p-4 rounded-2xl border border-dashed border-indigo-200 animate-in slide-in-from-top-2">
                      <input type="text" placeholder="Nueva categoría..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="flex-1 border border-white p-2.5 text-xs rounded-xl outline-none shadow-sm focus:ring-2 focus:ring-indigo-500" />
                      <button type="button" onClick={handleSaveCategory} className="bg-indigo-600 text-white px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700">Añadir</button>
                    </div>
                  )}
                </div>
                
                <div className="bg-slate-50 p-8 flex items-center justify-end space-x-3 border-t border-slate-50">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 text-[10px] font-black uppercase tracking-widest px-6 py-3 hover:text-slate-600 transition-colors">Cancelar</button>
                  <button 
                    type="submit" 
                    disabled={isUploading || isOptimizing}
                    className="bg-indigo-600 text-white px-10 py-3.5 rounded-2xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-2xl shadow-indigo-100 active:scale-95"
                  >
                    {editingProduct ? 'Guardar Cambios' : 'Confirmar Alta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
