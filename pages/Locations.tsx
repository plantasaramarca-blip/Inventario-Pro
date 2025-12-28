
import React, { useState, useEffect } from 'https://esm.sh/react@19.2.3';
import { LocationMaster, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { 
  Plus, Warehouse, Edit2, Trash2, X, Search, Loader2, Save, 
  MapPin, CheckCircle 
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

export const LocationManagement: React.FC<{ role: Role }> = ({ role }) => {
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<LocationMaster | null>(null);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setLocations(await api.getLocationsMaster());
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenModal = (loc?: LocationMaster) => {
    if (loc) { setEditingLoc(loc); setName(loc.name); }
    else { setEditingLoc(null); setName(''); }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await api.saveLocationMaster({ id: editingLoc?.id, name });
    setIsModalOpen(false);
    loadData();
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este almacén?')) {
      await api.deleteLocationMaster(id);
      loadData();
    }
  };

  const filtered = locations.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Almacenes</h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Ubicaciones de Mercancía</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg">
          <Plus className="w-4 h-4" /> Nuevo Almacén
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
        <input type="text" className="w-full pl-11 pr-11 py-3 bg-white border border-slate-100 rounded-xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-indigo-500" placeholder="Buscar almacén..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300"><X className="w-4 h-4" /></button>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-indigo-500" /></div>
        ) : filtered.map(l => (
          <div key={l.id} className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"><Warehouse className="w-5 h-5" /></div>
              <div>
                <p className="text-sm font-bold text-slate-800 uppercase tracking-tight">{l.name}</p>
                <div className="flex items-center gap-1 mt-1 text-[8px] font-black text-slate-400 uppercase tracking-widest"><MapPin className="w-2.5 h-2.5" /> Ubicación Activa</div>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleOpenModal(l)} className="p-2 text-slate-300 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(l.id)} className="p-2 text-slate-300 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSave} className="relative bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl">
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">{editingLoc ? 'Editar' : 'Nuevo'} Almacén</h3>
             <input type="text" autoFocus required className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm mb-6 uppercase" value={name} onChange={e => setName(e.target.value.toUpperCase())} />
             <div className="flex gap-3">
               <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase">Cancelar</button>
               <button type="submit" disabled={saving} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">
                 {saving ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Guardar'}
               </button>
             </div>
          </form>
        </div>
      )}
    </div>
  );
};
