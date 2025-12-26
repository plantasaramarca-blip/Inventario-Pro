
import React, { useState, useEffect, useMemo } from 'react';
import { Product, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { StockBadge } from '../components/StockBadge.tsx';
import { ProductQRCode } from '../components/ProductQRCode.tsx';
import { formatCurrency } from '../utils/currencyUtils.ts';
import { Plus, Search, Edit2, ImageIcon, Loader2, QrCode, X, Trash2, Save, Package } from 'lucide-react';

interface InventoryProps { role: Role; }

export const Inventory: React.FC<InventoryProps> = ({ role }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedProductForQR, setSelectedProductForQR] = useState<Product | null>(null);
  
  const [formData, setFormData] = useState<any>({
    code: '', name: '', category: '', location: '', stock: '', 
    minStock: 30, criticalStock: 10, purchasePrice: 0, salePrice: undefined, 
    currency: 'PEN', unit: 'und', imageUrl: ''
  });
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats] = await Promise.all([api.getProducts(), api.getCategories()]);
      setProducts(prods || []);
      setCategories(cats || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, search]);

  const capitalize = (text: string) => {
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  };

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ 
        ...product,
        // Aseguramos que los valores numéricos se pasen correctamente al form
        stock: product.stock,
        purchasePrice: product.purchasePrice || 0
      });
    } else {
      setEditingProduct(null);
      setFormData({ 
        code: `C${String(products.length + 1).padStart(4, '0')}`, 
        name: '', 
        category: categories[0] || 'General', 
        location: '', 
        stock: '', 
        minStock: 30, 
        criticalStock: 10, 
        purchasePrice: 0, 
        salePrice: undefined, 
        currency: 'PEN', 
        unit: 'und', 
        imageUrl: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenQR = (product: Product) => {
    setSelectedProductForQR(product);
    setShowQRModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este producto? Esta acción no se puede deshacer.')) return;
    try {
      await api.deleteProduct(id);
      await loadData();
    } catch (err) { 
      console.error(err);
      alert('Error al eliminar el producto'); 
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        ...formData, 
        name: capitalize(formData.name),
        category: capitalize(formData.category),
        stock: formData.stock === '' ? 0 : Number(formData.stock),
        purchasePrice: Number(formData.purchasePrice)
      };
      await api.saveProduct(payload);
      setIsModalOpen(false);
      await loadData();
    } catch (err) { alert('Error al guardar producto'); }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Catálogo de Almacén</h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Control de existencias y valorización</p>
        </div>
        <div className="flex gap-2">
          {role === 'ADMIN' && (
            <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 relative shadow-sm">
        <Search className="absolute left-8 top-7 w-4 h-4 text-slate-300" />
        <input 
          type="text" 
          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all" 
          placeholder="Buscar por nombre, SKU o categoría..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <tr>
                <th className="px-8 py-6 text-left">Producto</th>
                <th className="px-6 py-6 text-center">Estado Stock</th>
                <th className="px-6 py-6 text-center">Existencia</th>
                <th className="px-6 py-6 text-center">Costo Unit.</th>
                <th className="px-6 py-6 text-right pr-8">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="py-24 text-center">
                  <Loader2 className="animate-spin w-10 h-10 text-indigo-500 mx-auto" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Sincronizando Almacén...</p>
                </td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={5} className="py-24 text-center">
                  <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No se encontraron productos</p>
                </td></tr>
              ) : filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 group transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center border border-slate-200 overflow-hidden shadow-sm group-hover:scale-110 transition-transform">
                        {p.imageUrl ? (
                          <img src={p.imageUrl} className="w-full h-full object-cover" />
                        ) : (
                          <ImageIcon className="text-slate-200 w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-sm leading-tight">{p.name}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded">SKU: {p.code}</span>
                          <span className="text-[9px] text-indigo-400 font-black uppercase tracking-tighter">{p.category}</span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <StockBadge stock={p.stock} minStock={p.minStock} criticalStock={p.criticalStock} />
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className="font-black text-slate-800 text-base">{p.stock}</span>
                    <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">{p.unit}</span>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <p className="font-black text-slate-700">{formatCurrency(p.purchasePrice, p.currency)}</p>
                  </td>
                  <td className="px-6 py-5 text-right pr-8">
                    <div className="flex items-center justify-end space-x-2">
                      <button 
                        onClick={() => handleOpenQR(p)} 
                        className="text-indigo-600 px-4 py-2 rounded-xl bg-indigo-50 text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                      >
                        <QrCode className="w-3.5 h-3.5" />
                      </button>
                      {role === 'ADMIN' && (
                        <>
                          <button 
                            onClick={() => handleOpenModal(p)} 
                            className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-90"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleDelete(p.id)} 
                            className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-90"
                            title="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-[3rem] p-10 w-full max-w-2xl shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-100">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completa los datos técnicos del ítem</p>
                </div>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-100 rounded-2xl transition-all">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Producto *</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Ej: Aceite de motor 15w40"
                    className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold transition-all"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: capitalize(e.target.value)})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU / Código</label>
                    <input 
                      type="text" 
                      className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl outline-none font-bold text-indigo-600"
                      value={formData.code}
                      onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                    <input 
                      type="text" 
                      list="category-list"
                      className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl outline-none font-bold"
                      value={formData.category}
                      onChange={e => setFormData({...formData, category: capitalize(e.target.value)})}
                    />
                    <datalist id="category-list">
                      {categories.map(c => <option key={c} value={c} />)}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">URL de la Imagen (Foto)</label>
                  <div className="relative group">
                    <ImageIcon className="absolute left-4 top-4 w-5 h-5 text-slate-300" />
                    <input 
                      type="url" 
                      placeholder="https://ejemplo.com/foto.jpg"
                      className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl outline-none font-medium text-xs focus:ring-2 focus:ring-indigo-500"
                      value={formData.imageUrl || ''}
                      onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Stock Inicial</label>
                    <input 
                      type="number" 
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-black text-center text-lg"
                      value={formData.stock}
                      onChange={e => setFormData({...formData, stock: e.target.value})}
                      disabled={!!editingProduct}
                    />
                    {editingProduct && <p className="text-[8px] text-slate-400 text-center font-black uppercase mt-1">Ajustar via Kardex</p>}
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidad</label>
                    <select 
                      className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none font-bold uppercase text-xs"
                      value={formData.unit}
                      onChange={e => setFormData({...formData, unit: e.target.value})}
                    >
                      <option value="und">Unidades</option>
                      <option value="kg">Kilos</option>
                      <option value="lt">Litros</option>
                      <option value="m">Metros</option>
                      <option value="paq">Paquetes</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-rose-400 uppercase tracking-widest ml-1">Stock Crítico</label>
                    <input 
                      type="number" 
                      className="w-full p-4 bg-rose-50 border border-rose-100 rounded-2xl outline-none font-black text-rose-600 text-center"
                      value={formData.criticalStock}
                      onChange={e => setFormData({...formData, criticalStock: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest ml-1">Stock Bajo</label>
                    <input 
                      type="number" 
                      className="w-full p-4 bg-amber-50 border border-amber-100 rounded-2xl outline-none font-black text-amber-600 text-center"
                      value={formData.minStock}
                      onChange={e => setFormData({...formData, minStock: Number(e.target.value)})}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Costo Unitario de Compra</label>
                  <div className="relative">
                    <span className="absolute left-4 top-4 font-black text-indigo-300">S/</span>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full pl-10 pr-4 py-4 bg-white border border-indigo-100 rounded-2xl outline-none font-black text-indigo-700 text-lg"
                      value={formData.purchasePrice}
                      onChange={e => setFormData({...formData, purchasePrice: e.target.value})}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 hover:text-slate-600 transition-colors"
              >
                Descartar
              </button>
              <button 
                type="submit" 
                className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 active:scale-95"
              >
                <Save className="w-5 h-5" />
                {editingProduct ? 'Actualizar Producto' : 'Registrar en Almacén'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showQRModal && selectedProductForQR && (
        <ProductQRCode product={selectedProductForQR} onClose={() => { setShowQRModal(false); setSelectedProductForQR(null); }} />
      )}
    </div>
  );
};
