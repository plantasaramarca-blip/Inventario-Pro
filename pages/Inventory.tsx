
import React, { useState, useEffect, useMemo, useRef } from 'https://esm.sh/react@19.2.3';
import { Product, Role, CategoryMaster, LocationMaster } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { StockBadge } from '../components/StockBadge.tsx';
import { ProductQRCode } from '../components/ProductQRCode.tsx';
import { formatCurrency } from '../utils/currencyUtils.ts';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';
import html2canvas from 'https://esm.sh/html2canvas@1.4.1';
import { exportToExcel, exportToPDF } from '../services/excelService.ts';
import { 
  Plus, Search, Edit2, ImageIcon, Loader2, QrCode, Settings2,
  X, Trash2, Save, Package, Camera, AlertTriangle, CheckCircle,
  Database, Zap, ArrowRight, Printer, CheckSquare, Square, FileSpreadsheet, FileText
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

interface InventoryProps { role: Role; }

export const Inventory: React.FC<InventoryProps> = ({ role }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryMaster[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOptimizing, setIsOptimizing] = useState(false); 
  const [optStats, setOptStats] = useState({ original: '0KB', compressed: '0KB', percent: 0 });
  const [saving, setSaving] = useState(false);
  const [isPrintingBulk, setIsPrintingBulk] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedProductForQR, setSelectedProductForQR] = useState<Product | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState<any>({
    code: '', name: '', brand: '', size: '', model: '', 
    category: 'General', location: 'Almacén 1', stock: 0, 
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
    } catch (e) { 
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const handleExportExcel = () => {
    const data = products.map(p => ({
      SKU: p.code,
      Producto: p.name,
      Categoría: p.category,
      Ubicación: p.location,
      Stock: p.stock,
      Unidad: p.unit,
      'Costo Unit.': p.purchasePrice,
      'Valor Total': p.stock * p.purchasePrice
    }));
    exportToExcel(data, `Inventario_${new Date().toLocaleDateString()}`, 'Productos');
  };

  const handleExportPDF = () => {
    const headers = [['SKU', 'Producto', 'Categoría', 'Ubicación', 'Stock', 'Costo']];
    const body = products.map(p => [
      p.code, p.name, p.category, p.location, `${p.stock} ${p.unit}`, formatCurrency(p.purchasePrice, p.currency)
    ]);
    exportToPDF('Reporte de Inventario General', headers, body, `Inventario_${new Date().getTime()}`);
  };

  const handleBulkPrint = async () => {
    if (selectedIds.size === 0) return;
    setIsPrintingBulk(true);
    showToast(`Generando ${selectedIds.size} etiquetas...`);
    
    try {
      const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: [50, 30], compress: false });
      const selectedProducts = products.filter(p => selectedIds.has(p.id));

      for (let i = 0; i < selectedProducts.length; i++) {
        const p = selectedProducts[i];
        const tempDiv = document.createElement('div');
        tempDiv.style.width = '188px';
        tempDiv.style.height = '113px';
        tempDiv.style.padding = '8px';
        tempDiv.style.display = 'flex';
        tempDiv.style.flexDirection = 'column';
        tempDiv.style.alignItems = 'center';
        tempDiv.style.justifyContent = 'space-between';
        tempDiv.style.backgroundColor = 'white';
        tempDiv.style.position = 'absolute';
        tempDiv.style.left = '-9999px';
        tempDiv.style.border = '1px solid #000';
        
        const qrUrl = `${window.location.origin}?action=quick_move&id=${p.id}`;
        
        tempDiv.innerHTML = `
          <div style="margin-top:2px"><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrUrl)}" style="width:75px;height:75px" /></div>
          <div style="text-align:center;width:100%;margin-bottom:2px">
            <p style="font-family:sans-serif;font-size:10px;font-weight:900;text-transform:uppercase;margin:0;padding:0;line-height:1.1;color:#000;height:22px;overflow:hidden">${p.name}</p>
            <p style="font-family:sans-serif;font-size:14px;font-weight:900;color:#4f46e5;margin:2px 0 0 0;padding:0;letter-spacing:1px">${p.code}</p>
          </div>
        `;
        
        document.body.appendChild(tempDiv);
        const canvas = await html2canvas(tempDiv, { scale: 5, backgroundColor: '#ffffff' });
        const imgData = canvas.toDataURL('image/png', 1.0);
        
        if (i > 0) pdf.addPage([50, 30], 'l');
        pdf.addImage(imgData, 'PNG', 0, 0, 50, 30, undefined, 'FAST');
        document.body.removeChild(tempDiv);
      }
      
      pdf.save(`ETIQUETAS_LOTE_${new Date().getTime()}.pdf`);
      showToast("Etiquetas generadas en HQ");
      setSelectedIds(new Set());
    } catch (e) {
      showToast("Error en impresión masiva", "error");
    } finally {
      setIsPrintingBulk(false);
    }
  };

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
        stock: 0, minStock: 30, criticalStock: 10, purchasePrice: 0, 
        currency: 'PEN', unit: 'und', imageUrl: '' 
      });
    }
    setIsModalOpen(true);
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
          const compressedData = canvas.toDataURL('image/jpeg', 0.6);
          setFormData({ ...formData, imageUrl: compressedData });
          setIsOptimizing(false);
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
      showToast(editingProduct ? "Actualizado" : "Guardado");
      setIsModalOpen(false);
      loadData();
    } catch (err: any) { 
      showToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.code.toLowerCase().includes(search.toLowerCase())
    );
  }, [products, search]);

  return (
    <div className="space-y-4 pb-20 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Catálogo de Productos</h1>
          <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mt-0.5">Gestión de Stock</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={handleExportExcel} className="bg-emerald-50 text-emerald-700 p-3 rounded-xl hover:bg-emerald-100 border border-emerald-100 transition-all flex items-center gap-2 text-[9px] font-black uppercase">
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
          <button onClick={handleExportPDF} className="bg-rose-50 text-rose-700 p-3 rounded-xl hover:bg-rose-100 border border-rose-100 transition-all flex items-center gap-2 text-[9px] font-black uppercase">
            <FileText className="w-4 h-4" /> PDF
          </button>
          {selectedIds.size > 0 && (
            <button onClick={handleBulkPrint} disabled={isPrintingBulk} className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg animate-in zoom-in">
              {isPrintingBulk ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              Etiquetas ({selectedIds.size})
            </button>
          )}
          {role !== 'VIEWER' && (
            <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
              <Plus className="w-4 h-4" /> Nuevo
            </button>
          )}
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
        <input type="text" className="w-full pl-11 pr-11 py-3 bg-white border border-slate-100 rounded-xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-indigo-500" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-sm min-w-[650px]">
            <thead className="bg-slate-50/50 text-[9px] font-black uppercase text-slate-400 tracking-widest">
              <tr>
                <th className="px-6 py-5 text-left w-10">
                   <button onClick={() => setSelectedIds(selectedIds.size === filteredProducts.length ? new Set() : new Set(filteredProducts.map(p => p.id)))}>
                      {selectedIds.size === filteredProducts.length ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4" />}
                   </button>
                </th>
                <th className="px-2 py-5 text-left">Producto</th>
                <th className="px-4 py-5 text-center">Estado</th>
                <th className="px-4 py-5 text-center">Stock</th>
                <th className="px-4 py-5 text-center">Costo</th>
                <th className="px-6 py-5 text-right">Opciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-500 mx-auto" /></td></tr>
              ) : filteredProducts.map(p => (
                <tr key={p.id} className={`hover:bg-slate-50/30 transition-colors ${selectedIds.has(p.id) ? 'bg-indigo-50/20' : ''}`}>
                  <td className="px-6 py-4">
                     <button onClick={() => toggleSelect(p.id)} className="p-1">
                        {selectedIds.has(p.id) ? <CheckSquare className="w-4 h-4 text-indigo-600" /> : <Square className="w-4 h-4 text-slate-300" />}
                     </button>
                  </td>
                  <td className="px-2 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100 overflow-hidden">
                        {p.imageUrl ? <img src={p.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-200 w-5 h-5" />}
                      </div>
                      <div className="max-w-[180px]">
                        <p className="font-bold text-slate-800 text-xs truncate">{p.name}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">{p.code}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center"><StockBadge stock={p.stock} minStock={p.minStock} criticalStock={p.criticalStock} /></td>
                  <td className="px-4 py-4 text-center font-black text-slate-800 text-xs">{p.stock} {p.unit}</td>
                  <td className="px-4 py-4 text-center font-black text-indigo-600 text-xs">{formatCurrency(p.purchasePrice, p.currency)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setSelectedProductForQR(p); setShowQRModal(true); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg"><QrCode className="w-4 h-4" /></button>
                      {role !== 'VIEWER' && <button onClick={() => handleOpenModal(p)} className="p-2 text-slate-400 hover:text-indigo-600 rounded-lg"><Edit2 className="w-4 h-4" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-[2.5rem] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter">{editingProduct ? 'Editar' : 'Nuevo'} Producto</h3>
               <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-50 rounded-xl"><X className="w-5 h-5 text-slate-400" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6 no-scrollbar">
               <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-2">
                    <div className="aspect-square bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 flex flex-col items-center justify-center relative overflow-hidden group">
                      {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" /> : <ImageIcon className="text-slate-200 w-10 h-10" />}
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-indigo-600/60 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center font-black uppercase text-[10px]"><Camera className="w-6 h-6 mr-2" /> Cambiar</button>
                      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
                    </div>
                  </div>
                  <div className="md:col-span-2 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Nombre *</label><input type="text" required className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Marca</label><input type="text" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm" value={formData.brand} onChange={e => setFormData({...formData, brand: e.target.value})} /></div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="space-y-1"><label className="text-[9px] font-black text-indigo-500 uppercase">Talla</label><input type="text" className="w-full p-4 bg-indigo-50 text-indigo-700 rounded-2xl outline-none font-black text-sm" value={formData.size} onChange={e => setFormData({...formData, size: e.target.value})} /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">SKU / Código</label><input type="text" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-black text-xs" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} /></div>
                      <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Ubicación</label><select className="w-full p-4 bg-slate-50 rounded-2xl font-bold text-xs" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})}>{locations.map(l => <option key={l.id} value={l.name}>{l.name}</option>)}</select></div>
                    </div>
                  </div>
               </div>
               <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-[2.5rem]">
                  <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Stock Ini.</label><input type="number" className="w-full p-3 bg-white rounded-xl text-center font-black text-sm" value={formData.stock} onChange={e => setFormData({...formData, stock: Number(e.target.value)})} disabled={!!editingProduct} /></div>
                  <div className="space-y-1"><label className="text-[8px] font-black text-slate-400 uppercase">Unidad</label><input type="text" className="w-full p-3 bg-white rounded-xl text-center font-bold text-xs" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} /></div>
                  <div className="space-y-1"><label className="text-[8px] font-black text-rose-400 uppercase">Pto. Crítico</label><input type="number" className="w-full p-3 bg-white text-rose-600 rounded-xl text-center font-black text-sm" value={formData.criticalStock} onChange={e => setFormData({...formData, criticalStock: Number(e.target.value)})} /></div>
                  <div className="space-y-1"><label className="text-[8px] font-black text-indigo-400 uppercase">Costo S/</label><input type="number" step="0.01" className="w-full p-3 bg-indigo-50 text-indigo-700 rounded-xl text-center font-black text-sm" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: Number(e.target.value)})} /></div>
               </div>
            </div>
            <div className="p-5 sm:p-6 border-t border-slate-100 flex gap-3 shrink-0">
               <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400">Cancelar</button>
               <button type="submit" disabled={saving} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <><Save className="w-4 h-4" /> Guardar Producto</>}
               </button>
            </div>
          </form>
        </div>
      )}

      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border animate-in slide-in-from-right-10 ${toast.type === 'success' ? 'bg-white border-emerald-100 text-emerald-800' : 'bg-rose-600 text-white'}`}>
           <CheckCircle className="w-5 h-5 text-emerald-500" />
           <p className="text-[10px] font-black uppercase tracking-tight">{toast.msg}</p>
        </div>
      )}

      {showQRModal && selectedProductForQR && <ProductQRCode product={selectedProductForQR} onClose={() => { setShowQRModal(false); setSelectedProductForQR(null); }} />}
    </div>
  );
};
