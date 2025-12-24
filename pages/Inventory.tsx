
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
      alert("No hay datos para exportar.");
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

  const handleOpenModal = (product?: Product) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
          <p className="text-xs text-gray-500 font-medium">Administración de stock y activos.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExcelExport} disabled={exporting} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
          </button>
          {role === 'ADMIN' && (
            <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center">
              <Plus className="w-4 h-4 mr-2" /> Nuevo
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl text-sm outline-none" 
            placeholder="Buscar..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        {hasActiveFilters && (
          <button onClick={clearFilters} className="text-xs font-bold text-rose-600 px-4">Limpiar</button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
              <tr>
                <th className="px-6 py-4 text-left">Producto</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden">
                        {p.imageUrl && <img src={p.imageUrl} className="w-full h-full object-cover" />}
                      </div>
                      <div>
                        <p className="font-bold">{p.name}</p>
                        <p className="text-[10px] text-slate-400">#{p.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center font-bold">{p.stock} {p.unit}</td>
                  <td className="px-6 py-4 text-center">
                    <StockBadge stock={p.stock} minStock={p.minStock} criticalStock={p.criticalStock} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {role === 'ADMIN' && (
                      <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-400 hover:text-indigo-600">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-black uppercase mb-6">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre" required className="w-full p-3 bg-slate-50 rounded-xl outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input type="text" placeholder="Código" required className="w-full p-3 bg-slate-50 rounded-xl outline-none" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Stock" required className="w-full p-3 bg-slate-50 rounded-xl outline-none" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
                <input type="number" placeholder="Precio" required className="w-full p-3 bg-slate-50 rounded-xl outline-none" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
              </div>
              <input type="file" onChange={handleFileChange} className="text-xs" />
              <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold uppercase shadow-lg">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
