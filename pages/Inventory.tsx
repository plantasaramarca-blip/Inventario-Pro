
import React, { useState, useEffect, useMemo, useRef } from 'https://esm.sh/react@19.2.3';
import { Product, Role, CategoryMaster, LocationMaster } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { StockBadge } from '../components/StockBadge.tsx';
import { ProductQRCode } from '../components/ProductQRCode.tsx';
import { formatCurrency } from '../utils/currencyUtils.ts';
import { 
  Plus, Search, Edit2, ImageIcon, Loader2, QrCode, 
  X, Trash2, Save, Package, Camera, Settings, MapPin, Tag, ChevronRight, Check
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

interface InventoryProps { role: Role; }

export const Inventory: React.FC<InventoryProps> = ({ role }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryMaster[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
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
    minStock: 30, criticalStock: 10, purchasePrice: 0, salePrice: undefined, 
    currency: 'PEN', unit: 'und', imageUrl: ''
  });
  
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
      p.brand?.toLowerCase().includes(search.toLowerCase()) ||
      p.size?.toLowerCase().includes(search.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [products, search]);

  const handleOpenModal = (product?: Product) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product });
    } else {
      setEditingProduct(null);
      setFormData({ 
        code: `C${String(products.length + 1).padStart(4, '0')}`, 
        name: '', brand: '', size: '', model: '',
        category: categories[0]?.name || '', 
        location: locations[0]?.name || '', 
        stock: '', minStock: 30, criticalStock: 10, purchasePrice: 0, 
        currency: 'PEN', unit: 'und', imageUrl: '' 
      });
    }
    setIsModalOpen(true);
  };

  // Fix: Added handleOpenQR to set state for the QR modal
  const handleOpenQR = (product: Product) => {
    setSelectedProductForQR(product);
    setShowQRModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleMasterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!masterName.trim()) return;
    if (isMasterModalOpen === 'category') await api.saveCategoryMaster(masterName);
    else await api.saveLocationMaster(masterName);
    setMasterName('');
    loadData();
  };

  const handleMasterDelete = async (id: string) => {
    if (!confirm('¿Eliminar permanentemente?')) return;
    if (isMasterModalOpen === 'category') await api.deleteCategoryMaster(id);
    else await api.deleteLocationMaster(id);
    loadData();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = { 
        ...formData, 
        stock: formData.stock === '' ? 0 : Number(formData.stock),
        purchasePrice: Number(formData.purchasePrice)
      };
      await api.saveProduct(payload);
      setIsModalOpen(false);
      loadData();
    } catch (err) { alert('Error al guardar producto'); }
  };

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Catálogo Maestro</h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Existencias y Variantes Técnicas</p>
        </div>
        <div className="flex gap-2">
          {role === 'ADMIN' && (
            <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
              <Plus className="w-4 h-4 mr-2" /> Nuevo Ítem
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 relative shadow-sm flex gap-4 overflow-x-auto items-center no-scrollbar">
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
          <input 
            type="text" 
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all" 
            placeholder="Buscar por nombre, SKU, marca, talla..." 
            value={search} 
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
           <button onClick={() => setIsMasterModalOpen('category')} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-2 text-[10px] font-black uppercase whitespace-nowrap"><Tag className="w-4 h-4" /> Categorías</button>
           <button onClick={() => setIsMasterModalOpen('location')} className="p-3 bg-white border border-slate-200 rounded-2xl text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-2 text-[10px] font-black uppercase whitespace-nowrap"><MapPin className="w-4 h-4" /> Ubicaciones</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="col-span-full py-24 text-center">
            <Loader2 className="animate-spin w-10 h-10 text-indigo-500 mx-auto" />
          </div>
        ) : filteredProducts.map(p => (
          <div key={p.id} className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm hover:shadow-xl transition-all group flex flex-col">
            <div className="relative mb-4 h-48 bg-slate-50 rounded-[2rem] overflow-hidden border border-slate-100 flex items-center justify-center">
              {p.imageUrl ? (
                <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
              ) : (
                <Package className="w-12 h-12 text-slate-200" />
              )}
              <div className="absolute top-4 right-4 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenQR(p)} className="p-2 bg-white/90 backdrop-blur rounded-xl shadow-lg text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all"><QrCode className="w-4 h-4" /></button>
                {role === 'ADMIN' && (
                  <>
                    <button onClick={() => handleOpenModal(p)} className="p-2 bg-white/90 backdrop-blur rounded-xl shadow-lg text-slate-600 hover:bg-slate-900 hover:text-white transition-all"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => api.deleteProduct(p.id).then(loadData)} className="p-2 bg-white/90 backdrop-blur rounded-xl shadow-lg text-rose-600 hover:bg-rose-600 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
                  </>
                )}
              </div>
              <div className="absolute bottom-4 left-4">
                <StockBadge stock={p.stock} minStock={p.minStock} criticalStock={p.criticalStock} />
              </div>
            </div>
            
            <div className="flex-1">
              <p className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1">{p.category} • {p.brand}</p>
              <h3 className="font-bold text-slate-800 line-clamp-2 leading-tight mb-2">{p.name} {p.size && `• Talla/Med: ${p.size}`}</h3>
              <div className="flex items-center gap-2 mb-4">
                <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-0.5 rounded uppercase tracking-tighter">SKU: {p.code}</span>
                {p.location && <span className="text-[9px] font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded uppercase flex items-center gap-1"><MapPin className="w-2 h-2" /> {p.location}</span>}
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50 flex items-end justify-between">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase">Costo Unitario</p>
                <p className="font-black text-slate-800">{formatCurrency(p.purchasePrice, p.currency)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-black text-slate-400 uppercase">En Mano</p>
                <p className="text-xl font-black text-indigo-600 leading-none">{p.stock} <span className="text-[10px] uppercase font-bold text-slate-400">{p.unit}</span></p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* MODAL PRODUCTO */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-[3rem] p-8 w-full max-w-4xl shadow-2xl overflow-y-auto max-h-[95vh] animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8 border-b border-slate-50 pb-6">
               <div className="flex items-center gap-4">
                 <div className="p-4 bg-indigo-600 text-white rounded-3xl shadow-xl shadow-indigo-100"><Package /></div>
                 <div>
                   <h3 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h3>
                   <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Atributos técnicos y variantes</p>
                 </div>
               </div>
               <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-2xl"><X className="w-6 h-6 text-slate-400" /></button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* SECCION FOTO */}
              <div className="lg:col-span-1 space-y-4">
                <div className="aspect-square bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group">
                  {formData.imageUrl ? (
                    <img src={formData.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-6">
                      <ImageIcon className="w-12 h-12 text-slate-200 mx-auto mb-2" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sin imagen cargada</p>
                    </div>
                  )}
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute inset-0 bg-indigo-600/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 font-black uppercase text-xs"
                  >
                    <Camera className="w-8 h-8" />
                    {formData.imageUrl ? 'Cambiar Foto' : 'Capturar Foto'}
                  </button>
                  <input type="file" accept="image/*" capture="environment" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                </div>
                <p className="text-[9px] text-center text-slate-400 font-bold uppercase px-4 leading-tight italic">Sugerencia: Usa el celular para tomar fotos de las brocas o etiquetas de zapatos.</p>
              </div>

              {/* DATOS GENERALES */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre Comercial *</label>
                    <input type="text" required placeholder="Ej: Zapato Punta Acero S3" className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Marca (Diferenciador)</label>
                    <input type="text" placeholder="Ej: Shell / Bata / Caterpillar" className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Talla / Medida</label>
                    <input type="text" placeholder="Ej: 42 / 1/2'' / 1LT" className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-black text-indigo-600" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Modelo / Serie</label>
                    <input type="text" placeholder="Ej: Predator / Helix" className="w-full p-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">SKU / Código Único</label>
                    <input type="text" required className="w-full p-4 bg-indigo-50 rounded-2xl outline-none font-black text-indigo-700" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                    <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                      {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ubicación Física</label>
                    <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>
                      {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
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
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Cancelar</button>
              <button type="submit" className="flex-[2] py-5 bg-indigo-600 text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl flex items-center justify-center gap-3"><Save className="w-5 h-5" /> {editingProduct ? 'Actualizar' : 'Registrar'} en Almacén</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL MAESTROS (GESTION DE CATEGORIAS/UBICACIONES) */}
      {isMasterModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsMasterModalOpen(null)}></div>
          <div className="relative bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Gestionar {isMasterModalOpen === 'category' ? 'Categorías' : 'Ubicaciones'}</h3>
                <button onClick={() => setIsMasterModalOpen(null)}><X className="text-slate-400" /></button>
             </div>
             
             <form onSubmit={handleMasterSubmit} className="flex gap-2 mb-6">
                <input 
                  type="text" 
                  placeholder={`Nueva ${isMasterModalOpen === 'category' ? 'categoría' : 'ubicación'}...`} 
                  className="flex-1 p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm"
                  value={masterName}
                  onChange={e => setMasterName(e.target.value)}
                />
                <button type="submit" className="p-4 bg-indigo-600 text-white rounded-2xl"><Plus /></button>
             </form>

             <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                {(isMasterModalOpen === 'category' ? categories : locations).map(item => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl group">
                    <span className="font-bold text-slate-700 text-sm">{item.name}</span>
                    <button onClick={() => handleMasterDelete(item.id)} className="text-slate-300 hover:text-rose-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
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
