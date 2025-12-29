
import React, { useState, useEffect } from 'react';
import { UserAccount, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { 
  UserPlus, Key, Trash2, X, Search, Loader2, 
  Mail, ShieldCheck, UserCheck, ShieldAlert, Save, AlertCircle
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  const [formData, setFormData] = useState<any>({
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
      showToast(editingUser ? "Usuario actualizado" : "Usuario registrado");
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
    <div className="space-y-4 pb-20 relative animate-in fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight uppercase">Usuarios</h1>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Gestión de Accesos</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">
          <UserPlus className="w-3.5 h-3.5 mr-1.5" /> Nuevo
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
        <input type="text" className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-100 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? (
          <div className="col-span-full py-10 text-center"><Loader2 className="animate-spin mx-auto w-6 h-6 text-indigo-500" /></div>
        ) : users.filter(u => u.email.toLowerCase().includes(search.toLowerCase())).map(u => (
          <div key={u.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-indigo-100 transition-all">
             <div className="space-y-3">
                <div className="flex justify-between items-start">
                   <div className="p-2 bg-slate-50 rounded-lg text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                      <Mail className="w-4 h-4" />
                   </div>
                   {getRoleBadge(u.role)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-xs break-all lowercase">{u.email}</h3>
                </div>
             </div>
             
             <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-50">
                <button onClick={() => handleOpenModal(u)} className="p-1 text-slate-400 hover:text-indigo-600 transition-all flex items-center gap-1 text-[8px] font-black uppercase tracking-widest">
                  <Key className="w-3 h-3" /> Editar / Clave
                </button>
                <button onClick={() => handleDelete(u.id)} className="p-1 text-slate-400 hover:text-rose-600">
                  <Trash2 className="w-3 h-3" />
                </button>
             </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl animate-in zoom-in-95">
             <div className="mb-6">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{editingUser ? 'Editar' : 'Nuevo'} Usuario</h3>
                {editingUser && <p className="text-[8px] text-indigo-500 font-black uppercase mt-1">Configurar Rol o Contraseña</p>}
             </div>
             
             <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo</label>
                  <input type="email" required readOnly={!!editingUser} className={`w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-xs lowercase ${editingUser ? 'opacity-50' : ''}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">{editingUser ? 'Nueva Contraseña (opcional)' : 'Contraseña *'}</label>
                  <input type="password" required={!editingUser} className="w-full p-3 bg-slate-50 rounded-xl outline-none font-bold text-xs" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder={editingUser ? "Dejar vacío para mantener" : "****"} />
                </div>

                <div className="space-y-1">
                  <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest ml-1">Rol</label>
                  <select className="w-full p-3 bg-indigo-50 text-indigo-700 rounded-xl outline-none font-black text-[10px] uppercase" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}>
                    <option value="ADMIN">ADMIN</option>
                    <option value="USER">USUARIO</option>
                    <option value="VIEWER">VISOR</option>
                  </select>
                </div>

                <div className="flex gap-3 mt-4">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Cerrar</button>
                   <button type="submit" disabled={saving} className="flex-[2] py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">
                     {saving ? <Loader2 className="animate-spin w-4 h-4 mx-auto" /> : 'Guardar'}
                   </button>
                </div>
             </div>
          </form>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 right-6 z-[200] px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 animate-in slide-in-from-right-6 bg-slate-900 text-white">
           <AlertCircle className="w-3.5 h-3.5 text-indigo-400" />
           <p className="text-[8px] font-black uppercase tracking-widest">{toast.msg}</p>
        </div>
      )}
    </div>
  );
};
