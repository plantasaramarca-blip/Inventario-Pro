
import React, { useState, useEffect, useMemo } from 'https://esm.sh/react@19.2.3';
import { Product, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { exportToExcel, formatTimestamp } from '../services/excelService.ts';
import { StockBadge } from '../components/StockBadge.tsx';
import { ProductQRCode } from '../components/ProductQRCode.tsx';
import { formatCurrency, calculateMargin } from '../utils/currencyUtils.ts';
import { 
  Plus, Search, Edit2, ImageIcon, Loader2, FileSpreadsheet, 
  DollarSign, BarChart3, TrendingUp, AlertCircle, Coins, MapPin, Tag, QrCode
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

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

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product });
    } else {
      setEditingProduct(null);
      setFormData({ code: '', name: '', category: categories[0] || 'General', location: '', stock: '', minStock: 30, criticalStock: 10, purchasePrice: 0, salePrice: undefined, currency: 'PEN', unit: 'und', imageUrl: '' });
    }
    setIsModalOpen(true);
  };

  const handleOpenQR = (product: Product) => {
    setSelectedProductForQR(product);
    setShowQRModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.saveProduct({ ...formData, stock: formData.stock === '' ? 0 : Number(formData.stock) });
      setIsModalOpen(false);
      await loadData();
    } catch (err) { alert('Error al guardar producto'); }
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Catálogo & Precios</h1>
          <p className="text-xs text-gray-500">Control financiero de ítems y rentabilidad.</p>
        </div>
        <div className="flex gap-2">
          {role === 'ADMIN' && (
            <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase flex items-center shadow-md">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Ítem
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 relative shadow-sm">
        <Search className="absolute left-8 top-7 w-4 h-4 text-slate-300" />
        <input 
          type="text" 
          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium" 
          placeholder="Buscar producto..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-[10px] font-black uppercase text-slate-400">
              <tr>
                <th className="px-6 py-5 text-left">Producto</th>
                <th className="px-6 py-5 text-center">Stock</th>
                <th className="px-6 py-5 text-center">Costo Unit.</th>
                <th className="px-6 py-5 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-500 mx-auto" /></td></tr>
              ) : filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 group">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center border border-slate-200">
                        {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-300 w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{p.name}</p>
                        <p className="text-[10px] text-slate-400 font-black">SKU: {p.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-black text-slate-700">{p.stock}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="font-bold text-slate-600">{formatCurrency(p.purchasePrice, p.currency)}</p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <button onClick={() => handleOpenQR(p)} className="text-indigo-600 px-3 py-2 rounded-xl bg-indigo-50 text-xs font-bold flex items-center gap-1"><QrCode className="w-4 h-4" /> QR</button>
                      {role === 'ADMIN' && <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-400 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showQRModal && selectedProductForQR && (
        <ProductQRCode product={selectedProductForQR} onClose={() => { setShowQRModal(false); setSelectedProductForQR(null); }} />
      )}
    </div>
  );
};
