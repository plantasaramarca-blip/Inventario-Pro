
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Role, CategoryMaster, LocationMaster } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { StockBadge } from '../components/StockBadge.tsx';
import { ProductQRCode } from '../components/ProductQRCode.tsx';
import { CustomDialog } from '../components/CustomDialog.tsx';
import { formatCurrency } from '../utils/currencyUtils.ts';
import { exportToExcel, exportToPDF } from '../services/excelService.ts';
import { 
  Plus, Search, Edit2, ImageIcon, Loader2, QrCode,
  X, Trash2, Save, Camera, CheckCircle, Printer, CheckSquare, Square, 
  FileSpreadsheet, FileText, Zap, Ruler, Tag, Package, Box
} from 'lucide-react';

interface InventoryProps { role: Role; }

export const Inventory: React.FC<InventoryProps> = ({ role }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryMaster[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  
  const [dialog, setDialog] = useState<{isOpen: boolean, title: string, message: string, type: any} | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedProductForQR, setSelectedProductForQR] = useState<Product | null>(null);
  const [optimizing, setOptimizing] = useState<{status: boolean, reduction?: string}>({status: false});
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<any>({
    code: '', name: '', brand: '', size: '', model: '', 
    category: 'General', location: 'Almacén Principal', stock: 0, 
    minStock: 30, criticalStock: 10, purchasePrice: 0, 
    currency: 'PEN', unit: 'UND', imageUrl: ''
  });

  const showDialog = (title: string, message: string, type: 'success' | 'error' | 'alert' = 'success') => {
    setDialog({ isOpen: true, title, message, type });
  };
  
  const loadData = async () => {
    setLoading(true);
    try {
      const [p, c, l] = await Promise.all([api.getProducts(), api.getCategoriesMaster(), api.getLocationsMaster()]);
      setProducts(p || []);
      setCategories(c || []);
      setLocations(l || []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleExportExcel = () => {
    if (products.length === 0) return showDialog("Sin Datos", "No hay productos para exportar", "alert");
    const data = products.map(p => ({ SKU: p.code, Producto: p.name, Marca: p.brand, Talla: p.size, Almacén: p.location, Stock: p.stock, Costo: p.purchasePrice }));
    exportToExcel(data, `Inventario_${new Date().toLocaleDateString()}`, 'Productos');
  };

  const handleExportPDF = () => {
    if (products.length === 0) return showDialog("Sin Datos", "No hay productos para exportar", "alert");
    const headers = [['SKU', 'PRODUCTO', 'MARCA', 'ALMACEN', 'STOCK', 'COSTO']];
    const body = products.map(p => [p.code, p.name, p.brand, p.location, p.stock.toString(), formatCurrency(p.purchasePrice)]);
    exportToPDF("CATALOGO DE PRODUCTOS KARDEX PRO", headers, body, "Reporte_Inventario");
  };

  const handleOpenModal = (product?: Product) => {
    if (role === 'VIEWER') return;
    if (product) {
      setEditingProduct(product);
      setFormData({ ...product });
    } else {
      setEditingProduct(null);
      setFormData({ 
        code: `SKU-${String(products.length + 1).padStart(4, '0')}`, name: '', brand: '', size: '', model: '',
        category: categories[0]?.name || 'General', location: locations[0]?.name || 'Almacén Principal', 
        stock: 0, minStock: 30, criticalStock: 10, purchasePrice: 0, 
        currency: 'PEN', unit: 'UND', imageUrl: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOptimizing({status: true});
      const originalSize = (file.size / 1024).toFixed(1);
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
          const compressedData = canvas.toDataURL('image/jpeg', 0.6);
          const compressedSize = (compressedData.length / 1024).toFixed(1);
          setFormData({ ...formData, imageUrl: compressedData });
          setOptimizing({status: false, reduction: `${originalSize}KB -> ${compressedSize}KB`});
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api.saveProduct(formData);
      showDialog("Operación Exitosa", editingProduct ? "Actualizado correctamente" : "Producto creado", "success");
      setIsModalOpen(false);
      loadData();
    } catch (err: any) { showDialog("Error", err.message, "error"); }
    finally { setSaving(false); }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  return (
    <div className="space-y-6 pb-20 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Inventario Maestro</h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Control de Stock y Catálogo</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={handleExportExcel} className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-2xl hover:bg-emerald-100 transition-all flex items-center gap-2 text-[10px] font-black uppercase"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button onClick={handleExportPDF} className="bg-rose-50 text-rose-700 px-4 py-3 rounded-2xl hover:bg-rose-100 transition-all flex items-center gap-2 text-[10px] font-black uppercase"><FileText className="w-4 h-4" /> PDF</button>
          {role !== 'VIEWER' && (
            <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl shadow-indigo-200"><Plus className="w-4 h-4" /> Nuevo Producto</button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
        <input type="text" className="w-full pl-12 pr-6 py-4 bg-white border border-slate-100 rounded-[1.5rem] text-sm outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Filtrar por nombre o SKU..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-sm min-w-[800px]">
            <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest">
              <tr>
                <th className="px-8 py-6 text-left">Producto / Código</th>
                <th className="px-4 py-6 text-left">Marca / Medida</th>
                <th className="px-4 py-6 text-center">Estado</th>
                <th className="px-4 py-6 text-center">Stock</th>
                <th className="px-4 py-6 text-center">Costo Unit.</th>
                <th className="px-8 py-6 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin w-10 h-10 text-indigo-500 mx-auto" /></td></tr>
              ) : filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-100 overflow-hidden shadow-inner">
                        {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-200 w-6 h-6" />}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-xs uppercase tracking-tight">{p.name}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">{p.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-5">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{p.brand || 'SIN MARCA'}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{p.size || 'UNICA'}</p>
                  </td>
                  <td className="px-4 py-5 text-center"><StockBadge stock={p.stock} minStock={p.minStock} criticalStock={p.criticalStock} /></td>
                  <td className="px-4 py-5 text-center font-black text-slate-800 text-xs">{p.stock} <span className="text-[9px] text-slate-400 font-bold uppercase">{p.unit}</span></td>
                  <td className="px-4 py-5 text-center font-black text-indigo-600 text-xs">{formatCurrency(p.purchasePrice, p.currency)}</td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setSelectedProductForQR(p); setShowQRModal(true); }} className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><QrCode className="w-4 h-4" /></button>
                      {role !== 'VIEWER' && <button onClick={() => handleOpenModal(p)} className="p-2.5 text-slate-300 hover:text-indigo-600 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white w-full h-full sm:h-auto sm:max-h-[95vh] sm:max-w-5xl sm:rounded-[4rem] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 sm:p-10 border-b border-slate-100 flex justify-between items-center shrink-0">
               <div>
                 <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">{editingProduct ? 'Modificar' : 'Nuevo'} Producto</h3>
                 <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">Configuración técnica de almacén</p>
               </div>
               <button type="button" onClick={() => setIsModalOpen(false)} className="p-3 hover:bg-slate-50 rounded-2xl transition-all"><X className="w-7 h-7 text-slate-400" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-10 no-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                  <div className="space-y-4">
                    <div className="aspect-square bg-slate-50 rounded-[3.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group shadow-inner transition-all hover:border-indigo-300">
                      {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-200 w-16 h-16" />}
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-indigo-600/70 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center font-black uppercase text-[10px] transition-all backdrop-blur-sm"><Camera className="w-10 h-10 mb-2" /> Cargar Fotografía</button>
                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    </div>
                    
                    {optimizing.status && (
                      <div className="space-y-2 animate-pulse">
                        <div className="h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                           <div className="h-full bg-indigo-500 w-2/3 animate-[shimmer_2s_infinite]"></div>
                        </div>
                        <p className="text-[9px] font-black text-indigo-500 uppercase tracking-widest text-center">Optimizando peso de imagen...</p>
                      </div>
                    )}
                    
                    {optimizing.reduction && (
                      <div className="p-4 bg-emerald-50 text-emerald-700 rounded-[1.5rem] text-[9px] font-black uppercase flex items-center justify-between shadow-sm border border-emerald-100">
                        <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Listo</div>
                        <span className="bg-white px-2 py-0.5 rounded-lg shadow-sm">{optimizing.reduction}</span>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-8">
                    {/* Sección 1: Identidad */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Nombre del Producto *</label><input type="text" required className="w-full p-5 bg-slate-50 rounded-[1.5rem] outline-none font-black text-sm uppercase shadow-inner focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Ej: ZAPATILLA DE SEGURIDAD" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">SKU / Código de Barras</label><input type="text" className="w-full p-5 bg-slate-50 rounded-[1.5rem] outline-none font-black text-sm uppercase shadow-inner focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Ej: SKU-1002" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} /></div>
                    </div>

                    {/* Sección 2: Especificaciones */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Marca / Fabricante</label><input type="text" className="w-full p-5 bg-slate-50 rounded-[1.5rem] outline-none font-black text-xs uppercase shadow-inner" placeholder="Ej: CAT, 3M..." value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Modelo / Versión</label><input type="text" className="w-full p-5 bg-slate-50 rounded-[1.5rem] outline-none font-black text-xs uppercase shadow-inner" placeholder="Ej: GEN 3, V2..." value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Ubicación / Almacén</label>
                        <select className="w-full p-5 bg-slate-50 rounded-[1.5rem] font-black text-xs uppercase shadow-inner outline-none cursor-pointer" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>
                          {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Sección 3: Medidas y Unidad */}
                    <div className="grid grid-cols-2 gap-6 p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 shadow-inner">
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Tallas / Dimensiones / Peso</label><input type="text" className="w-full p-5 bg-white rounded-[1.5rem] outline-none font-black text-xs uppercase shadow-sm" placeholder="Ej: 42, XL, 50KG..." value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} /></div>
                      <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Unidad de Medida</label>
                        <select className="w-full p-5 bg-white rounded-[1.5rem] font-black text-xs uppercase shadow-sm outline-none cursor-pointer" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                          <option value="UND">UND (Unidad)</option>
                          <option value="Paquete">Paquete</option>
                          <option value="LITRO">LITRO</option>
                          <option value="Kilos">Kilos</option>
                          <option value="Metros">Metros</option>
                          <option value="Caja">Caja</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-3">Categoría de Producto</label>
                      <select className="w-full p-5 bg-slate-50 rounded-[1.5rem] font-black text-xs uppercase shadow-inner outline-none cursor-pointer" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                      </select>
                    </div>
                  </div>
               </div>

               {/* Sección Valores Numéricos */}
               <div className="grid grid-cols-3 gap-8 bg-indigo-50/50 p-10 rounded-[3.5rem] border-2 border-indigo-50">
                  <div className="space-y-2 text-center">
                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Stock Inicial</label>
                    <input 
                      type="number" 
                      className="w-full p-5 bg-white rounded-[1.8rem] text-center font-black text-lg outline-none shadow-xl shadow-indigo-100/50 focus:ring-4 focus:ring-indigo-100 transition-all" 
                      value={formData.stock === 0 ? '' : formData.stock} 
                      placeholder="0"
                      onChange={e => setFormData({...formData, stock: e.target.value === '' ? 0 : Number(e.target.value)})} 
                      disabled={!!editingProduct} 
                    />
                    <p className="text-[8px] font-black text-indigo-300 uppercase mt-2">{editingProduct ? 'Bloqueado por seguridad' : 'Cantidad de apertura'}</p>
                  </div>
                  <div className="space-y-2 text-center">
                    <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest block mb-1">Stock Crítico</label>
                    <input 
                      type="number" 
                      className="w-full p-5 bg-white text-rose-600 rounded-[1.8rem] text-center font-black text-lg outline-none shadow-xl shadow-rose-100/50 focus:ring-4 focus:ring-rose-100 transition-all" 
                      value={formData.criticalStock === 0 ? '' : formData.criticalStock} 
                      placeholder="10"
                      onChange={e => setFormData({...formData, criticalStock: e.target.value === '' ? 0 : Number(e.target.value)})} 
                    />
                    <p className="text-[8px] font-black text-rose-300 uppercase mt-2">Alerta de reposición</p>
                  </div>
                  <div className="space-y-2 text-center">
                    <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Costo Unit. S/</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      className="w-full p-5 bg-white text-emerald-700 rounded-[1.8rem] text-center font-black text-lg outline-none shadow-xl shadow-emerald-100/50 focus:ring-4 focus:ring-emerald-100 transition-all" 
                      value={formData.purchasePrice === 0 ? '' : formData.purchasePrice} 
                      placeholder="0.00"
                      onChange={e => setFormData({...formData, purchasePrice: e.target.value === '' ? 0 : Number(e.target.value)})} 
                    />
                    <p className="text-[8px] font-black text-emerald-300 uppercase mt-2">Precio de adquisición</p>
                  </div>
               </div>
            </div>

            <div className="p-8 sm:p-10 border-t border-slate-100 flex gap-6 shrink-0 bg-white shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.05)]">
               <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-6 text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] transition-all hover:bg-slate-50 rounded-[1.8rem]">Descartar Cambios</button>
               <button type="submit" disabled={saving} className="flex-[2] py-6 bg-indigo-600 text-white rounded-[1.8rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-indigo-200 flex items-center justify-center gap-4 transition-all active:scale-95 hover:bg-indigo-700">
                  {saving ? <Loader2 className="animate-spin w-6 h-6" /> : <><Save className="w-6 h-6" /> Registrar Producto</>}
               </button>
            </div>
          </form>
        </div>
      )}

      {dialog && (
        <CustomDialog isOpen={dialog.isOpen} title={dialog.title} message={dialog.message} type={dialog.type} onCancel={() => setDialog(null)} />
      )}

      {showQRModal && selectedProductForQR && <ProductQRCode product={selectedProductForQR} onClose={() => { setShowQRModal(false); setSelectedProductForQR(null); }} />}
    </div>
  );
};
