
import React, { useState, useEffect } from 'react';
import { UserAccount, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { 
  UserPlus, Key, Trash2, X, Search, Loader2, 
  Mail, Calendar, ShieldAlert, ShieldCheck, UserCheck, Save, AlertTriangle, CheckCircle
} from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const [formData, setFormData] = useState<Partial<UserAccount>>({
    email: '', password: '', role: 'USER'
  });

  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers();
      setUsers(data || []);
    } catch (e: any) {}
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const handleOpenModal = (user?: UserAccount) => {
    if (user) {
      setEditingUser(user);
      setFormData({ email: user.email.toLowerCase(), role: user.role, password: '' });
    } else {
      setEditingUser(null);
      setFormData({ email: '', password: '', role: 'USER' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await api.saveUser({ ...formData, id: editingUser?.id });
      showToast(editingUser ? "Rol actualizado" : "Usuario registrado");
      setIsModalOpen(false);
      loadUsers();
    } catch (err: any) {
      showToast("Error al procesar", 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar acceso de este usuario?')) {
      try {
        await api.deleteUser(id);
        showToast("Acceso eliminado");
        loadUsers();
      } catch (err: any) {}
    }
  };

  const getRoleBadge = (role: Role) => {
    switch(role) {
      case 'ADMIN': return <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[8px] font-black uppercase flex items-center w-fit gap-1"><ShieldCheck className="w-2.5 h-2.5" /> Admin</span>;
      case 'USER': return <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[8px] font-black uppercase flex items-center w-fit gap-1"><UserCheck className="w-2.5 h-2.5" /> Usuario</span>;
      case 'VIEWER': return <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[8px] font-black uppercase flex items-center w-fit gap-1"><ShieldAlert className="w-2.5 h-2.5" /> Visor</span>;
    }
  };

  return (
    <div className="space-y-4 pb-20 relative">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Usuarios</h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Accesos</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">
          <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Nuevo
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
        <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Buscar por correo..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full py-10 text-center"><Loader2 className="animate-spin mx-auto w-6 h-6 text-indigo-500" /></div>
        ) : users.length === 0 ? (
          <div className="col-span-full py-10 text-center text-[10px] font-black uppercase text-slate-300">No hay usuarios</div>
        ) : users.filter(u => u.email.toLowerCase().includes(search.toLowerCase())).map(u => (
          <div key={u.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group transition-all hover:border-indigo-100">
             <div className="space-y-3">
                <div className="flex justify-between items-start">
                   <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                      <Mail className="w-5 h-5" />
                   </div>
                   {getRoleBadge(u.role)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-xs break-all lowercase">{u.email}</h3>
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Registrado: {new Date(u.createdAt).toLocaleDateString()}</p>
                </div>
             </div>
             
             <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-50">
                <button onClick={() => handleOpenModal(u)} className="p-1.5 text-slate-400 hover:text-indigo-600 transition-all flex items-center gap-1.5 text-[8px] font-black uppercase tracking-widest">
                  <Key className="w-3.5 h-3.5" /> Editar
                </button>
                <button onClick={() => handleDelete(u.id)} className="p-1.5 text-slate-400 hover:text-rose-600 transition-all">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
             </div>
          </div>
        ))}
      </div>

      {toast && (
        <div className="fixed bottom-10 right-10 z-[200] px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 animate-in slide-in-from-right-10 bg-slate-900 text-white border border-slate-700">
           <p className="text-[9px] font-black uppercase tracking-widest">{toast.msg}</p>
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-[2.5rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
             <div className="mb-6 text-center">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{editingUser ? 'Editar' : 'Nuevo'} Usuario</h3>
             </div>
             <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo</label>
                  <input type="email" required readOnly={!!editingUser} className={`w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-sm lowercase ${editingUser ? 'opacity-50' : ''}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value.toLowerCase()})} />
                </div>
                {!editingUser && (
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
                    <input type="password" required className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-sm" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol</label>
                  <select className="w-full p-3 bg-indigo-50 text-indigo-700 rounded-xl outline-none font-black text-[10px] uppercase" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}>
                    <option value="ADMIN">ADMIN</option>
                    <option value="USER">USUARIO</option>
                    <option value="VIEWER">VISOR</option>
                  </select>
                </div>
                <div className="flex gap-3 mt-6">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cerrar</button>
                   <button type="submit" disabled={saving} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">
                     {saving ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Guardar'}
                   </button>
                </div>
             </div>
          </form>
        </div>
      )}
    </div>
  );
};
