import React, { useState, useEffect } from 'react';
import { UserAccount, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { UserPlus, Key, Trash2, X, Search, Loader2, Mail, ShieldCheck, UserCheck, ShieldAlert } from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [formData, setFormData] = useState<any>({});

  const loadData = async () => {
    setLoading(true); try { const data = await api.getUsers(); setUsers(data || []); } catch (e) {} finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleOpenModal = (user?: UserAccount) => {
    if (user) { setEditingUser(user); setFormData({ email: user.email, role: user.role, password: '' }); }
    else { setEditingUser(null); setFormData({ email: '', password: '', role: 'USER' }); }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.saveUser({ ...formData, id: editingUser?.id }); setIsModalOpen(false); loadData(); } catch (err) {} finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 animate-in fade-in pb-10">
      <div className="flex justify-between items-center">
        <div><h1 className="text-xl font-black text-slate-900 uppercase">Usuarios</h1><p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Gestión de Accesos</p></div>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-[9px] font-black uppercase shadow-lg"><UserPlus className="w-3.5 h-3.5 mr-1.5" /> Nuevo</button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-300" />
        <input type="text" className="w-full pl-10 pr-4 py-2 bg-white border border-slate-100 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-500" placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {loading ? <div className="col-span-full py-10 text-center"><Loader2 className="animate-spin mx-auto w-6 h-6 text-indigo-500" /></div> : users.filter(u => u.email.toLowerCase().includes(search.toLowerCase())).map(u => (
          <div key={u.id} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-indigo-100 transition-all">
             <div className="space-y-2">
                <div className="flex justify-between items-start"><div className="p-2 bg-slate-50 rounded-lg text-slate-400"><Mail className="w-4 h-4" /></div><span className="text-[8px] font-black uppercase bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded">{u.role}</span></div>
                <h3 className="font-bold text-slate-800 text-[10px] lowercase">{u.email}</h3>
             </div>
             <div className="flex items-center justify-between mt-3 pt-3 border-t">
                <button onClick={() => handleOpenModal(u)} className="p-1 text-[8px] font-black text-slate-400 uppercase tracking-widest hover:text-indigo-600 flex items-center gap-1"><Key className="w-3 h-3" /> Editar Acceso</button>
                <button onClick={async () => { if(confirm('¿Eliminar?')) { await api.deleteUser(u.id); loadData(); } }} className="p-1 text-slate-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
             </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => !saving && setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-3xl p-6 w-full max-w-xs shadow-2xl">
             <h3 className="text-xs font-black text-slate-800 uppercase mb-4">{editingUser ? 'Configurar' : 'Nuevo'} Usuario</h3>
             <div className="space-y-3">
                <div className="space-y-1"><label className="text-[7px] font-black text-slate-400 uppercase ml-1">Correo</label><input type="email" required readOnly={!!editingUser} className={`w-full p-2 bg-slate-50 rounded-lg outline-none font-bold text-[10px] lowercase ${editingUser ? 'opacity-50' : ''}`} value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div>
                <div className="space-y-1"><label className="text-[7px] font-black text-slate-400 uppercase ml-1">{editingUser ? 'Nueva Clave (opcional)' : 'Clave *'}</label><input type="password" required={!editingUser} className="w-full p-2 bg-slate-50 rounded-lg outline-none font-bold text-[10px]" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="****" /></div>
                <div className="space-y-1"><label className="text-[7px] font-black text-slate-400 uppercase ml-1">Rol</label><select className="w-full p-2 bg-indigo-50 text-indigo-700 rounded-lg outline-none font-black text-[9px] uppercase" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}><option value="ADMIN">ADMIN</option><option value="USER">USUARIO</option><option value="VIEWER">VISOR</option></select></div>
                <div className="flex gap-3 mt-4">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 text-[8px] font-black uppercase text-slate-400">Cerrar</button>
                   <button type="submit" disabled={saving} className="flex-[2] py-2 bg-indigo-600 text-white rounded-xl text-[8px] font-black uppercase shadow-lg">{saving ? <Loader2 className="animate-spin w-3 h-3 mx-auto" /> : 'Guardar'}</button>
                </div>
             </div>
          </form>
        </div>
      )}
    </div>
  );
};