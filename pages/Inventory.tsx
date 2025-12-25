import React, { useState, useEffect, useMemo } from 'https://esm.sh/react@19.0.0';
import { Product, Role } from '../types';
import * as api from '../services/supabaseService';
import { exportToExcel, formatTimestamp, getStockStatusLabel } from '../services/excelService';
import { StockBadge } from '../components/StockBadge';
import { ProductQRCode } from '../components/ProductQRCode';
import { formatCurrency, calculateMargin } from '../utils/currencyUtils';
import { 
  Plus, Search, Edit2, ImageIcon, Loader2, FileSpreadsheet, 
  DollarSign, BarChart3, TrendingUp, AlertCircle, Coins, MapPin, Tag, QrCode
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.0.0';

interface InventoryProps { role: Role; }

export const Inventory: React.FC<InventoryProps> = ({ role }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  
  // Estados para QR
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
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      p.location.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, search]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product });
    } else {
      setEditingProduct(null);
      setFormData({ 
        code: '', name: '', category: categories[0] || 'General', 
        location: '', stock: '', minStock: 30, criticalStock: 10, 
        purchasePrice: 0, salePrice: undefined, currency: 'PEN', 
        unit: 'und', imageUrl: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenQR = (product: Product) => {
    setSelectedProductForQR(product);
    setShowQRModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      stock: formData.stock === '' ? 0 : Number(formData.stock)
    };
    await api.saveProduct(payload);
    setIsModalOpen(false);
    loadData();
  };

  const margin = calculateMargin(formData.purchasePrice || 0, formData.salePrice || 0);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo & Precios</h1>
          <p className="text-xs text-gray-500 font-medium">Control financiero de ítems y rentabilidad.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => {}} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-md">
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar
          </button>
          {role === 'ADMIN' && (
            <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-md">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Ítem
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 relative shadow-sm">
        <Search className="absolute left-8 top-7 w-4 h-4 text-slate-300" />
        <input 
          type="text" 
          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
          placeholder="Buscar por SKU, Nombre, Categoría o Ubicación..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <tr>
                <th className="px-6 py-5 text-left">Producto</th>
                <th className="px-6 py-5 text-left">Categoría</th>
                <th className="px-6 py-5 text-left">Ubicación</th>
                <th className="px-6 py-5 text-center">Stock</th>
                <th className="px-6 py-5 text-center">Costo Unit.</th>
                <th className="px-6 py-5 text-center">Valor Stock</th>
                <th className="px-6 py-5 text-center">Márgen %</th>
                <th className="px-6 py-5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredProducts.map(p => {
                const totalVal = p.purchasePrice * p.stock;
                const pMargin = calculateMargin(p.purchasePrice, p.salePrice || 0);
                return (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center border border-slate-200 shadow-inner">
                          {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300 w-5 h-5" />}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">{p.name}</p>
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">SKU: {p.code}</p>
                          <p className="text-[9px] text-indigo-500 font-black uppercase tracking-widest">{p.qr_code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg uppercase">
                        <Tag className="w-2.5 h-2.5 mr-1" /> {p.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-slate-500 font-medium flex items-center">
                        <MapPin className="w-3 h-3 mr-1 text-slate-300" /> {p.location || 'Sin asignar'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-black text-slate-700 text-base">{p.stock}</span>
                        <StockBadge stock={p.stock} minStock={p.minStock} criticalStock={p.criticalStock} />
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className="font-bold text-slate-600">{formatCurrency(p.purchasePrice, p.currency)}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <p className={`font-black ${totalVal > 1000 ? 'text-indigo-700 text-base' : 'text-slate-800'}`}>
                        {formatCurrency(totalVal, p.currency)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {p.salePrice ? (
                        <div className={`text-[11px] font-black px-2 py-1 rounded-lg border ${pMargin.percent > 30 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : pMargin.percent > 15 ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                          {pMargin.percent.toFixed(1)}%
                        </div>
                      ) : <span className="text-slate-300">--</span>}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-1">
                        <button onClick={() => handleOpenQR(p)} title="Generar QR" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                          <QrCode className="w-4 h-4" />
                        </button>
                        {role === 'ADMIN' && (
                          <button onClick={() => handleOpenModal(p)} title="Editar" className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-[2.5rem] p-8 w-full max-w-xl shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center space-x-3 mb-8">
              <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                <BarChart3 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Datos Generales</label>
                  <input type="text" placeholder="Nombre del Producto" required className="w-full p-3.5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                  <input type="text" placeholder="Código / SKU" required className="w-full p-3.5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-bold" value={formData.code || ''} onChange={e => setFormData({...formData, code: e.target.value})} />
                  <div className="grid grid-cols-2 gap-2">
                     <select className="w-full p-3.5 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none" value={formData.category || ''} onChange={e => setFormData({...formData, category: e.target.value})}>
                       <option value="">Categoría...</option>
                       {categories.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                     <input type="text" placeholder="Ubicación" className="w-full p-3.5 bg-slate-50 border border-transparent rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-bold" value={formData.location || ''} onChange={e => setFormData({...formData, location: e.target.value})} />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Stock Actual</label>
                    <input 
                      type="number" 
                      placeholder="Ingrese stock inicial" 
                      className="w-full p-3.5 bg-slate-50 border border-transparent rounded-2xl font-black outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white" 
                      value={formData.stock} 
                      onChange={e => setFormData({...formData, stock: e.target.value})} 
                    />
                    <p className="text-[8px] text-slate-400 font-bold uppercase ml-1">Dejar vacío para iniciar en 0</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Unidad</label>
                    <select className="w-full p-3.5 bg-slate-50 border border-transparent rounded-2xl font-bold outline-none" value={formData.unit || 'und'} onChange={e => setFormData({...formData, unit: e.target.value})}>
                      <option value="und">Unidad</option>
                      <option value="kg">Kilos</option>
                      <option value="lt">Litros</option>
                      <option value="paq">Paquete</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-indigo-50/50 p-5 rounded-[2rem] border border-indigo-100 space-y-4">
                  <div className="flex items-center text-indigo-700">
                    <DollarSign className="w-4 h-4 mr-2" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Finanzas</span>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between items-center mb-1">
                      <label className="text-[9px] font-black text-indigo-400 uppercase">P. Compra (Unit)</label>
                      <select className="text-[9px] font-black bg-white border border-indigo-100 rounded px-1" value={formData.currency} onChange={e => setFormData({...formData, currency: e.target.value as any})}>
                        <option value="PEN">PEN</option>
                        <option value="USD">USD</option>
                      </select>
                    </div>
                    <input type="number" step="0.01" required className="w-full p-3 bg-white border border-indigo-100 rounded-xl font-black text-indigo-700 shadow-sm" value={formData.purchasePrice || 0} onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-400 uppercase">P. Venta Sugerido</label>
                    <input type="number" step="0.01" className="w-full p-3 bg-white border border-indigo-100 rounded-xl font-black text-emerald-600 shadow-sm" value={formData.salePrice || ''} onChange={e => setFormData({...formData, salePrice: e.target.value ? Number(e.target.value) : undefined})} />
                  </div>

                  {formData.salePrice && formData.purchasePrice && (
                    <div className="pt-2">
                       <div className="flex justify-between text-[10px] font-black uppercase mb-1">
                         <span className="text-slate-400">Margen Unit.</span>
                         <span className={margin.amount >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                           {formatCurrency(margin.amount, formData.currency)} ({margin.percent.toFixed(1)}%)
                         </span>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-8 flex gap-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 text-slate-400 text-[10px] font-black uppercase tracking-widest py-4 border border-slate-100 rounded-2xl hover:bg-slate-50 transition-all">Cancelar</button>
              <button type="submit" className="flex-[2] bg-indigo-600 text-white text-[10px] font-black uppercase tracking-[0.2em] py-4 rounded-2xl shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all">
                {editingProduct ? 'Actualizar Producto' : 'Guardar Nuevo'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL QR AJUSTE PASO 4 */}
      {showQRModal && selectedProductForQR && (
        <ProductQRCode 
          product={selectedProductForQR} 
          onClose={() => {
            setShowQRModal(false);
            setSelectedProductForQR(null);
          }} 
        />
      )}
    </div>
  );
};