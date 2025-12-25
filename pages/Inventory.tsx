import React, { useState, useEffect, useMemo } from 'https://esm.sh/react@19.0.0';
import { Product, Role } from '../types';
import * as api from '../services/supabaseService';
import { exportToExcel, formatTimestamp, getStockStatusLabel } from '../services/excelService';
import { StockBadge } from '../components/StockBadge';
import { 
  Plus, Search, Edit2, ImageIcon, Loader2, FileSpreadsheet
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.0.0';
import imageCompression from 'https://esm.sh/browser-image-compression@2.0.2';

interface InventoryProps {
  role: Role;
}

export const Inventory: React.FC<InventoryProps> = ({ role }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState<Partial<Product>>({
    code: '', name: '', category: '', location: '', stock: 0, minStock: 30, criticalStock: 10, price: 0, unit: 'und', imageUrl: ''
  });
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([api.getProducts(), api.getCategories()]);
      setProducts(prods || []);
      setCategories(cats || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.code.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, search]);

  const handleExcelExport = async () => {
    if (filteredProducts.length === 0) return;
    setExporting(true);
    try {
      const dataToExport = filteredProducts.map(p => ({
        'Código': p.code,
        'Producto': p.name,
        'Stock': p.stock,
        'Precio': p.price,
        'Estado': getStockStatusLabel(p.stock, p.minStock)
      }));
      const fileName = `Inventario_${formatTimestamp(new Date())}.xlsx`;
      exportToExcel(dataToExport, fileName, 'Inventario');
    } catch (e: any) {
      alert(`Error: ${e.message}`);
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
      setFormData({ code: '', name: '', category: categories[0] || 'General', location: '', stock: 0, minStock: 30, criticalStock: 10, price: 0, unit: 'und', imageUrl: '' });
    }
    setIsModalOpen(true);
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

  if (loading) return (
    <div className="h-[40vh] flex items-center justify-center">
      <Loader2 className="animate-spin w-8 h-8 text-indigo-500" />
    </div>
  );

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-xs text-gray-500">Gestión de catálogo y stock.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExcelExport} className="bg-green-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel
          </button>
          {role === 'ADMIN' && (
            <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center">
              <Plus className="w-4 h-4 mr-2" /> Nuevo
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 relative shadow-sm">
        <Search className="absolute left-7 top-7 w-4 h-4 text-slate-400" />
        <input 
          type="text" 
          className="w-full pl-10 pr-4 py-2 bg-slate-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
          placeholder="Buscar producto por nombre o código..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
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
                <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-slate-200">
                        {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300 w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">#{p.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-black text-slate-700">{p.stock}</span>
                    <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">{p.unit}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StockBadge stock={p.stock} minStock={p.minStock} criticalStock={p.criticalStock} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {role === 'ADMIN' && (
                      <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-20 text-center text-slate-300 italic text-sm">No se encontraron productos.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-black uppercase mb-6 text-slate-800">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
            <div className="space-y-4">
              <input type="text" placeholder="Nombre" required className="w-full p-3 bg-slate-50 border border-transparent rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
              <input type="text" placeholder="Código" required className="w-full p-3 bg-slate-50 border border-transparent rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} />
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Stock</label>
                  <input type="number" placeholder="0" required className="w-full p-3 bg-slate-50 border border-transparent rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" value={formData.stock || 0} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Precio Unit.</label>
                  <input type="number" step="0.01" placeholder="0.00" required className="w-full p-3 bg-slate-50 border border-transparent rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all" value={formData.price || 0} onChange={e => setFormData({...formData, price: Number(e.target.value)})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Imagen del Producto</label>
                <div className="flex items-center space-x-3 p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <input type="file" accept="image/*" onChange={handleFileChange} className="text-xs flex-1 file:mr-4 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 text-slate-400 text-xs font-black uppercase tracking-widest">Cancelar</button>
                <button type="submit" disabled={isUploading || isOptimizing} className="flex-[2] bg-indigo-600 text-white py-4 rounded-xl font-bold uppercase shadow-lg disabled:opacity-50 hover:bg-indigo-700 transition-all">
                  {isUploading ? 'Subiendo...' : (isOptimizing ? 'Optimizando...' : 'Guardar Producto')}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};