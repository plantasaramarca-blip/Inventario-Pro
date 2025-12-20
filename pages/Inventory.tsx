
import React, { useState, useEffect } from 'react';
import { Product, Role } from '../types';
import * as api from '../services/supabaseService';
import { StockBadge } from '../components/StockBadge';
import { Plus, Search, Edit2, Trash2, MapPin, ImageIcon, Loader2, CheckCircle2, Zap } from 'lucide-react';
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
    const [p, c] = await api.getProducts().then(res => [res, api.getCategories()]);
    // El orden de carga puede variar, manejamos las promesas correctamente
    const prods = await api.getProducts();
    const cats = await api.getCategories();
    setProducts(prods);
    setCategories(cats);
  };

  useEffect(() => { loadData(); }, []);

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

    if (file.size > 10 * 1024 * 1024) {
      alert("La imagen original excede los 10MB.");
      return;
    }

    try {
      setIsOptimizing(true);
      setOptimizationStats(null);

      const options = {
        maxSizeMB: 0.3,
        maxWidthOrHeight: 800,
        useWebWorker: true,
        fileType: file.type as any
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
          setFormData({...formData, category: newCategoryName.trim()});
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Inventario Actual ({products.length})</h1>
        {role === 'ADMIN' && (
          <button onClick={() => handleOpenModal()} className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md shadow-sm hover:bg-indigo-700">
            <Plus className="mr-2 h-4 w-4" /> Nuevo Producto
          </button>
        )}
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input type="text" className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md bg-white text-sm" placeholder="Buscar por nombre o código..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <tr>
                <th className="px-6 py-3 text-left">Img</th>
                <th className="px-6 py-3 text-left">Producto</th>
                <th className="px-6 py-3 text-left">Categoría / Ubicación</th>
                <th className="px-6 py-3 text-center">Stock</th>
                <th className="px-6 py-3 text-center">Estado</th>
                <th className="px-6 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="h-10 w-10 rounded overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-gray-900">{product.name}</div>
                    <div className="text-xs text-gray-500">Cod: {product.code}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{product.category}</div>
                    <div className="text-xs text-gray-500 flex items-center mt-1"><MapPin className="w-3 h-3 mr-1" /> {product.location || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="text-sm font-bold">{product.stock}</span> <span className="text-xs text-gray-500">{product.unit}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StockBadge stock={product.stock} minStock={product.minStock} />
                  </td>
                  <td className="px-6 py-4 text-right">
                    {role === 'ADMIN' ? (
                        <div className="flex justify-end space-x-2">
                            <button onClick={() => handleOpenModal(product)} className="text-indigo-600 bg-indigo-50 p-2 rounded-full hover:bg-indigo-100 transition-colors"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(product.id)} className="text-red-600 bg-red-50 p-2 rounded-full hover:bg-red-100 transition-colors"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    ) : <span className="text-gray-400 text-xs">Consulta</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 opacity-75 transition-opacity" onClick={() => setIsModalOpen(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:max-w-lg w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white p-6 space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">{editingProduct ? 'Editar Producto' : 'Agregar Producto'}</h3>
                  
                  <div className="flex items-center space-x-4">
                    <div className="h-24 w-24 rounded border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-slate-50 relative">
                       {formData.imageUrl ? (
                         <img src={formData.imageUrl} className="h-full w-full object-cover" />
                       ) : isUploading || isOptimizing ? (
                         <div className="flex flex-col items-center">
                            <Loader2 className="animate-spin text-indigo-500 mb-1 w-6 h-6" />
                            <span className="text-[10px] text-gray-400 text-center">{isOptimizing ? 'Comprimiendo...' : 'Subiendo...'}</span>
                         </div>
                       ) : <ImageIcon className="text-gray-300 w-8 h-8" />}
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700">Imagen del Producto</label>
                      <input 
                        type="file" 
                        accept="image/jpeg,image/png,image/webp" 
                        onChange={handleFileChange} 
                        className="mt-1 block w-full text-xs text-gray-500 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
                      />
                      <p className="mt-1 text-[10px] text-gray-400 tracking-tight">JPG, PNG, WEBP (Límite 300KB tras compresión)</p>
                    </div>
                  </div>

                  {optimizationStats && (
                    <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-center justify-between animate-in fade-in slide-in-from-top-1">
                       <div className="flex items-center">
                          <CheckCircle2 className="w-4 h-4 text-green-500 mr-2" />
                          <div className="text-xs text-green-800">
                             Optimizado: <span className="line-through opacity-50 mr-1">{optimizationStats.original}</span> 
                             <span className="font-bold">{optimizationStats.compressed}</span>
                          </div>
                       </div>
                       <div className="bg-green-100 px-2 py-0.5 rounded-full text-[10px] text-green-700 font-bold flex items-center">
                          <Zap className="w-3 h-3 mr-0.5" /> Ahorro ✓
                       </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="Código" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="border p-2 text-sm rounded focus:ring-1 focus:ring-indigo-500 outline-none" />
                      <input type="text" placeholder="Ubicación" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="border p-2 text-sm rounded focus:ring-1 focus:ring-indigo-500 outline-none" />
                  </div>
                  <input type="text" placeholder="Nombre" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 text-sm rounded focus:ring-1 focus:ring-indigo-500 outline-none" />
                  
                  <div>
                    <label className="text-xs text-gray-500 font-semibold mb-1 block">Categoría</label>
                    <div className="flex gap-2">
                      <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="flex-1 border p-2 text-sm rounded focus:ring-1 focus:ring-indigo-500 outline-none">
                        <option value="">Seleccione...</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button type="button" onClick={() => setIsAddingCategory(true)} className="bg-indigo-50 p-2 border border-indigo-200 rounded text-indigo-600 hover:bg-indigo-100"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {isAddingCategory && (
                    <div className="flex gap-2 mt-2 bg-slate-50 p-2 rounded border border-dashed border-slate-300 animate-in slide-in-from-top-2">
                      <input type="text" placeholder="Nueva Categoría..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="flex-1 border p-2 text-xs rounded outline-none" />
                      <button type="button" onClick={handleSaveCategory} className="bg-green-600 text-white px-3 py-1 rounded text-xs font-bold shadow-sm">Agregar</button>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                      <input type="number" placeholder="Stock" required value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} className="border p-2 text-sm rounded outline-none" />
                      <input type="number" placeholder="Mínimo" required value={formData.minStock} onChange={e => setFormData({...formData, minStock: parseInt(e.target.value)})} className="border p-2 text-sm rounded outline-none" />
                      <input type="text" placeholder="Unidad" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="border p-2 text-sm rounded outline-none" />
                  </div>
                </div>
                <div className="bg-gray-50 p-4 text-right space-x-2 border-t">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-600 text-sm px-4 py-2 hover:bg-gray-100 rounded transition-colors">Cancelar</button>
                  <button 
                    type="submit" 
                    disabled={isUploading || isOptimizing}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-md"
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
