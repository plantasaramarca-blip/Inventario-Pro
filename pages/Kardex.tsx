
import React, { useState, useEffect, useMemo } from 'react';
import { Movement, Product, TransactionType, Destination, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { exportToExcel, exportToPDF } from '../services/excelService.ts';
import { CustomDialog } from '../components/CustomDialog.tsx';
import { 
  ArrowDownCircle, ArrowUpCircle, User, 
  Calendar, Loader2, X, MapPin, Building2, ShoppingBag, 
  Info, AlertTriangle, ArrowRight, Truck, Package, 
  Check, CheckCircle, Search, Trash2, Plus, ArrowUp, ArrowDown, FileSpreadsheet, FileText
} from 'lucide-react';

interface KardexProps {
  role: Role;
  userEmail?: string;
  initialProductId?: string;
}

interface CartItem {
  productId: string;
  name: string;
  code: string;
  quantity: number;
  stock: number;
}

export const Kardex: React.FC<KardexProps> = ({ role, userEmail, initialProductId }) => {
  const [movements, setMovements] = useState<Movement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [destinos, setDestinos] = useState<Destination[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [dialog, setDialog] = useState<{isOpen: boolean, title: string, message: string, type: any} | null>(null);
  
  const [type, setType] = useState<TransactionType>('SALIDA');
  const [productSearch, setProductSearch] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [selectedDestinoId, setSelectedDestinoId] = useState('');
  const [carriedBy, setCarriedBy] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const showDialog = (title: string, message: string, type: 'success' | 'error' | 'alert' = 'success') => {
    setDialog({ isOpen: true, title, message, type });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [m, p, d] = await Promise.allSettled([
        api.getMovements(), 
        api.getProducts(),
        api.getDestinos()
      ]);
      setMovements(m.status === 'fulfilled' ? m.value : []);
      setProducts(p.status === 'fulfilled' ? p.value : []);
      const allDestinos = d.status === 'fulfilled' ? d.value : [];
      setDestinos(allDestinos.filter((dest: any) => dest.active));

      if (initialProductId && p.status === 'fulfilled') {
        const prod = (p.value as Product[]).find(prod => prod.id === initialProductId);
        if (prod) {
          setType('SALIDA');
          setCartItems([{ productId: prod.id, name: prod.name, code: prod.code, quantity: 1, stock: prod.stock }]);
          setIsModalOpen(true);
        }
      }
    } catch (e) {
      showDialog("Conexión", "Error al sincronizar datos de Kardex", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [initialProductId]);

  const handleExportExcel = () => {
    const data = movements.map(m => ({
      Fecha: new Date(m.date).toLocaleString(),
      Producto: m.productName,
      Tipo: m.type,
      Cantidad: m.quantity,
      Responsable: m.dispatcher,
      Motivo: m.reason,
      'Centro de Costo': m.destinationName || '-',
      'Stock Final': m.balanceAfter
    }));
    exportToExcel(data, `Kardex_${new Date().toLocaleDateString()}`, 'Movimientos');
  };

  const handleExportPDF = () => {
    const headers = [['Fecha', 'Producto', 'Tipo', 'Cant', 'Responsable', 'Saldo']];
    const body = movements.map(m => [
      new Date(m.date).toLocaleString(), m.productName, m.type, m.quantity, m.dispatcher, m.balanceAfter
    ]);
    exportToPDF('Historial de Movimientos - Kardex', headers, body, `Kardex_${new Date().getTime()}`);
  };

  const handleOpenModal = (trxType: TransactionType) => {
    if (role === 'VIEWER') return;
    setType(trxType);
    setCartItems([]);
    setSelectedDestinoId('');
    setCarriedBy('');
    setReason('');
    setProductSearch('');
    setError('');
    setIsModalOpen(true);
  };

  const filteredProducts = useMemo(() => {
    if (!productSearch) return [];
    return products.filter(p => 
      p.name.toLowerCase().includes(productSearch.toLowerCase()) || 
      p.code.toLowerCase().includes(productSearch.toLowerCase())
    ).slice(0, 8);
  }, [products, productSearch]);

  const addToCart = (p: Product) => {
    if (cartItems.find(i => i.productId === p.id)) return;
    setCartItems([...cartItems, { productId: p.id, name: p.name, code: p.code, quantity: 1, stock: p.stock }]);
    setProductSearch('');
    setIsSearchOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    if (cartItems.length === 0) return setError("Agregar productos");
    if (type === 'SALIDA' && (!selectedDestinoId || !carriedBy.trim())) return setError("Completar datos obligatorios");
    
    setSaving(true);
    try {
      const destinoObj = destinos.find(d => d.id === selectedDestinoId);
      const batchPayload = cartItems.map(item => ({
        productId: item.productId,
        type,
        quantity: item.quantity,
        dispatcher: userEmail,
        reason: type === 'SALIDA' ? `${reason} (Retira: ${carriedBy})` : reason,
        destinationName: destinoObj?.name
      }));
      await api.registerBatchMovements(batchPayload);
      showDialog("Operación Exitosa", `Se han procesado ${cartItems.length} ítems correctamente`, "success");
      setIsModalOpen(false);
      loadData();
    } catch (err: any) { 
      showDialog("Fallo en Sistema", err.message, "error");
    }
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Kardex de Movimientos</h1>
          <p className="text-xs text-slate-500 font-black uppercase tracking-widest mt-0.5">Control Logístico</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button onClick={handleExportExcel} className="bg-emerald-50 text-emerald-700 p-3 rounded-xl border border-emerald-100 flex items-center gap-2 text-[9px] font-black uppercase shadow-sm"><FileSpreadsheet className="w-4 h-4" /> Excel</button>
          <button onClick={handleExportPDF} className="bg-rose-50 text-rose-700 p-3 rounded-xl border border-rose-100 flex items-center gap-2 text-[9px] font-black uppercase shadow-sm"><FileText className="w-4 h-4" /> PDF</button>
          {role !== 'VIEWER' && (
            <div className="flex gap-1 bg-white p-1 rounded-2xl shadow-sm border border-slate-100">
              <button onClick={() => handleOpenModal('INGRESO')} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all">Stock Entrada</button>
              <button onClick={() => handleOpenModal('SALIDA')} className="bg-rose-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all">Stock Despacho</button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-100">
              <tr>
                <th className="px-6 py-5 text-left">Fecha</th>
                <th className="px-6 py-5 text-left">Producto</th>
                <th className="px-6 py-5 text-center">Cant.</th>
                <th className="px-6 py-5 text-left">Autorizó / Recibió</th>
                <th className="px-6 py-5 text-center">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto" /></td></tr>
              ) : movements.length === 0 ? (
                <tr><td colSpan={5} className="py-20 text-center text-slate-400 font-black uppercase text-[10px]">No hay movimientos registrados</td></tr>
              ) : movements.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4 text-[9px] font-bold text-slate-500 uppercase">{new Date(m.date).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`p-1.5 rounded-lg ${m.type === 'INGRESO' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                        {m.type === 'INGRESO' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 text-xs">{m.productName}</p>
                        <p className="text-[9px] text-slate-400 font-black uppercase truncate max-w-[150px]">{m.type === 'SALIDA' ? `Dest: ${m.destinationName || 'Interno'}` : 'Entrada Almacén'}</p>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 text-center font-black text-sm ${m.type === 'INGRESO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {m.type === 'INGRESO' ? '+' : '-'}{m.quantity}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-[10px] font-black text-indigo-500 uppercase leading-none">{m.dispatcher}</p>
                    {m.reason && <p className="text-[9px] text-slate-400 font-bold mt-1 truncate max-w-[200px]">{m.reason}</p>}
                  </td>
                  <td className="px-6 py-4 text-center"><span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-black text-slate-700">{m.balanceAfter}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
