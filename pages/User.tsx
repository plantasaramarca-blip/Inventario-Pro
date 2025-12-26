
import React, { useState, useEffect } from 'https://esm.sh/react@19.2.3';
import { UserAccount, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { 
  Plus, UserPlus, Key, Shield, Trash2, X, Search, Loader2, 
  Mail, Calendar, ShieldAlert, ShieldCheck, UserCheck
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);

  const [formData, setFormData] = useState<Partial<UserAccount>>({
    email: '', password: '', role: 'USER'
  });

  const loadUsers = async () => {
    setLoading(true);
    try {
      setUsers(await api.getUsers());
    } catch (e) {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadUsers(); }, []);

  const handleOpenModal = (user?: UserAccount) => {
    if (user) {
      setEditingUser(user);
      setFormData({ email: user.email, role: user.role, password: '' });
    } else {
      setEditingUser(null);
      setFormData({ email: '', password: '', role: 'USER' });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.saveUser({ ...formData, id: editingUser?.id });
    setIsModalOpen(false);
    loadUsers();
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar este usuario permanentemente?')) {
      await api.deleteUser(id);
      loadUsers();
    }
  };

  const getRoleBadge = (role: Role) => {
    switch(role) {
      case 'ADMIN': return <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center w-fit gap-1"><ShieldCheck className="w-2.5 h-2.5" /> Admin</span>;
      case 'USER': return <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center w-fit gap-1"><UserCheck className="w-2.5 h-2.5" /> Usuario</span>;
      case 'VIEWER': return <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[9px] font-black uppercase flex items-center w-fit gap-1"><ShieldAlert className="w-2.5 h-2.5" /> Visor</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Usuarios</h1>
          <p className="text-xs text-slate-500 font-medium uppercase tracking-widest mt-1">Control de Acceso y Permisos</p>
        </div>
        <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">
          <UserPlus className="w-4 h-4 mr-2" /> Nuevo Usuario
        </button>
      </div>

      <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm relative">
        <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
        <input 
          type="text" 
          className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-medium transition-all" 
          placeholder="Buscar usuario por correo..." 
          value={search} 
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-indigo-500" /></div>
        ) : users.filter(u => u.email.toLowerCase().includes(search.toLowerCase())).map(u => (
          <div key={u.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
             <div className="space-y-4">
                <div className="flex justify-between items-start">
                   <div className="p-4 bg-slate-50 rounded-2xl text-slate-400">
                      <Mail className="w-6 h-6" />
                   </div>
                   {getRoleBadge(u.role)}
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 break-all">{u.email}</h3>
                  <div className="flex items-center gap-2 mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <Calendar className="w-3 h-3" /> Registrado: {new Date(u.createdAt).toLocaleDateString()}
                  </div>
                </div>
             </div>
             
             <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-50">
                <button onClick={() => handleOpenModal(u)} className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-2 text-[10px] font-black uppercase">
                  <Key className="w-4 h-4" /> Cambiar
                </button>
                <button onClick={() => handleDelete(u.id)} className="p-3 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>
             </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <form onSubmit={handleSubmit} className="relative bg-white rounded-[3rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95">
             <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingUser ? 'Editar' : 'Nuevo'} Usuario</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Definición de credenciales</p>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)}><X className="text-slate-400" /></button>
             </div>
             
             <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Correo Electrónico</label>
                  <input type="email" required className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Contraseña {editingUser && '(Dejar vacío para mantener)'}</label>
                  <input type="password" required={!editingUser} className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-sm" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-2">Rol del Usuario</label>
                  <select className="w-full p-4 bg-indigo-50 text-indigo-700 rounded-2xl outline-none font-black text-xs uppercase" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}>
                    <option value="ADMIN">Administrador (Todo)</option>
                    <option value="USER">Usuario (Crear/Editar)</option>
                    <option value="VIEWER">Visor (Solo Lectura)</option>
                  </select>
                  <p className="text-[9px] text-slate-400 font-medium px-2 mt-2 italic">
                    {formData.role === 'ADMIN' && "* Acceso total al sistema y auditorías."}
                    {formData.role === 'USER' && "* Puede gestionar stock pero no eliminar registros."}
                    {formData.role === 'VIEWER' && "* Solo puede visualizar reportes y stock."}
                  </p>
                </div>

                <div className="flex gap-4 mt-10">
                   <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 text-[10px] font-black uppercase text-slate-400">Cancelar</button>
                   <button type="submit" className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-indigo-100 flex items-center justify-center gap-2">
                     <Save className="w-4 h-4" /> Guardar
                   </button>
                </div>
             </div>
          </form>
        </div>
      )}
    </div>
  );
};

const Save = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
);
