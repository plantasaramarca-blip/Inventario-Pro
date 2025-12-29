
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Role, CategoryMaster, LocationMaster } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { StockBadge } from '../components/StockBadge.tsx';
import { formatCurrency } from '../utils/currencyUtils.ts';
import { exportToPDF } from '../services/excelService.ts';
import { exportToExcel } from '../services/excelService.ts';
import { ProductQRCode } from '../components/ProductQRCode.tsx';
import { 
  Plus, Search, Edit2, ImageIcon, Loader2, X, Save, Camera, FileText, QrCode, Info, Trash2, FileSpreadsheet
} from 'lucide-react';

export const Inventory: React.FC<{ role: Role }> = ({ role }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryMaster[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQRProduct, setSelectedQRProduct] = useState<Product | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imageInfo, setImageInfo] = useState<{ size: string; status: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<any>({});

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

  const handleExportPDF = () => {
    if (products.length === 0) return;
    const headers = [['SKU', 'PRODUCTO', 'MARCA', 'MODELO', 'ALMACEN', 'STOCK', 'COSTO']];
    const body = products.map(p => [p.code, p.name, p.brand, p.model, p.location, p.stock.toString(), formatCurrency(p.purchasePrice)]);
    exportToPDF("CATALOGO DE PRODUCTOS", headers, body, "Inventario_Completo");
  };

  const handleExportExcel = () => {
    if (products.length === 0) return;
    const data = products.map(p => ({
      SKU: p.code,
      Producto: p.name,
      Marca: p.brand || '-',
      Modelo: p.model || '-',
      Talla: p.size || '-',
      Categoria: p.category,
      Almacen: p.location,
      Stock: p.stock,
      Unidad: p.unit,
      Costo: p.purchasePrice
    }));
    exportToExcel(data, "Catalogo_Productos_KardexPro", "Productos");
  };

  const handleOpenModal = (product?: Product) => {
    setImageInfo(null);
    if (product) { setEditingProduct(product); setFormData({ ...product }); }
    else {
      setEditingProduct(null);
      setFormData({ 
        code: `SKU-${String(products.length + 1).padStart(4, '0')}`, name: '', brand: '', size: '', model: '',
        category: '', location: '', 
        stock: 0, minStock: 30, criticalStock: 10, purchasePrice: 0, currency: 'PEN', unit: 'PAR', imageUrl: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("¿Seguro que desea eliminar este producto de forma permanente?")) return;
    try {
      await api.deleteProduct(id);
      loadData();
    } catch (e) { alert("Error al eliminar"); }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageInfo({ size: '...', status: 'Procesando' });
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 600;
          const scale = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
          const kbSize = Math.round((dataUrl.length * 3/4) / 1024);
          setFormData({ ...formData, imageUrl: dataUrl });
          setImageInfo({ size: `${kbSize} KB`, status: 'Optimizado' });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { 
      await api.saveProduct(formData); 
      setIsModalOpen(false); 
      loadData(); 
    } catch (err) { 
      alert("Error al guardar producto."); 
    } finally { setSaving(false); }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">PRODUCTOS</h1>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Control Maestro de Inventario</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-white border border-slate-200 rounded-xl flex overflow-hidden shadow-sm">
            <button onClick={handleExportPDF} className="px-3 py-2 text-slate-600 text-[9px] font-black uppercase flex items-center gap-1.5 hover:bg-slate-50 transition-all border-r border-slate-100"><FileText className="w-3.5 h-3.5" /> PDF</button>
            <button onClick={handleExportExcel} className="px-3 py-2 text-emerald-600 text-[9px] font-black uppercase flex items-center gap-1.5 hover:bg-emerald-50 transition-all"><FileSpreadsheet className="w-3.5 h-3.5" /> EXCEL</button>
          </div>
          {role !== 'VIEWER' && <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"><Plus className="w-4 h-4" /> NUEVO PRODUCTO</button>}
        </div>
      </div>

      <div className="relative group">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
        <input type="text" className="w-full pl-10 pr-10 py-3 bg-white border border-slate-100 rounded-2xl text-xs outline-none shadow-sm focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-bold" placeholder="Buscar por nombre, SKU o marca..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"><X className="w-3 h-3 text-slate-400" /></button>}
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm overflow-x-auto no-scrollbar">
        <table className="w-full text-xs min-w-[900px]">
          <thead className="bg-slate-50/50 text-[8px] font-black uppercase text-slate-400 tracking-widest border-b">
            <tr>
              <th className="px-6 py-4 text-left">Producto</th>
              <th className="px-4 py-4 text-left">Especificaciones</th>
              <th className="px-4 py-4 text-center">Estado</th>
              <th className="px-4 py-4 text-center">Stock</th>
              <th className="px-4 py-4 text-center">Precio Compra</th>
              <th className="px-6 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin w-8 h-8 mx-auto text-indigo-500" /></td></tr> : filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/40 transition-colors group">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shrink-0">
                      {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="w-4 h-4 text-slate-300 m-auto mt-3" />}
                    </div>
                    <div>
                      <p className="font-black text-slate-800 text-[11px] uppercase truncate max-w-[150px]">{p.name}</p>
                      <p className="text-[8px] text-slate-400 font-black uppercase tracking-tighter">{p.code}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <p className="text-[10px] font-bold text-slate-700 uppercase">{p.brand || 'S/M'}</p>
                  <p className="text-[8px] text-slate-400 uppercase font-black">{p.model || '-'} | Talla: {p.size || '-'}</p>
                </td>
                <td className="px-4 py-3 text-center"><StockBadge stock={p.stock} minStock={p.minStock} /></td>
                <td className="px-4 py-3 text-center">
                  <span className="font-black text-slate-800 text-sm">{p.stock}</span>
                  <span className="text-[8px] text-slate-400 uppercase font-black ml-1">{p.unit}</span>
                </td>
                <td className="px-4 py-3 text-center font-black text-indigo-600 text-[11px]">{formatCurrency(p.purchasePrice)}</td>
                <td className="px-6 py-3 text-right">
                  <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => setSelectedQRProduct(p)} className="p-2 text-slate-300 hover:text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all" title="Ver QR"><QrCode className="w-4 h-4" /></button>
                    {role !== 'VIEWER' && <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>}
                    {role === 'ADMIN' && <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all" title="Eliminar"><Trash2 className="w-4 h-4" /></button>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white w-full max-w-4xl rounded-[3rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 max-h-[92vh]">
            <div className="px-8 py-5 border-b flex justify-between items-center bg-slate-50/50">
               <div>
                 <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h3>
                 <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-0.5">Control de Inventario Especializado</p>
               </div>
               <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full transition-all"><X className="w-6 h-6 text-slate-400" /></button>
            </div>

            <div className="overflow-y-auto p-8 space-y-8 no-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
                  <div className="md:col-span-4 space-y-4">
                    <div className="aspect-square bg-slate-50 rounded-[2.5rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group shadow-inner transition-all hover:border-indigo-300">
                      {formData.imageUrl ? (
                        <img src={formData.imageUrl} className="w-full h-full object-cover" />
                      ) : (
                        <div className="text-center">
                          <ImageIcon className="text-slate-200 w-16 h-16 mx-auto mb-2" />
                          <p className="text-[8px] font-black text-slate-300 uppercase">Sin Imagen</p>
                        </div>
                      )}
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-indigo-600/80 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[9px] font-black uppercase transition-all backdrop-blur-sm">
                        <Camera className="w-8 h-8 mb-2" /> Cambiar Imagen
                      </button>
                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    </div>
                    {imageInfo && (
                      <div className="bg-indigo-50 p-3 rounded-2xl border border-indigo-100 flex items-center gap-3">
                        <Info className="w-4 h-4 text-indigo-500" />
                        <div>
                          <p className="text-[8px] font-black text-indigo-500 uppercase">Peso: {imageInfo.size}</p>
                          <p className="text-[7px] text-indigo-300 font-bold">OPTIMIZADO PARA WEB</p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Nombre Completo del Producto *</label>
                      <input type="text" required placeholder="EJ: ZAPATILLAS DEPORTIVAS RUNNING" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs uppercase border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Código SKU / QR</label>
                      <input type="text" placeholder="AUTO-GENERADO" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs uppercase border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Marca</label>
                      <input type="text" placeholder="EJ: NIKE, ADIDAS..." className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs uppercase border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Modelo / Referencia</label>
                      <input type="text" placeholder="EJ: AIR MAX 90" className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs uppercase border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Unidad de Medida</label>
                      <select className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-xs uppercase outline-none border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})}>
                        <option value="PAR">PAR (PARA CALZADO)</option>
                        <option value="UND">UNIDAD (UND)</option>
                        <option value="CJ">CAJA (CJ)</option>
                        <option value="PQ">PAQUETE (PQ)</option>
                        <option value="KG">KILOS (KG)</option>
                      </select>
                    </div>
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Almacén de Destino</label>
                    <select required className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-xs uppercase outline-none border-2 border-transparent focus:border-indigo-500 transition-all" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>
                      <option value="" disabled>Seleccione Almacén...</option>
                      {locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Categoría del Producto</label>
                    <select required className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-xs uppercase outline-none border-2 border-transparent focus:border-indigo-500 focus:bg-white transition-all" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                        <option value="" disabled>Seleccione Categoría...</option>
                        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Talla / Medida</label>
                    <input type="text" placeholder="EJ: 42, XL, 38..." className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs uppercase border-2 border-transparent focus:border-indigo-500 transition-all" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} />
                  </div>
               </div>

               <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl">
                  <div className="text-center space-y-2">
                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Stock Inicial</label>
                    <input type="number" className="w-full p-4 bg-white/10 rounded-2xl text-center font-black text-xl outline-none text-white border-2 border-white/5 focus:border-indigo-500 transition-all" value={formData.stock === 0 ? '' : formData.stock} placeholder="0" onChange={e => setFormData({...formData, stock: e.target.value === '' ? 0 : Number(e.target.value)})} disabled={!!editingProduct} />
                  </div>
                  <div className="text-center space-y-2">
                    <label className="text-[9px] font-black text-rose-400 uppercase tracking-widest">Alerta Stock Bajo</label>
                    <input type="number" className="w-full p-4 bg-white/10 rounded-2xl text-center font-black text-xl outline-none text-rose-400 border-2 border-white/5 focus:border-rose-500 transition-all" value={formData.minStock === 0 ? '' : formData.minStock} placeholder="0" onChange={e => setFormData({...formData, minStock: e.target.value === '' ? 0 : Number(e.target.value)})} />
                  </div>
                  <div className="text-center space-y-2">
                    <label className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Costo Unitario</label>
                    <input type="number" step="0.01" className="w-full p-4 bg-white/10 rounded-2xl text-center font-black text-xl outline-none text-emerald-400 border-2 border-white/5 focus:border-emerald-500 transition-all" value={formData.purchasePrice === 0 ? '' : formData.purchasePrice} placeholder="0.00" onChange={e => setFormData({...formData, purchasePrice: e.target.value === '' ? 0 : Number(e.target.value)})} />
                  </div>
               </div>
            </div>

            <div className="px-10 py-6 border-t bg-white flex gap-5 shrink-0">
               <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest hover:bg-slate-50 rounded-2xl transition-all">Descartar</button>
               <button type="submit" disabled={saving} className="flex-[3] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95 disabled:opacity-50">
                  {saving ? <Loader2 className="animate-spin w-5 h-5" /> : <><Save className="w-5 h-5" /> Confirmar Guardado en Base de Datos</>}
               </button>
            </div>
          </form>
        </div>
      )}

      {selectedQRProduct && <ProductQRCode product={selectedQRProduct} onClose={() => setSelectedQRProduct(null)} />}
    </div>
  );
};
