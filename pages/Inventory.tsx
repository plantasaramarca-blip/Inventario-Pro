
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Role } from '../types';
import * as api from '../services/supabaseService';
import { StockBadge } from '../components/StockBadge';
import { 
  Plus, Search, Edit2, Trash2, MapPin, ImageIcon, 
  Loader2, CheckCircle2, Zap, FileDown, X, Filter, 
  PackageOpen, ChevronDown 
} from 'https://esm.sh/lucide-react@^0.561.0';
import imageCompression from 'https://esm.sh/browser-image-compression@2.0.2';

interface InventoryProps {
  role: Role;
}

type StockStatus = 'ALL' | 'CRITICAL' | 'LOW' | 'GOOD';

export const Inventory: React.FC<InventoryProps> = ({ role }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  
  // States para filtros
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedLocation, setSelectedLocation] = useState('ALL');
  const [selectedStockStatus, setSelectedStockStatus] = useState<StockStatus>('ALL');

  // Modal y Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationStats, setOptimizationStats] = useState<{ original: string, compressed: string } | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<Partial<Product>>({
    code: '', name: '', category: '', location: '', stock: 0, minStock: 5, unit: 'und', imageUrl: ''
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

  // Implementación de Debounce para la búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Extraer ubicaciones únicas dinámicamente
  const uniqueLocations = useMemo(() => {
    const locations = products
      .map(p => p.location)
      .filter((loc): loc is string => !!loc);
    return Array.from(new Set(locations)).sort();
  }, [products]);

  // LÓGICA DE FILTRADO AVANZADO (useMemo para performance)
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // 1. Filtro por búsqueda (Nombre, Código, Categoría, Ubicación)
      const searchMatch = !debouncedSearch || 
        p.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.code.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        p.category.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (p.location && p.location.toLowerCase().includes(debouncedSearch.toLowerCase()));

      // 2. Filtro por Categoría
      const categoryMatch = selectedCategory === 'ALL' || p.category === selectedCategory;

      // 3. Filtro por Ubicación
      const locationMatch = selectedLocation === 'ALL' || p.location === selectedLocation;

      // 4. Filtro por Estado de Stock
      let stockMatch = true;
      if (selectedStockStatus === 'CRITICAL') stockMatch = p.stock === 0;
      else if (selectedStockStatus === 'LOW') stockMatch = p.stock > 0 && p.stock <= p.minStock;
      else if (selectedStockStatus === 'GOOD') stockMatch = p.stock > p.minStock;

      return searchMatch && categoryMatch && locationMatch && stockMatch;
    });
  }, [products, debouncedSearch, selectedCategory, selectedLocation, selectedStockStatus]);

  const clearFilters = () => {
    setSearch('');
    setSelectedCategory('ALL');
    setSelectedLocation('ALL');
    setSelectedStockStatus('ALL');
  };

  const exportToCSV = () => {
    const headers = ['Codigo', 'Producto', 'Categoria', 'Ubicacion', 'Stock', 'Unidad', 'Stock Minimo', 'Ultima Actualizacion'];
    const rows = filteredProducts.map(p => [
      p.code,
      p.name,
      p.category,
      p.location || 'N/A',
      p.stock,
      p.unit,
      p.minStock,
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
      setFormData({ code: '', name: '', category: categories[0] || '', location: '', stock: 0, minStock: 5, unit: 'und', imageUrl: '' });
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
    await api.saveProduct(formData);
    setIsModalOpen(false);
    loadData();
  };

  const hasActiveFilters = debouncedSearch || selectedCategory !== 'ALL' || selectedLocation !== 'ALL' || selectedStockStatus !== 'ALL';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario Central</h1>
          <p className="text-xs text-gray-500 font-medium">Gestión profesional de activos y existencias.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={exportToCSV}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-xl shadow-sm hover:bg-gray-50 font-bold text-xs transition-all"
          >
            <FileDown className="mr-2 h-4 w-4 text-indigo-500" /> Exportar Filtrados
          </button>
          {role === 'ADMIN' && (
            <button onClick={() => handleOpenModal()} className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 font-bold text-xs transition-all shadow-indigo-100">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
            </button>
          )}
        </div>
      </div>

      {/* SEARCH AND FILTERS BAR */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 space-y-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search Box */}
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

          {/* Combined Filters Row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:w-[500px]">
            {/* Category Filter */}
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

            {/* Location Filter */}
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

            {/* Stock Status Filter */}
            <div className="relative">
              <select 
                value={selectedStockStatus}
                onChange={(e) => setSelectedStockStatus(e.target.value as StockStatus)}
                className={`w-full appearance-none pl-3 pr-8 py-2.5 bg-slate-50 border ${selectedStockStatus !== 'ALL' ? 'border-indigo-200 ring-1 ring-indigo-100' : 'border-transparent'} rounded-xl text-xs font-bold text-slate-700 outline-none focus:bg-white transition-all`}
              >
                <option value="ALL">Stock: Todos</option>
                <option value="CRITICAL">🔴 Sin Stock</option>
                <option value="LOW">🟡 Stock Bajo</option>
                <option value="GOOD">🟢 Stock Bueno</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Clear Button */}
          {hasActiveFilters && (
            <button 
              onClick={clearFilters}
              className="inline-flex items-center justify-center px-4 py-2.5 bg-rose-50 text-rose-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-rose-100 transition-colors border border-rose-100"
            >
              <X className="w-3.5 h-3.5 mr-2" /> Limpiar
            </button>
          )}
        </div>

        {/* Results Counter */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center text-[11px] font-bold text-slate-500 uppercase tracking-tight">
            <Filter className="w-3 h-3 mr-1.5 text-indigo-400" />
            Mostrando <span className="text-indigo-600 mx-1">{filteredProducts.length}</span> de {products.length} productos
            {hasActiveFilters && <span className="ml-2 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full text-[9px] border border-indigo-100">Filtros activos</span>}
          </div>
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white shadow-sm overflow-hidden sm:rounded-2xl border border-gray-100">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center">
              <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
              <p className="text-sm font-bold text-slate-400">Cargando inventario...</p>
            </div>
          ) : filteredProducts.length > 0 ? (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">
                <tr>
                  <th className="px-6 py-4 text-left">Imagen</th>
                  <th className="px-6 py-4 text-left">Producto</th>
                  <th className="px-6 py-4 text-left">Categoría / Ubicación</th>
                  <th className="px-6 py-4 text-center">Stock</th>
                  <th className="px-6 py-4 text-center">Estado</th>
                  <th className="px-6 py-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-50">
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="hover:bg-indigo-50/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="h-12 w-12 rounded-xl overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200 shadow-inner">
                        {product.imageUrl ? (
                          <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-slate-300" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-bold text-gray-900 leading-tight">{product.name}</div>
                      <div className="text-[11px] font-mono text-gray-400 mt-0.5">#{product.code}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-700 font-medium">{product.category}</div>
                      <div className="text-[11px] text-gray-400 flex items-center mt-1">
                        <MapPin className="w-3 h-3 mr-1 text-slate-300" /> {product.location || 'Sin ubicación'}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm font-black text-slate-800">{product.stock}</span> 
                      <span className="text-[10px] text-slate-400 font-bold uppercase ml-1">{product.unit}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StockBadge stock={product.stock} minStock={product.minStock} />
                    </td>
                    <td className="px-6 py-4 text-right">
                      {role === 'ADMIN' ? (
                          <div className="flex justify-end space-x-1.5">
                              <button onClick={() => handleOpenModal(product)} className="text-slate-400 hover:text-indigo-600 hover:bg-white p-2 rounded-lg transition-all shadow-sm border border-transparent hover:border-indigo-100" title="Editar"><Edit2 className="h-4 w-4" /></button>
                              <button onClick={() => handleDelete(product.id)} className="text-slate-400 hover:text-red-600 hover:bg-white p-2 rounded-lg transition-all shadow-sm border border-transparent hover:border-red-100" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                          </div>
                      ) : <span className="text-gray-300 text-[10px] uppercase font-black tracking-widest italic">Lectura</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-24 flex flex-col items-center text-center">
              <div className="bg-slate-50 p-6 rounded-full mb-4">
                <PackageOpen className="w-12 h-12 text-slate-300" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">Sin resultados encontrados</h3>
              <p className="text-sm text-slate-500 max-w-xs mx-auto mb-6">
                No pudimos encontrar productos que coincidan con los filtros aplicados.
              </p>
              <button 
                onClick={clearFilters}
                className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-xl shadow-indigo-100 transition-all hover:bg-indigo-700 active:scale-95"
              >
                Restablecer todos los filtros
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL SECTION (Same logic as before, but ensure consistent styling) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-3xl text-left shadow-2xl transform transition-all sm:my-8 sm:max-w-lg w-full overflow-hidden">
              <form onSubmit={handleSubmit}>
                <div className="bg-white p-8 space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-50 pb-4">
                    <h3 className="text-xl font-black text-slate-800 tracking-tight">{editingProduct ? 'Editar Producto' : 'Crear Nuevo Ítem'}</h3>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-300 hover:text-slate-600 transition-colors">✕</button>
                  </div>
                  
                  {/* Image Upload Area */}
                  <div className="flex items-center space-x-6 bg-indigo-50/30 p-5 rounded-2xl border border-dashed border-indigo-100">
                    <div className="h-28 w-28 rounded-2xl border-2 border-white flex items-center justify-center overflow-hidden bg-white relative shadow-sm">
                       {formData.imageUrl ? (
                         <img src={formData.imageUrl} className="h-full w-full object-cover" />
                       ) : isUploading || isOptimizing ? (
                         <div className="flex flex-col items-center">
                            <Loader2 className="animate-spin text-indigo-500 mb-1 w-6 h-6" />
                            <span className="text-[9px] text-gray-400 font-bold uppercase">{isOptimizing ? 'Optimizando' : 'Subiendo'}</span>
                         </div>
                       ) : <ImageIcon className="text-slate-200 w-10 h-10" />}
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-2">Imagen Representativa</label>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleFileChange} 
                        className="block w-full text-[11px] text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-white file:text-indigo-600 hover:file:bg-indigo-50 cursor-pointer shadow-sm" 
                      />
                    </div>
                  </div>

                  {optimizationStats && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
                       <div className="flex items-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                          <div className="text-[11px] text-emerald-800">
                             Imagen optimizada: <span className="font-bold">{optimizationStats.compressed}</span>
                          </div>
                       </div>
                       <Zap className="w-4 h-4 text-emerald-500 animate-pulse" />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Código Único</label>
                      <input type="text" placeholder="SKU-001" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full border-slate-100 bg-slate-50 p-3 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ubicación</label>
                      <input type="text" placeholder="Pasillo 4, Fila B" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full border-slate-100 bg-slate-50 p-3 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial</label>
                    <input type="text" placeholder="Ej. Cable HDMI 4K 2mts" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border-slate-100 bg-slate-50 p-3 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Clasificación / Categoría</label>
                    <div className="flex gap-2">
                      <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="flex-1 border-slate-100 bg-slate-50 p-3 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all">
                        <option value="">Seleccione categoría...</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button type="button" onClick={() => setIsAddingCategory(true)} className="bg-indigo-50 p-3 border border-indigo-100 rounded-xl text-indigo-600 hover:bg-indigo-100 transition-colors" title="Nueva Categoría"><Plus className="w-5 h-5" /></button>
                    </div>
                  </div>

                  {isAddingCategory && (
                    <div className="flex gap-2 bg-indigo-50/50 p-3 rounded-xl border border-dashed border-indigo-200 animate-in slide-in-from-top-2">
                      <input type="text" placeholder="Nueva categoría..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="flex-1 border border-white p-2.5 text-xs rounded-lg outline-none shadow-sm focus:ring-2 focus:ring-indigo-500" />
                      <button type="button" onClick={handleSaveCategory} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700">Añadir</button>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Existencias</label>
                      <input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} className="w-full border-slate-100 bg-slate-50 p-3 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mínimo</label>
                      <input type="number" required value={formData.minStock} onChange={e => setFormData({...formData, minStock: parseInt(e.target.value) || 0})} className="w-full border-slate-100 bg-slate-50 p-3 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidad</label>
                      <input type="text" placeholder="und" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full border-slate-100 bg-slate-50 p-3 text-sm rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all" />
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 p-8 text-right space-x-3 border-t border-slate-100 flex items-center justify-end">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 text-[11px] font-black uppercase tracking-[0.2em] px-6 py-3 hover:text-slate-600 transition-colors">Cerrar</button>
                  <button 
                    type="submit" 
                    disabled={isUploading || isOptimizing}
                    className="bg-indigo-600 text-white px-10 py-3.5 rounded-2xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-2xl shadow-indigo-100"
                  >
                    {editingProduct ? 'Actualizar Ficha' : 'Dar de Alta'}
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
