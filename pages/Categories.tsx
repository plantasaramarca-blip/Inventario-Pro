
import React, { useState, useEffect } from 'react';
import { CategoryMaster, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { 
  Plus, Tags, Edit2, Trash2, X, Search, Loader2
} from 'lucide-react';

export const CategoryManagement: React.FC<{ role: Role }> = ({ role }) => {
  const [categories, setCategories] = useState<CategoryMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryMaster | null>(null);
  const [name, setName] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getCategoriesMaster();
      setCategories(data || []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenModal = (cat?: CategoryMaster) => {
    if (cat) { setEditingCat(cat); setName(cat.name); }
    else { setEditingCat(null); setName(''); }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.saveCategoryMaster({ id: editingCat?.id, name });
      setIsModalOpen(false);
      loadData();
    } catch (e) {}
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar esta categoría?')) {
      try {
        await api.deleteCategoryMaster(id);
        loadData();
      } catch (e) {}
    }
  };

  const filtered = categories.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 uppercase tracking-tight">Categorías</h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Clasificación</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">
          <Plus className="w-4 h-4 mr-1" /> Nueva
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
        <input type="text" className="w-full pl-10 pr-10 py-2.5 bg-white border border-slate-100 rounded-xl text-xs outline-none shadow-sm focus:ring-2 focus:ring-indigo-500" placeholder="Buscar categoría..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          <div className="col-span-full py-10 text-center"><Loader2 className="animate-spin mx-auto w-6 h-6 text-indigo-500" /></div>
        ) : filtered.length === 0 ? (
          <div className="col-span-full py-10 text-center text-[10px] font-black uppercase text-slate-300">No hay categorías</div>
        ) : filtered.map(c => (
          <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"><Tags className="w-4 h-4" /></div>
              <p className="text-xs font-bold text-slate-800">{c.name}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleOpenModal(c)} className="p-1.5 text-slate-300 hover:text-indigo-600"><Edit2 className="w-3.5 h-3.5" /></button>
              <button onClick={() => handleDelete(c.id)} className="p-1.5 text-slate-300 hover:text-rose-600"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleSave} className="relative bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
             <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest mb-4">{editingCat ? 'Editar' : 'Nueva'} Categoría</h3>
             <input type="text" autoFocus required className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-sm mb-5 uppercase" value={name} onChange={e => setName(e.target.value)} />
             <div className="flex gap-3">
               <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cancelar</button>
               <button type="submit" disabled={saving} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl">
                 {saving ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Guardar'}
               </button>
             </div>
          </form>
        </div>
      )}
    </div>
  );
};
