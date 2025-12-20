
import React, { useState, useEffect } from 'react';
import { Product, Role } from '../types';
import * as api from '../services/supabaseService';
import { StockBadge } from '../components/StockBadge';
import { Plus, Search, Edit2, Trash2, MapPin, ImageIcon, Loader2, CheckCircle2, Zap, FileDown } from 'lucide-react';
import imageCompression from 'browser-image-compression';

interface InventoryProps {
  role: Role;
}

export const Inventory: React.FC<InventoryProps> = ({ role }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
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
    const prods = await api.getProducts();
    const cats = await api.getCategories();
    setProducts(prods);
    setCategories(cats);
  };

  useEffect(() => { loadData(); }, []);

  const exportToCSV = () => {
    const headers = ['Codigo', 'Producto', 'Categoria', 'Ubicacion', 'Stock', 'Unidad', 'Stock Minimo', 'Ultima Actualizacion'];
    const rows = products.map(p => [
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
    link.setAttribute("download", `inventario_${new Date().toISOString().split('T')[0]}.csv`);
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

    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      alert("Formato no permitido (JPG, PNG o WEBP solamente).");
      return;
    }

    try {
      setIsOptimizing(true);
      setOptimizationStats(null);

      const options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: file.type
      };

      const compressedFile = await imageCompression(file, options);
      
      const originalSizeStr = (file.size / 1024 / 1024).toFixed(2) + " MB";
      const compressedSizeStr = (compressedFile.size / 1024).toFixed(0) + " KB";
      
      setOptimizationStats({ original: originalSizeStr, compressed: compressedSizeStr });
      setIsOptimizing(false);
      
      setIsUploading(true);
      const url = await api.uploadProductImage(compressedFile);
      if (url) {
        setFormData(prev => ({ ...prev, imageUrl: url }));
      }
    } catch (error) {
      console.error('Error procesando imagen:', error);
      alert("Error al optimizar o subir la imagen.");
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

  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario Actual</h1>
          <p className="text-xs text-gray-500 font-medium">Gestiona tu catálogo de productos y niveles de stock.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button 
            onClick={exportToCSV}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-md shadow-sm hover:bg-gray-50 font-bold text-sm transition-all"
          >
            <FileDown className="mr-2 h-4 w-4 text-indigo-500" /> Exportar
          </button>
          {role === 'ADMIN' && (
            <button onClick={() => handleOpenModal()} className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow-lg hover:bg-indigo-700 font-bold text-sm transition-all shadow-indigo-100">
              <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
            </button>
          )}
        </div>
      </div>

      <div className="relative group">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
        </div>
        <input type="text" className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-xl bg-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all shadow-sm" placeholder="Buscar por nombre o código..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-white shadow-sm overflow-hidden sm:rounded-2xl border border-gray-100">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">
              <tr>
                <th className="px-6 py-4 text-left">Img</th>
                <th className="px-6 py-4 text-left">Producto</th>
                <th className="px-6 py-4 text-left">Categoría / Ubicación</th>
                <th className="px-6 py-4 text-center">Stock</th>
                <th className="px-6 py-4 text-center">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-50">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-12 w-12 rounded-lg overflow-hidden bg-slate-100 flex items-center justify-center border border-slate-200 shadow-inner">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-slate-300" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-bold text-gray-900">{product.name}</div>
                    <div className="text-[11px] font-mono text-gray-400 mt-0.5">#{product.code}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-700 font-medium">{product.category}</div>
                    <div className="text-[11px] text-gray-400 flex items-center mt-1"><MapPin className="w-3 h-3 mr-1 text-slate-300" /> {product.location || 'Sin asignar'}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-black text-slate-800">{product.stock}</span> <span className="text-[10px] text-slate-400 font-bold uppercase">{product.unit}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StockBadge stock={product.stock} minStock={product.minStock} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {role === 'ADMIN' ? (
                        <div className="flex justify-end space-x-1.5">
                            <button onClick={() => handleOpenModal(product)} className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-all" title="Editar"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(product.id)} className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all" title="Eliminar"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    ) : <span className="text-gray-300 text-[10px] uppercase font-black tracking-widest italic">Solo lectura</span>}
                  </td>
                </tr>
              ))}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                      <Search className="w-8 h-8 opacity-20 mb-2" />
                      <p className="text-sm italic">No se encontraron productos que coincidan con la búsqueda.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-2xl text-left shadow-2xl transform transition-all sm:my-8 sm:max-w-lg w-full overflow-hidden">
              <form onSubmit={handleSubmit}>
                <div className="bg-white p-6 space-y-5">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                    <h3 className="text-lg font-bold text-slate-800">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                    <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                  </div>
                  
                  <div className="flex items-center space-x-5 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <div className="h-24 w-24 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden bg-white relative shadow-inner">
                       {formData.imageUrl ? (
                         <img src={formData.imageUrl} className="h-full w-full object-cover" />
                       ) : isUploading || isOptimizing ? (
                         <div className="flex flex-col items-center">
                            <Loader2 className="animate-spin text-indigo-500 mb-1 w-6 h-6" />
                            <span className="text-[9px] text-gray-400 text-center font-bold">{isOptimizing ? 'COMPRIMIENDO...' : 'SUBIENDO...'}</span>
                         </div>
                       ) : <ImageIcon className="text-slate-200 w-8 h-8" />}
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Imagen del Producto</label>
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp" 
                        onChange={handleFileChange} 
                        className="block w-full text-[11px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer" 
                      />
                      <p className="mt-2 text-[9px] text-slate-400 font-medium leading-tight">Formatos: JPG, PNG, WEBP. Se optimiza a menos de 300KB automáticamente.</p>
                    </div>
                  </div>

                  {optimizationStats && (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                       <div className="flex items-center">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500 mr-2" />
                          <div className="text-[11px] text-emerald-800">
                             Imagen optimizada: <span className="line-through opacity-40 mr-1">{optimizationStats.original}</span> 
                             <span className="font-bold">{optimizationStats.compressed}</span>
                          </div>
                       </div>
                       <div className="bg-emerald-100 px-2 py-0.5 rounded-full text-[9px] text-emerald-700 font-black flex items-center">
                          <Zap className="w-3 h-3 mr-0.5" /> AHORRO OK
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código</label>
                      <input type="text" placeholder="P001" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ubicación</label>
                      <input type="text" placeholder="Estante A-1" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nombre del Producto</label>
                    <input type="text" placeholder="Ej. Laptop Dell Latitude 5420" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Categoría</label>
                    <div className="flex gap-2">
                      <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="flex-1 border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white transition-all">
                        <option value="">Seleccione...</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button type="button" onClick={() => setIsAddingCategory(true)} className="bg-indigo-50 p-2.5 border border-indigo-100 rounded-lg text-indigo-600 hover:bg-indigo-100 transition-colors" title="Nueva Categoría"><Plus className="w-5 h-5" /></button>
                    </div>
                  </div>

                  {isAddingCategory && (
                    <div className="flex gap-2 bg-indigo-50/50 p-3 rounded-xl border border-dashed border-indigo-200 animate-in slide-in-from-top-2">
                      <input type="text" placeholder="Nombre de categoría..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="flex-1 border border-white p-2 text-xs rounded-lg outline-none shadow-sm focus:ring-2 focus:ring-indigo-500" />
                      <button type="button" onClick={handleSaveCategory} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all hover:bg-indigo-700">Agregar</button>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Stock</label>
                      <input type="number" required value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mínimo</label>
                      <input type="number" required value={formData.minStock} onChange={e => setFormData({...formData, minStock: parseInt(e.target.value) || 0})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Unidad</label>
                      <input type="text" placeholder="und/pqte" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="w-full border border-slate-200 p-2.5 text-sm rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all" />
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 p-5 text-right space-x-3 border-t border-slate-100">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-slate-500 text-[11px] font-black uppercase tracking-widest px-4 py-2 hover:bg-slate-200 rounded-lg transition-colors">Cancelar</button>
                  <button 
                    type="submit" 
                    disabled={isUploading || isOptimizing}
                    className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-xl shadow-indigo-100 flex-shrink-0"
                  >
                    {editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
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
