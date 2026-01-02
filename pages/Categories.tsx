
import React, { useState, useEffect } from 'react';
import { CategoryMaster, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { useNotification } from '../contexts/NotificationContext.tsx';
import { CustomDialog } from '../components/CustomDialog.tsx';
import { 
  Plus, Tags, Edit2, Trash2, X, Search, Loader2
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

interface CategoryManagementProps {
  role: Role;
  categories: CategoryMaster[] | null;
  setCategories: (data: CategoryMaster[]) => void;
  onCacheClear: (keys: Array<'categories'>) => void;
}

export const CategoryManagement: React.FC<CategoryManagementProps> = ({ role, categories, setCategories, onCacheClear }) => {
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryMaster | null>(null);
  const [catToDelete, setCatToDelete] = useState<CategoryMaster | null>(null);
  const [name, setName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const { addNotification } = useNotification();

  useEffect(() => {
    const loadData = async () => {
      if (categories === null) {
        setLoading(true);
        try {
          const data = await api.getCategoriesMaster();
          setCategories(data || []);
        } catch (e) {
          addNotification("Error al cargar categorías.", "error");
        } finally {
          setLoading(false);
        }
      }
    };
    loadData();
  }, [categories]);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

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
      onCacheClear(['categories']);
      addNotification("Categoría guardada.", "success");
    } catch (e) {
      addNotification("Error al guardar.", "error");
    }
    setSaving(false);
  };

  const handleConfirmDelete = async () => {
    if (!catToDelete) return;
    try {
      await api.deleteCategoryMaster(catToDelete.id);
      onCacheClear(['categories']);
      addNotification(`Categoría "${catToDelete.name}" eliminada.`, 'success');
    } catch (e) {
      addNotification("Error al eliminar.", "error");
    } finally {
      setCatToDelete(null);
    }
  };
  
  if (loading || categories === null) {
    return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-500" /></div>;
  }

  const filtered = categories.filter(c => c.name.toLowerCase().includes(debouncedSearchTerm.toLowerCase()));

  return (
    <div className="space-y-4 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Categorías</h1>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Clasificación de Productos</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
          <Plus className="w-4 h-4" /> Nueva
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
        <input type="text" className="w-full pl-12 pr-12 py-4 bg-white border border-slate-100 rounded-2xl text-xs outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all font-bold" placeholder="Buscar categoría..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        {searchTerm && <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"><X className="w-3 h-3 text-slate-400" /></button>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full py-10 text-center text-[10px] font-black uppercase text-slate-300">No hay categorías</div>
        ) : filtered.map(c => (
          <div key={c.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors"><Tags className="w-5 h-5" /></div>
              <p className="text-xs font-bold text-slate-800 uppercase">{c.name}</p>
            </div>
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleOpenModal(c)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit2 className="w-4 h-4" /></button>
              <button onClick={() => setCatToDelete(c)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleSave} className="relative bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
             <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-6">{editingCat ? 'Editar' : 'Nueva'} Categoría</h3>
             <input type="text" autoFocus required className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-sm mb-6 uppercase" value={name} onChange={e => setName(e.target.value)} />
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
        isOpen={!!catToDelete}
        title="Confirmar Eliminación"
        message={`¿Eliminar la categoría "${catToDelete?.name}"?`}
        type="error"
        onConfirm={handleConfirmDelete}
        onCancel={() => setCatToDelete(null)}
        confirmText="Sí, Eliminar"
      />
    </div>
  );
};
