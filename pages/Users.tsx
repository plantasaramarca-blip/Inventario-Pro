
import React, { useState, useEffect } from 'react';
import { UserAccount, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { useNotification } from '../contexts/NotificationContext.tsx';
import { CustomDialog } from '../components/CustomDialog.tsx';
import { UserPlus, Key, Trash2, X, Search, Loader2, Mail, ShieldCheck, UserCheck, ShieldAlert } from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [userToDelete, setUserToDelete] = useState<UserAccount | null>(null);
  const [formData, setFormData] = useState<any>({});
  const { addNotification } = useNotification();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data || []);
    } catch (e) {
      addNotification("Error al cargar usuarios.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenModal = (user?: UserAccount) => {
    if (user) { setEditingUser(user); setFormData({ email: user.email, role: user.role, password: '' }); }
    else { setEditingUser(null); setFormData({ email: '', password: '', role: 'USER' }); }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.saveUser({ ...formData, id: editingUser?.id });
      setIsModalOpen(false);
      loadData();
      addNotification("Usuario guardado correctamente.", "success");
    } catch (err) {
      addNotification("Error al guardar el usuario.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await api.deleteUser(userToDelete.id);
      loadData();
      addNotification(`Usuario "${userToDelete.email}" eliminado.`, "success");
    } catch (e) {
      addNotification("Error al eliminar el usuario.", "error");
    } finally {
      setUserToDelete(null);
    }
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Usuarios</h1>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Gestión de Accesos</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
          <UserPlus className="w-4 h-4" /> Nuevo
        </button>
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
        <input type="text" className="w-full pl-12 pr-12 py-4 bg-white border border-slate-100 rounded-2xl text-xs outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all font-bold" placeholder="Buscar por email..." value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"><X className="w-3 h-3 text-slate-400" /></button>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? <div className="col-span-full py-10 text-center"><Loader2 className="animate-spin mx-auto w-6 h-6 text-indigo-500" /></div> : users.filter(u => u.email.toLowerCase().includes(search.toLowerCase())).map(u => (
          <div key={u.id} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition-all">
             <div className="space-y-3">
                <div className="flex justify-between items-start">
                  <div className="p-3 bg-slate-50 rounded-xl text-slate-400"><Mail className="w-4 h-4" /></div>
                  <span className="text-[8px] font-black uppercase bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg">{u.role}</span>
                </div>
                <h3 className="font-black text-slate-800 text-xs lowercase truncate">{u.email}</h3>
             </div>
             <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50">
                <button onClick={() => handleOpenModal(u)} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 flex items-center gap-1.5"><Key className="w-3 h-3" /> Editar</button>
                <button onClick={() => setUserToDelete(u)} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
             </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl">
             <h3 className="text-sm font-black text-slate-800 uppercase mb-6 tracking-tight">{editingUser ? 'Configurar' : 'Nuevo'} Usuario</h3>
             <div className="space-y-4">
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Correo</label><input type="email" required readOnly={!!editingUser} className={`w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs lowercase ${editingUser ? 'opacity-50' : ''}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">{editingUser ? 'Nueva Clave (opcional)' : 'Clave *'}</label><input type="password" required={!editingUser} className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold text-xs" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Mínimo 6 caracteres" /></div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase ml-2 tracking-widest">Rol</label><select className="w-full p-4 bg-indigo-50 text-indigo-700 rounded-2xl outline-none font-black text-xs uppercase" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}><option value="ADMIN">ADMIN</option><option value="USER">USUARIO</option><option value="VIEWER">VISOR</option></select></div>
                <div className="flex gap-3 pt-4">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[10px] font-black uppercase text-slate-400">Cerrar</button>
                   <button type="submit" disabled={saving} className="flex-[2] py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl">{saving ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Guardar'}</button>
                </div>
             </div>
          </form>
        </div>
      )}
      <CustomDialog
        isOpen={!!userToDelete}
        title="Confirmar Eliminación"
        message={`¿Eliminar al usuario "${userToDelete?.email}"?`}
        type="error"
        onConfirm={handleConfirmDelete}
        onCancel={() => setUserToDelete(null)}
        confirmText="Sí, Eliminar"
      />
    </div>
  );
};
