
import React, { useState, useEffect } from 'react';
import { Destination } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { 
  Plus, MapPin, Edit2, X, Search, Loader2, AlertCircle, Trash2
} from 'lucide-react';

export const Destinos: React.FC = () => {
  const [destinos, setDestinos] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  
  const [formData, setFormData] = useState<Partial<Destination>>({
    name: '', type: 'sucursal', description: '', active: true
  });

  const loadData = async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await api.getDestinos();
      setDestinos(data || []);
    } catch (e) {
      console.error("Error al cargar centros de costos:", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.saveDestino(formData);
    setIsModalOpen(false);
    loadData();
  };

  const filteredDestinos = destinos.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Centros de Costos</h1>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Destinos de Mercancía</p>
        </div>
        <button onClick={() => { setFormData({name: '', type: 'sucursal', description: '', active: true}); setIsModalOpen(true); }} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"><Plus className="w-4 h-4" /> NUEVO</button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
        <input 
          type="text" 
          placeholder="Buscar centro de costo..." 
          className="w-full pl-12 pr-12 py-4 bg-white border border-slate-100 rounded-2xl text-xs outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all font-bold"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"><X className="w-3 h-3 text-slate-400" /></button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-indigo-500" /></div>
        ) : error ? (
           <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-rose-100 p-8 shadow-sm">
            <AlertCircle className="mx-auto w-10 h-10 text-rose-500 mb-3" />
            <p className="text-[10px] font-black text-slate-600 uppercase mb-4">Error al conectar con la base de datos</p>
            <button onClick={loadData} className="bg-slate-900 text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase">Reintentar</button>
          </div>
        ) : filteredDestinos.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border border-dashed border-slate-200">
            <MapPin className="mx-auto w-10 h-10 text-slate-200 mb-3" />
            <p className="text-[10px] font-black text-slate-400 uppercase">No hay centros de costos registrados</p>
          </div>
        ) : filteredDestinos.map(d => (
          <div key={d.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-shadow">
             <div>
               <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <span className={`text-[8px] font-black uppercase px-2.5 py-1 rounded-lg ${d.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
                    {d.active ? 'Activo' : 'Inactivo'}
                  </span>
               </div>
               <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight leading-tight">{d.name}</h3>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5">{d.type}</p>
             </div>
             <div className="mt-6 pt-4 border-t border-slate-50 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => { setFormData(d); setIsModalOpen(true); }} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit2 className="w-4 h-4" /></button>
             </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Centro de Costo</h3>
                <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="text-slate-400 w-5 h-5" /></button>
             </div>
             <div className="space-y-4">
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre</label>
                   <input type="text" required className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-sm uppercase" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>
                <div className="space-y-1">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo</label>
                   <select className="w-full p-4 bg-slate-100 rounded-2xl font-bold text-sm outline-none uppercase" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value as any})}>
                    <option value="sucursal">Sucursal</option>
                    <option value="cliente">Cliente</option>
                    <option value="interno">Interno</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 p-3 rounded-2xl">
                    <label htmlFor="active-toggle" className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</label>
                    <input type="checkbox" id="active-toggle" className="hidden" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                    <label htmlFor="active-toggle" className={`cursor-pointer px-4 py-2 rounded-xl text-xs font-bold ${formData.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-500'}`}>
                        {formData.active ? 'Activo' : 'Inactivo'}
                    </label>
                </div>
                <div className="flex gap-4 pt-4">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400">Cancelar</button>
                   <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">Guardar</button>
                </div>
             </div>
          </form>
        </div>
      )}
    </div>
  );
};
