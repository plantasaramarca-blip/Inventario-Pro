
import React, { useState, useEffect, useMemo, useRef } from 'https://esm.sh/react@19.2.3';
import { Product, Role, CategoryMaster, LocationMaster } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { StockBadge } from '../components/StockBadge.tsx';
import { ProductQRCode } from '../components/ProductQRCode.tsx';
import { formatCurrency } from '../utils/currencyUtils.ts';
import { 
  Plus, Search, Edit2, ImageIcon, Loader2, QrCode, 
  X, Trash2, Save, Package, Camera, MapPin, Tag, CheckCircle2, AlertTriangle, CheckCircle
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

interface InventoryProps { role: Role; }

export const Inventory: React.FC<InventoryProps> = ({ role }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryMaster[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false); 
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMasterModalOpen, setIsMasterModalOpen] = useState<'category' | 'location' | null>(null);
  const [masterName, setMasterName] = useState('');
  
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedProductForQR, setSelectedProductForQR] = useState<Product | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<any>({
    code: '', name: '', brand: '', size: '', model: '', 
    category: '', location: '', stock: '', 
    minStock: 30, criticalStock: 10, purchasePrice: 0, 
    currency: 'PEN', unit: 'und', imageUrl: ''
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [prods, cats, locs] = await Promise.all([
        api.getProducts(), 
        api.getCategoriesMaster(),
        api.getLocationsMaster()
      ]);
      setProducts(prods || []);
      setCategories(cats || []);
      setLocations(locs || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.code.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()) ||
      (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())) ||
      (p.size && p.size.toLowerCase().includes(search.toLowerCase())) ||
      (p.location && p.location.toLowerCase().includes(search.toLowerCase()))
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, search]);

  const handleOpenModal = (product?: Product) => {
    if (role === 'VIEWER') return;
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product });
    } else {
      setEditingProduct(null);
      setFormData({ 
        code: `SKU-${String(products.length + 1).padStart(4, '0')}`, 
        name: '', brand: '', size: '', model: '',
        category: categories[0]?.name || 'General', 
        location: locations[0]?.name || 'Almacén 1', 
        stock: '', minStock: 30, criticalStock: 10, purchasePrice: 0, 
        currency: 'PEN', unit: 'und', imageUrl: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleOpenQR = (product: Product) => {
    setSelectedProductForQR(product);
    setShowQRModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsOptimizing(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6); 
          
          setTimeout(() => { 
            setFormData({ ...formData, imageUrl: dataUrl });
            setIsOptimizing(false);
          }, 800);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMasterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'VIEWER') return;
    if (!masterName.trim()) return;
    try {
      if (isMasterModalOpen === 'category') await api.saveCategoryMaster(masterName);
      else await api.saveLocationMaster(masterName);
      setMasterName('');
      showToast("Maestro actualizado");
      loadData();
    } catch (e) {
      showToast("Error al actualizar maestro", 'error');
    }
  };

  const handleMasterDelete = async (id: string) => {
    if (role !== 'ADMIN') return;
    if (!confirm('¿Eliminar permanentemente?')) return;
    try {
      if (isMasterModalOpen === 'category') await api.deleteCategoryMaster(id);
      else await api.deleteLocationMaster(id);
      showToast("Elemento eliminado");
      loadData();
    } catch (e) {
      showToast("Error al eliminar elemento", 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (role === 'VIEWER' || saving) return;
    setSaving(true);
    try {
      const payload = { 
        ...formData, 
        stock: formData.stock === '' ? 0 : Number(formData.stock),
        purchasePrice: Number(formData.purchasePrice)
      };
      await api.saveProduct(payload);
      showToast(editingProduct ? "Producto actualizado" : "Producto creado exitosamente");
      setIsModalOpen(false);
      loadData();
    } catch (err) { 
      showToast("Error al guardar producto", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Seguro que desea eliminar este producto? Esta acción no se puede deshacer.')) return;
    try {
      await api.deleteProduct(id);
      showToast("Producto eliminado correctamente");
      loadData();
    } catch (e) {
      showToast("Error al eliminar producto", 'error');
    }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Catálogo de Almacén</h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Gestión por Listado de Variantes</p>
        </div>
        <div className="flex gap-2">
          {role !== 'VIEWER' && (
            <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Producto
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 relative shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input 
            type="text" 
            className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all" 
            placeholder="Buscar por nombre, SKU, marca, talla, ubicación..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto">
           {role !== 'VIEWER' && (
             <>
               <button onClick={() => setIsMasterModalOpen('category')} className="flex-1 md:flex-none p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 text-[10px] font-black uppercase whitespace-nowrap"><Tag className="w-4 h-4" /> Categorías</button>
               <button onClick={() => setIsMasterModalOpen('location')} className="flex-1 md:flex-none p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2 text-[10px] font-black uppercase whitespace-nowrap"><MapPin className="w-4 h-4" /> Ubicaciones</button>
             </>
           )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/80 text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <tr>
                <th className="px-8 py-6 text-left">Producto / Variante</th>
                <th className="px-6 py-6 text-center">Estado</th>
                <th className="px-6 py-6 text-center">Ubicación</th>
                <th className="px-6 py-6 text-center">Existencia</th>
                <th className="px-6 py-6 text-center">Costo Unit.</th>
                <th className="px-6 py-6 text-right pr-8">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="py-24 text-center">
                  <Loader2 className="animate-spin w-10 h-10 text-indigo-500 mx-auto" />
                </td></tr>
              ) : filteredProducts.length === 0 ? (
                <tr><td colSpan={6} className="py-24 text-center">
                  <Package className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No se encontraron productos</p>
                </td></tr>
              ) : filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/50 group transition-colors">
                  <td className="px-8 py-4">
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
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter bg-slate-100 px-1.5 py-0.5 rounded">SKU: {p.code}</span>
                          {p.brand && <span className="text-[9px] text-indigo-500 font-black uppercase tracking-tighter">{p.brand}</span>}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <StockBadge stock={p.stock} minStock={p.minStock} criticalStock={p.criticalStock} />
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-slate-500 uppercase bg-slate-100 px-2.5 py-1 rounded-lg">
                      <MapPin className="w-3 h-3 text-indigo-400" /> {p.location || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-black text-slate-800 text-base">{p.stock}</span>
                    <span className="text-[10px] text-slate-400 font-bold ml-1 uppercase">{p.unit}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <p className="font-black text-slate-700">{formatCurrency(p.purchasePrice, p.currency)}</p>
                  </td>
                  <td className="px-6 py-4 text-right pr-8">
                    <div className="flex items-center justify-end space-x-1">
                      <button onClick={() => handleOpenQR(p)} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Ver QR"><QrCode className="w-4 h-4" /></button>
                      {role !== 'VIEWER' && (
                        <button onClick={() => handleOpenModal(p)} className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Editar"><Edit2 className="w-4 h-4" /></button>
                      )}
                      {role === 'ADMIN' && (
                        <button onClick={() => handleDeleteProduct(p.id)} className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* TOAST SYSTEM */}
      {toast && (
        <div className={`fixed bottom-10 right-10 z-[200] px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-right-10 border ${toast.type === 'success' ? 'bg-white border-emerald-100 text-emerald-800' : 'bg-rose-600 border-rose-500 text-white'}`}>
           {toast.type === 'success' ? <CheckCircle className="w-6 h-6 text-emerald-500" /> : <AlertTriangle className="w-6 h-6 text-white" />}
           <p className="text-xs font-black uppercase tracking-tight">{toast.msg}</p>
        </div>
      )}

      {isModalOpen && role !== 'VIEWER' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-[3rem] p-8 w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[95vh] animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6">
               <div className="flex items-center gap-4">
                 <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-100"><Package /></div>
                 <div>
                   <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h3>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Variantes y ficha técnica</p>
                 </div>
               </div>
               {!saving && <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-2xl"><X className="w-6 h-6 text-slate-400" /></button>}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-4">
                <div className="aspect-square bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group">
                  {isOptimizing ? (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                      <Loader2 className="animate-spin text-indigo-600 w-8 h-8" />
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest animate-pulse">Optimizando imagen...</p>
                    </div>
                  ) : formData.imageUrl ? (
                    <img src={formData.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-6">
                      <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Sin foto</p>
                    </div>
                  )}
                  <button 
                    type="button"
                    disabled={isOptimizing || saving}
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-indigo-600/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 font-black uppercase text-xs disabled:cursor-not-allowed"
                  >
                    <Camera className="w-8 h-8" />
                    {formData.imageUrl ? 'Cambiar Foto' : 'Capturar'}
                  </button>
                  <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial *</label>
                    <input type="text" required placeholder="Ej: Zapato Punta Acero" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marca</label>
                    <input type="text" placeholder="Ej: Caterpillar / Shell" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Talla / Medida</label>
                    <input type="text" placeholder="Ej: 42" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-indigo-600" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo</label>
                    <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU / Código</label>
                    <input type="text" required className="w-full p-4 bg-indigo-50 rounded-2xl outline-none font-black text-indigo-700" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                    <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {categories.length === 0 ? <option value="General">General (Tabla no creada)</option> : categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ubicación</label>
                    <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>
                      {locations.length === 0 ? <option value="Almacén 1">Almacén 1 (Tabla no creada)</option> : locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Stock Ini.</label>
                    <input type="number" className="w-full p-3 bg-white border border-slate-100 rounded-xl text-center font-black" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} disabled={!!editingProduct} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Unidad</label>
                    <select className="w-full p-3 bg-white border border-slate-100 rounded-xl font-bold uppercase text-[10px]" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                      <option value="und">und</option>
                      <option value="paq">paq</option>
                      <option value="kg">kg</option>
                      <option value="lt">lt</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-rose-400 uppercase tracking-tighter">Crítico</label>
                    <input type="number" className="w-full p-3 bg-white border border-rose-100 rounded-xl text-center font-black text-rose-600" value={formData.criticalStock} onChange={e => setFormData({...formData, criticalStock: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-tighter">Costo S/</label>
                    <input type="number" step="0.01" className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-center font-black text-indigo-700" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-10">
              <button type="button" onClick={() => setIsModalOpen(false)} disabled={saving} className="flex-1 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 disabled:opacity-30">Cancelar</button>
              <button type="submit" disabled={saving} className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3 disabled:bg-slate-300">
                {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <><Save className="w-5 h-5" /> Guardar</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL MAESTROS */}
      {isMasterModalOpen && role !== 'VIEWER' && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMasterModalOpen(null)}></div>
          <div className="relative bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gestionar {isMasterModalOpen === 'category' ? 'Categorías' : 'Ubicaciones'}</h3>
                <button onClick={() => setIsMasterModalOpen(null)}><X className="text-slate-400" /></button>
             </div>
             
             <form onSubmit={handleMasterSubmit} className="flex gap-2 mb-6">
                <input type="text" placeholder="Nuevo valor..." className="flex-1 p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={masterName} onChange={e => setMasterName(e.target.value)} />
                <button type="submit" className="p-4 bg-indigo-600 text-white rounded-2xl"><Plus /></button>
             </form>

             <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {(isMasterModalOpen === 'category' ? categories : locations).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group">
                    <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                    {role === 'ADMIN' && (
                      <button onClick={() => handleMasterDelete(item.id)} className="text-slate-300 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                    )}
                  </div>
                ))}
             </div>
          </div>
        </div>
      )}

      {showQRModal && selectedProductForQR && (
        <ProductQRCode product={selectedProductForQR} onClose={() => { setShowQRModal(false); setSelectedProductForQR(null); }} />
      )}
    </div>
  );
};
