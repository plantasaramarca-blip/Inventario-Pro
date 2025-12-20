import React, { useState, useEffect } from 'react';
import { Product, Role } from '../types';
import * as api from '../services/supabaseService';
import { StockBadge } from '../components/StockBadge';
import { Plus, Search, Edit2, Trash2, MapPin, ImageIcon, Loader2 } from 'lucide-react';

interface InventoryProps {
  role: Role;
}

export const Inventory: React.FC<InventoryProps> = ({ role }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [formData, setFormData] = useState<Partial<Product>>({
    code: '', name: '', category: '', location: '', stock: 0, minStock: 5, unit: 'und', imageUrl: ''
  });
  
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const loadData = async () => {
    const [p, c] = await Promise.all([api.getProducts(), api.getCategories()]);
    setProducts(p);
    setCategories(c);
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenModal = (product?: Product) => {
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

    setIsUploading(true);
    const url = await api.uploadProductImage(file);
    if (url) {
      setFormData({ ...formData, imageUrl: url });
    }
    setIsUploading(false);
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
                            <button onClick={() => handleOpenModal(product)} className="text-indigo-600 bg-indigo-50 p-2 rounded-full"><Edit2 className="h-4 w-4" /></button>
                            <button onClick={() => handleDelete(product.id)} className="text-red-600 bg-red-50 p-2 rounded-full"><Trash2 className="h-4 w-4" /></button>
                        </div>
                    ) : <span className="text-gray-400 text-xs">Bloqueado</span>}
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
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setIsModalOpen(false)}></div>
            <div className="inline-block align-bottom bg-white rounded-lg text-left shadow-xl transform transition-all sm:my-8 sm:max-w-lg w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white p-6 space-y-4">
                  <h3 className="text-lg font-medium text-gray-900">{editingProduct ? 'Editar Producto' : 'Agregar Producto'}</h3>
                  
                  {/* Image Upload UI */}
                  <div className="flex items-center space-x-4">
                    <div className="h-24 w-24 rounded border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden">
                       {formData.imageUrl ? (
                         <img src={formData.imageUrl} className="h-full w-full object-cover" />
                       ) : isUploading ? (
                         <Loader2 className="animate-spin text-indigo-500" />
                       ) : <ImageIcon className="text-gray-300 w-8 h-8" />}
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-gray-700">Imagen del Producto</label>
                      <input type="file" accept="image/*" onChange={handleFileChange} className="mt-1 block w-full text-xs text-gray-500 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <input type="text" placeholder="Código" required value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} className="border p-2 text-sm rounded" />
                      <input type="text" placeholder="Ubicación" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} className="border p-2 text-sm rounded" />
                  </div>
                  <input type="text" placeholder="Nombre" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full border p-2 text-sm rounded" />
                  
                  <div>
                    <label className="text-xs text-gray-500">Categoría</label>
                    <div className="flex gap-2">
                      <select required value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="flex-1 border p-2 text-sm rounded">
                        <option value="">Seleccione...</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <button type="button" onClick={() => setIsAddingCategory(true)} className="bg-indigo-50 p-2 border border-indigo-200 rounded"><Plus className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {isAddingCategory && (
                    <div className="flex gap-2 mt-2">
                      <input type="text" placeholder="Nueva Cat..." value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} className="flex-1 border p-2 text-sm rounded" />
                      <button type="button" onClick={handleSaveCategory} className="bg-green-600 text-white px-2 py-1 rounded text-xs">Ok</button>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-4">
                      <input type="number" placeholder="Stock" required value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value)})} className="border p-2 text-sm rounded" />
                      <input type="number" placeholder="Mínimo" required value={formData.minStock} onChange={e => setFormData({...formData, minStock: parseInt(e.target.value)})} className="border p-2 text-sm rounded" />
                      <input type="text" placeholder="Unidad" required value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} className="border p-2 text-sm rounded" />
                  </div>
                </div>
                <div className="bg-gray-50 p-4 text-right space-x-2">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-600 text-sm">Cancelar</button>
                  <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm">Guardar</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};