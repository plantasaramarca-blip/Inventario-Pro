
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
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

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
    } catch (err: any) { 
      showDialog("Error de Servidor", "Algunos campos podrían no estar sincronizados con tu DB. Verifica las columnas de Supabase.", "error"); 
    }
    finally { setSaving(false); }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()));
  }, [products, search]);

  return (
    <div className="space-y-4 pb-20 relative animate-in fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight uppercase">Inventario</h1>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Maestro de Stock</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={handleExportExcel} className="bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 hover:bg-emerald-100 transition-all"><FileSpreadsheet className="w-3.5 h-3.5" /> Excel</button>
          {role !== 'VIEWER' && (
            <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg shadow-indigo-100"><Plus className="w-3.5 h-3.5" /> Nuevo</button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
        <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs outline-none shadow-sm focus:ring-2 focus:ring-indigo-500" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-xs min-w-[800px]">
            <thead className="bg-slate-50/50 text-[9px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-4 text-left">Producto</th>
                <th className="px-4 py-4 text-left">Marca</th>
                <th className="px-4 py-4 text-center">Estado</th>
                <th className="px-4 py-4 text-center">Stock</th>
                <th className="px-4 py-4 text-center">Costo</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-500 mx-auto" /></td></tr>
              ) : filteredProducts.map(p => (
                <tr key={p.id} className="hover:bg-slate-50/40 transition-colors">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 overflow-hidden shadow-inner">
                        {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-200 w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-[11px] uppercase truncate max-w-[150px]">{p.name}</p>
                        <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">{p.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{p.brand || '-'}</p>
                  </td>
                  <td className="px-4 py-3 text-center"><StockBadge stock={p.stock} minStock={p.minStock} criticalStock={p.criticalStock} /></td>
                  <td className="px-4 py-3 text-center font-black text-slate-800 text-[11px]">{p.stock} <span className="text-[8px] text-slate-400 font-bold uppercase">{p.unit}</span></td>
                  <td className="px-4 py-3 text-center font-black text-indigo-600 text-[11px]">{formatCurrency(p.purchasePrice, p.currency)}</td>
                  <td className="px-6 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setSelectedProductForQR(p); setShowQRModal(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"><QrCode className="w-3.5 h-3.5" /></button>
                      {role !== 'VIEWER' && <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-300 hover:text-indigo-600 rounded-lg transition-all"><Edit2 className="w-3.5 h-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/70 backdrop-blur-md" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white w-full max-h-[98vh] sm:max-w-4xl rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0">
               <div>
                 <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h3>
                 <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest">Almacén Pro</p>
               </div>
               <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl transition-all"><X className="w-6 h-6 text-slate-400" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 no-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  <div className="md:col-span-4 space-y-3">
                    <div className="aspect-square bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group shadow-inner transition-all hover:border-indigo-300">
                      {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-200 w-12 h-12" />}
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-indigo-600/70 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center font-black uppercase text-[8px] transition-all backdrop-blur-sm"><Camera className="w-8 h-8 mb-1" /> Cargar</button>
                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    </div>
                    {optimizing.status && <p className="text-[8px] font-black text-indigo-500 uppercase tracking-widest text-center animate-pulse">Optimizando...</p>}
                  </div>

                  <div className="md:col-span-8 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre *</label><input type="text" required className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-xs uppercase shadow-inner focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">SKU / Código</label><input type="text" className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-xs uppercase shadow-inner focus:bg-white focus:ring-2 focus:ring-indigo-500 transition-all" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} /></div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Marca</label><input type="text" className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-xs uppercase shadow-inner" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Modelo</label><input type="text" className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-xs uppercase shadow-inner" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Ubicación</label>
                        <select className="w-full p-3 bg-slate-50 rounded-xl font-bold text-xs uppercase shadow-inner outline-none" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>
                          {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl">
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Medida/Talla</label><input type="text" className="w-full p-3 bg-white rounded-xl outline-none font-bold text-xs uppercase shadow-sm" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-2">Unidad</label>
                        <select className="w-full p-3 bg-white rounded-xl font-bold text-xs uppercase shadow-sm outline-none" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                          <option value="UND">UND</option>
                          <option value="Paquete">Paquete</option>
                          <option value="Caja">Caja</option>
                          <option value="Kilos">Kilos</option>
                        </select>
                      </div>
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-3 gap-4 bg-indigo-50/40 p-6 rounded-[2rem] border border-indigo-50">
                  <div className="space-y-1 text-center">
                    <label className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Stock</label>
                    <input type="number" className="w-full p-3 bg-white rounded-xl text-center font-black text-sm outline-none shadow-sm focus:ring-2 focus:ring-indigo-100 transition-all" value={formData.stock || ''} placeholder="0" onChange={e => setFormData({...formData, stock: Number(e.target.value)})} disabled={!!editingProduct} />
                  </div>
                  <div className="space-y-1 text-center">
                    <label className="text-[8px] font-black text-rose-400 uppercase tracking-widest">Alerta</label>
                    <input type="number" className="w-full p-3 bg-white text-rose-600 rounded-xl text-center font-black text-sm outline-none shadow-sm focus:ring-2 focus:ring-rose-100 transition-all" value={formData.criticalStock || ''} placeholder="10" onChange={e => setFormData({...formData, criticalStock: Number(e.target.value)})} />
                  </div>
                  <div className="space-y-1 text-center">
                    <label className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Costo Unit.</label>
                    <input type="number" step="0.01" className="w-full p-3 bg-white text-emerald-700 rounded-xl text-center font-black text-sm outline-none shadow-sm focus:ring-2 focus:ring-emerald-100 transition-all" value={formData.purchasePrice || ''} placeholder="0.00" onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} />
                  </div>
               </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-100 flex gap-4 shrink-0 bg-white">
               <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[9px] font-black uppercase text-slate-400 tracking-widest hover:bg-slate-50 rounded-xl transition-all">Cancelar</button>
               <button type="submit" disabled={saving} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 hover:bg-indigo-700">
                  {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <><Save className="w-4 h-4" /> Guardar Producto</>}
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
