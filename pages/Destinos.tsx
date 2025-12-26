
import React, { useState, useEffect } from 'react';
import { Destination, DestinationType } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { 
  Plus, MapPin, Building2, ShoppingBag, UserCheck, Edit2, 
  Trash2, Check, X, Search, Loader2, Info, MoreVertical, 
  AlertCircle, ToggleLeft, ToggleRight
} from 'lucide-react';

export const Destinos: React.FC = () => {
  const [destinos, setDestinos] = useState<Destination[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingDestino, setEditingDestino] = useState<Destination | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<Destination>>({
    name: '',
    type: 'sucursal',
    description: '',
    active: true
  });

  const loadData = async () => {
    setLoading(true);
    try {
      setDestinos(await api.getDestinos());
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenModal = (d?: Destination) => {
    if (d) {
      setEditingDestino(d);
      setFormData(d);
    } else {
      setEditingDestino(null);
      setFormData({ name: '', type: 'sucursal', description: '', active: true });
    }
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.saveDestino(formData);
    setIsModalOpen(false);
    loadData();
  };

  const handleToggleActive = async (destino: Destination) => {
    await api.saveDestino({ ...destino, active: !destino.active });
    loadData();
    setActiveMenu(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este destino permanentemente? Esta acción no se puede deshacer.')) return;
    
    try {
      await api.deleteDestino(id);
      loadData();
      setActiveMenu(null);
    } catch (error: any) {
      alert(error.message || 'Error al eliminar');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'cliente': return <ShoppingBag className="w-4 h-4" />;
      case 'sucursal': return <Building2 className="w-4 h-4" />;
      case 'interno': return <UserCheck className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'cliente': return "bg-blue-50 text-blue-600 border-blue-100";
      case 'sucursal': return "bg-emerald-50 text-emerald-700 border-emerald-100";
      case 'interno': return "bg-slate-50 text-slate-600 border-slate-100";
      default: return "bg-slate-50 text-slate-600 border-slate-100";
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Centros de Costo</h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Gestione sucursales, clientes y puntos de consumo interno.</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">
          <Plus className="w-4 h-4 mr-2" /> Nuevo Destino
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 relative shadow-sm">
        <Search className="absolute left-8 top-7 w-4 h-4 text-slate-300" />
        <input 
          type="text" 
          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium" 
          placeholder="Buscar centro de costo o sucursal..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-20 text-center">
            <Loader2 className="animate-spin w-10 h-10 mx-auto text-indigo-500" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Cargando Directorio...</p>
          </div>
        ) : destinos.length === 0 ? (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-200">
             <MapPin className="w-12 h-12 text-slate-200 mx-auto mb-4" />
             <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">No hay destinos registrados</p>
             <button onClick={() => handleOpenModal()} className="mt-4 text-[10px] font-black text-indigo-600 uppercase hover:underline">Crear el primero ahora</button>
          </div>
        ) : destinos.filter(d => d.name.toLowerCase().includes(search.toLowerCase())).map(d => (
          <div key={d.id} className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative ${!d.active ? 'opacity-50 grayscale' : ''}`}>
             
             <div className="absolute top-6 right-6">
                <button 
                  onClick={() => setActiveMenu(activeMenu === d.id ? null : d.id)}
                  className="p-2 text-slate-300 hover:text-slate-600 rounded-lg"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>
                
                {activeMenu === d.id && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-100 z-10 overflow-hidden animate-in zoom-in-95 duration-150">
                    <button onClick={() => handleOpenModal(d)} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 flex items-center">
                      <Edit2 className="w-3.5 h-3.5 mr-3 text-indigo-500" /> Editar
                    </button>
                    <button onClick={() => handleToggleActive(d)} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase text-slate-600 hover:bg-slate-50 flex items-center">
                      {d.active ? <ToggleRight className="w-3.5 h-3.5 mr-3 text-emerald-500" /> : <ToggleLeft className="w-3.5 h-3.5 mr-3 text-slate-400" />}
                      {d.active ? 'Desactivar' : 'Activar'}
                    </button>
                    <div className="h-[1px] bg-slate-100"></div>
                    <button onClick={() => handleDelete(d.id)} className="w-full text-left px-4 py-3 text-[10px] font-black uppercase text-rose-600 hover:bg-rose-50 flex items-center">
                      <Trash2 className="w-3.5 h-3.5 mr-3" /> Eliminar
                    </button>
                  </div>
                )}
             </div>

             <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl border ${getTypeColor(d.type)}`}>
                  {getTypeIcon(d.type)}
                </div>
                <div className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${d.active ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                  {d.active ? 'Activo' : 'Inactivo'}
                </div>
             </div>
             
             <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-1">{d.name}</h3>
                <div className="flex items-center text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                   <span className="mr-2 px-1.5 py-0.5 bg-slate-100 rounded">{d.type}</span>
                </div>
                {d.description && (
                  <p className="text-xs text-slate-500 font-medium line-clamp-2 italic leading-relaxed">
                    "{d.description}"
                  </p>
                )}
             </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl overflow-y-auto max-h-[90vh]">
             <div className="flex items-center space-x-3 mb-8">
               <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg">
                 <Building2 className="w-6 h-6" />
               </div>
               <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingDestino ? 'Editar' : 'Nuevo'} Destino</h3>
             </div>

             <div className="space-y-5">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del Punto</label>
                  <input type="text" placeholder="Ej: Sucursal Centro / Lima" required className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-bold" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Entidad</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['cliente', 'sucursal', 'interno'].map(t => (
                      <button 
                        key={t}
                        type="button"
                        onClick={() => setFormData({...formData, type: t as DestinationType})}
                        className={`py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${formData.type === t ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 text-slate-400 border-transparent hover:bg-slate-100'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción / Referencia</label>
                  <textarea 
                    placeholder="Detalles sobre este destino..." 
                    className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 font-medium text-sm min-h-[100px]" 
                    value={formData.description || ''} 
                    onChange={e => setFormData({...formData, description: e.target.value})}
                  />
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <input type="checkbox" id="dest-active" className="w-4 h-4 rounded text-indigo-600" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                  <label htmlFor="dest-active" className="text-xs font-bold text-slate-600 uppercase tracking-tight cursor-pointer">Destino habilitado para despachos</label>
                </div>

                <div className="flex gap-4 pt-6">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 text-[10px] font-black uppercase tracking-widest text-slate-400">Cancelar</button>
                   <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Guardar Destino</button>
                </div>
             </div>
          </form>
        </div>
      )}
    </div>
  );
};
