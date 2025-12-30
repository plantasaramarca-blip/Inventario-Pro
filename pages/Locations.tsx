
import React, { useState, useEffect } from 'react';
import { LocationMaster, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { useNotification } from '../contexts/NotificationContext.tsx';
import { CustomDialog } from '../components/CustomDialog.tsx';
import { 
  Plus, Warehouse, Edit2, Trash2, X, Search, Loader2, MapPin
} from 'lucide-react';

export const LocationManagement: React.FC<{ role: Role }> = ({ role }) => {
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLoc, setEditingLoc] = useState<LocationMaster | null>(null);
  const [locToDelete, setLocToDelete] = useState<LocationMaster | null>(null);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const { addNotification } = useNotification();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getLocationsMaster();
      setLocations(data || []);
    } catch (e) {
      addNotification("Error al cargar almacenes.", "error");
    }
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
    try {
      await api.saveLocationMaster({ id: editingLoc?.id, name });
      setIsModalOpen(false);
      loadData();
      addNotification("Almacén guardado.", "success");
    } catch (e) {
      addNotification("Error al guardar.", "error");
    }
    setSaving(false);
  };

  const handleConfirmDelete = async () => {
    if (!locToDelete) return;
    try {
      await api.deleteLocationMaster(locToDelete.id);
      loadData();
      addNotification(`Almacén "${locToDelete.name}" eliminado.`, "success");
    } catch (e) {
      addNotification("Error al eliminar.", "error");
    } finally {
      setLocToDelete(null);
    }
  };

  const filtered = locations.filter(l => l.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Almacenes</h1>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Ubicaciones de Stock</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
          <Plus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
        <input type="text" className="w-full pl-12 pr-12 py-4 bg-white border border-slate-100 rounded-2xl text-xs outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all font-bold" placeholder="Buscar almacén..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"><X className="w-3 h-3 text-slate-400" /></button>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-10 text-center"><Loader2 className="animate-spin mx-auto w-6 h-6 text-indigo-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-10 text-center text-[10px] font-black uppercase text-slate-300">No hay almacenes</div>
        ) : filtered.map(l => (
          <div key={l.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"><Warehouse className="w-5 h-5" /></div>
              <div>
                <p className="text-xs font-bold text-slate-800 uppercase tracking-tight">{l.name}</p>
              </div>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleOpenModal(l)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => setLocToDelete(l)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleSave} className="relative bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-6">{editingLoc ? 'Editar' : 'Nuevo'} Almacén</h3>
             <input type="text" autoFocus required className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-sm mb-6 uppercase" value={name} onChange={e => setName(e.target.value.toUpperCase())} />
             <div className="flex gap-3">
               <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Cancelar</button>
               <button type="submit" disabled={saving} className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">
                 {saving ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Guardar'}
               </button>
             </div>
          </form>
        </div>
      )}

      <CustomDialog
        isOpen={!!locToDelete}
        title="Confirmar Eliminación"
        message={`¿Eliminar el almacén "${locToDelete?.name}"?`}
        type="error"
        onConfirm={handleConfirmDelete}
        onCancel={() => setLocToDelete(null)}
        confirmText="Sí, Eliminar"
      />
    </div>
  );
};
