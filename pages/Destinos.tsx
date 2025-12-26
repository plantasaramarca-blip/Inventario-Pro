
import React, { useState, useEffect } from 'https://esm.sh/react@19.2.3';
import { Destination, DestinationType } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { 
  Plus, MapPin, Building2, ShoppingBag, UserCheck, Edit2, 
  Trash2, X, Search, Loader2, MoreVertical, 
  ToggleLeft, ToggleRight
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

export const Destinos: React.FC = () => {
  const [destinos, setDestinos] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState<Partial<Destination>>({
    name: '', type: 'sucursal', description: '', active: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      setDestinos(await api.getDestinos());
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.saveDestino(formData);
    setIsModalOpen(false);
    loadData();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Puntos de Costo</h1>
        <button onClick={() => setIsModalOpen(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100">+ Nuevo</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-indigo-500" /></div>
        ) : destinos.map(d => (
          <div key={d.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
             <div className="flex justify-between mb-4">
                <MapPin className="text-indigo-600" />
                <span className={`text-[8px] font-black uppercase px-2 py-1 rounded ${d.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                  {d.active ? 'Activo' : 'Inactivo'}
                </span>
             </div>
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{d.name}</h3>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{d.type}</p>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
             <h3 className="text-xl font-black text-slate-800 uppercase mb-8">Nuevo Destino</h3>
             <div className="space-y-4">
                <input type="text" placeholder="Nombre" required className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                <select className="w-full p-4 bg-slate-50 rounded-2xl font-bold" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                  <option value="sucursal">Sucursal</option>
                  <option value="cliente">Cliente</option>
                  <option value="interno">Consumo Interno</option>
                </select>
                <div className="flex gap-4 mt-6">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 text-[10px] font-black uppercase text-slate-400">Cancelar</button>
                   <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Guardar</button>
                </div>
             </div>
          </form>
        </div>
      )}
    </div>
  );
};
