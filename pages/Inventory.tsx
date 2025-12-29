import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Product, Role, CategoryMaster, LocationMaster } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { StockBadge } from '../components/StockBadge.tsx';
import { CustomDialog } from '../components/CustomDialog.tsx';
import { formatCurrency } from '../utils/currencyUtils.ts';
import { exportToExcel, exportToPDF } from '../services/excelService.ts';
import { 
  Plus, Search, Edit2, ImageIcon, Loader2, QrCode, X, Save, Camera, FileSpreadsheet, FileText
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

export const Inventory: React.FC<{ role: Role }> = ({ role }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryMaster[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [optimizing, setOptimizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState<any>({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [p, c, l] = await Promise.all([api.getProducts(), api.getCategoriesMaster(), api.getLocationsMaster()]);
      setProducts(p || []);
      setCategories(c || []);
      setLocations(l || []);
    } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenModal = (product?: Product) => {
    if (product) { setEditingProduct(product); setFormData({ ...product }); }
    else {
      setEditingProduct(null);
      setFormData({ 
        code: `SKU-${String(products.length + 1).padStart(4, '0')}`, name: '', brand: '', size: '', model: '',
        category: categories[0]?.name || 'General', location: locations[0]?.name || 'Almacén Principal', 
        stock: 0, minStock: 30, criticalStock: 10, purchasePrice: 0, currency: 'PEN', unit: 'UND', imageUrl: '' 
      });
    }
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOptimizing(true);
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
          setFormData({ ...formData, imageUrl: canvas.toDataURL('image/jpeg', 0.6) });
          setOptimizing(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try { await api.saveProduct(formData); setIsModalOpen(false); loadData(); } catch (err) {} finally { setSaving(false); }
  };

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      <div className="flex justify-between items-center">
        <div><h1 className="text-xl font-black text-slate-900 uppercase">Inventario</h1><p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Maestro de Stock</p></div>
        <div className="flex gap-2">
          <button onClick={() => exportToPDF("REPORTE DE INVENTARIO", [['SKU','PRODUCTO','STOCK','COSTO']], products.map(p=>[p.code,p.name,p.stock,formatCurrency(p.purchasePrice)]), "Inventario")} className="bg-slate-100 text-slate-600 p-2 rounded-lg"><FileText className="w-4 h-4" /></button>
          {role !== 'VIEWER' && <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase flex items-center gap-1.5 shadow-lg shadow-indigo-100"><Plus className="w-3.5 h-3.5" /> Nuevo</button>}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
        <input type="text" className="w-full pl-9 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-xs outline-none shadow-sm focus:ring-1 focus:ring-indigo-500" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm overflow-x-auto no-scrollbar">
        <table className="w-full text-xs min-w-[700px]">
          <thead className="bg-slate-50/50 text-[8px] font-black uppercase text-slate-400 tracking-widest border-b">
            <tr><th className="px-4 py-3 text-left">Producto</th><th className="px-4 py-3 text-center">Estado</th><th className="px-4 py-3 text-center">Stock</th><th className="px-4 py-3 text-center">Costo</th><th className="px-4 py-3 text-right"></th></tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? <tr><td colSpan={5} className="py-10 text-center"><Loader2 className="animate-spin w-6 h-6 mx-auto text-indigo-500" /></td></tr> : filtered.map(p => (
              <tr key={p.id} className="hover:bg-slate-50/40">
                <td className="px-4 py-2"><div className="flex items-center gap-2"><div className="w-8 h-8 bg-slate-50 rounded-lg overflow-hidden border">{p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="w-3.5 h-3.5 text-slate-200 m-auto" />}</div><div><p className="font-bold text-slate-800 text-[10px] uppercase truncate max-w-[120px]">{p.name}</p><p className="text-[7px] text-slate-400 font-black uppercase">{p.code}</p></div></div></td>
                <td className="px-4 py-2 text-center"><StockBadge stock={p.stock} minStock={p.minStock} /></td>
                <td className="px-4 py-2 text-center font-black text-slate-800">{p.stock} <span className="text-[7px] text-slate-400 uppercase">{p.unit}</span></td>
                <td className="px-4 py-2 text-center font-black text-indigo-600">{formatCurrency(p.purchasePrice)}</td>
                <td className="px-4 py-2 text-right">{role !== 'VIEWER' && <button onClick={() => handleOpenModal(p)} className="p-1.5 text-slate-300 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5" /></button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white w-full max-w-2xl rounded-[2rem] overflow-hidden flex flex-col shadow-2xl animate-in zoom-in-95 max-h-[90vh]">
            <div className="px-5 py-3 border-b flex justify-between items-center shrink-0">
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h3>
               <button type="button" onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-50 rounded-lg"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="overflow-y-auto p-5 space-y-4 no-scrollbar">
               <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-4 aspect-square bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group">
                    {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-200 w-8 h-8" />}
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-indigo-600/60 text-white opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-[7px] font-black uppercase transition-all"><Camera className="w-6 h-6 mb-1" /> Cargar</button>
                    <input type="file" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                  </div>
                  <div className="sm:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-0.5"><label className="text-[7px] font-black text-slate-400 uppercase ml-2">Nombre *</label><input type="text" required className="w-full p-2 bg-slate-50 rounded-lg outline-none font-bold text-[10px] uppercase shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                    <div className="space-y-0.5"><label className="text-[7px] font-black text-slate-400 uppercase ml-2">SKU</label><input type="text" className="w-full p-2 bg-slate-50 rounded-lg outline-none font-bold text-[10px] uppercase shadow-inner" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} /></div>
                    <div className="space-y-0.5"><label className="text-[7px] font-black text-slate-400 uppercase ml-2">Marca</label><input type="text" className="w-full p-2 bg-slate-50 rounded-lg outline-none font-bold text-[10px] uppercase shadow-inner" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} /></div>
                    <div className="space-y-0.5"><label className="text-[7px] font-black text-slate-400 uppercase ml-2">Ubicación</label><select className="w-full p-2 bg-slate-50 rounded-lg font-bold text-[10px] uppercase shadow-inner" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>{locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select></div>
                  </div>
               </div>
               <div className="grid grid-cols-3 gap-3 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-50">
                  <div className="text-center"><label className="text-[7px] font-black text-indigo-400 uppercase">Stock</label><input type="number" className="w-full p-2 bg-white rounded-lg text-center font-black text-[10px] outline-none" value={formData.stock || ''} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} disabled={!!editingProduct} /></div>
                  <div className="text-center"><label className="text-[7px] font-black text-rose-400 uppercase">Alerta</label><input type="number" className="w-full p-2 bg-white rounded-lg text-center font-black text-[10px] outline-none" value={formData.criticalStock || ''} onChange={e => setFormData({...formData, criticalStock: Number(e.target.value)})} /></div>
                  <div className="text-center"><label className="text-[7px] font-black text-emerald-400 uppercase">Costo</label><input type="number" step="0.01" className="w-full p-2 bg-white rounded-lg text-center font-black text-[10px] outline-none" value={formData.purchasePrice || ''} onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} /></div>
               </div>
            </div>
            <div className="px-5 py-3 border-t bg-white flex gap-3 shrink-0">
               <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 text-[8px] font-black uppercase text-slate-400">Cancelar</button>
               <button type="submit" disabled={saving} className="flex-[2] py-2 bg-indigo-600 text-white rounded-xl text-[8px] font-black uppercase shadow-lg flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="animate-spin w-3 h-3" /> : <><Save className="w-3 h-3" /> Guardar Producto</>}
               </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};