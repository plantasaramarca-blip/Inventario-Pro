
import React, { useState, useEffect } from 'react';
import { Contact, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { useNotification } from '../contexts/NotificationContext.tsx';
import { CustomDialog } from '../components/CustomDialog.tsx';
import { Plus, Search, User, Briefcase, Phone, Mail, Trash2, Edit2, X, Loader2, Notebook, MapPin, Hash } from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

interface ContactsProps { 
  role: Role;
  initialState?: any;
  onInitialStateConsumed: () => void;
}

export const Contacts: React.FC<ContactsProps> = ({ role, initialState, onInitialStateConsumed }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);
  const [formData, setFormData] = useState<Partial<Contact>>({});
  const { addNotification } = useNotification();

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await api.getContacts();
      setContacts(data || []);
    } catch (e) {
      addNotification('Error al cargar contactos.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    if (initialState?.openNewContactModal) {
      handleOpenModal();
      onInitialStateConsumed();
    }
  }, [initialState]);

  const handleOpenModal = (contact?: Contact) => {
    if (contact) { 
      setEditingContact(contact); 
      setFormData(contact); 
    } else { 
      setEditingContact(null); 
      setFormData({ id: crypto.randomUUID(), name: '', type: 'CLIENTE', taxId: '', phone: '', email: '', address: '', notes: '' }); 
    }
    setIsModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!contactToDelete) return;
    try {
      await api.deleteContact(contactToDelete.id);
      await loadData();
      addNotification(`Contacto "${contactToDelete.name}" eliminado.`, 'success');
    } catch (e) {
      addNotification("Error al eliminar el contacto.", "error");
    } finally {
      setContactToDelete(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      addNotification("El nombre es obligatorio.", "error");
      return;
    }
    setSaving(true);
    try {
      await api.saveContact(formData as Contact);
      setIsModalOpen(false);
      await loadData();
      addNotification("Contacto guardado con éxito.", "success");
    } catch (e) {
      addNotification("Error al guardar el contacto.", "error");
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) return <div className="h-[70vh] flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-indigo-500" /></div>;

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Agenda CRM</h1>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mt-1">Directorio de Contactos</p>
        </div>
        {role !== 'VIEWER' && <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all"><Plus className="w-4 h-4" /> Nuevo</button>}
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
        <input type="text" className="w-full pl-12 pr-12 py-4 bg-white border border-slate-100 rounded-2xl text-xs outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all font-bold" placeholder="Buscar por nombre..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-100 rounded-full"><X className="w-3 h-3 text-slate-400" /></button>}
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map((contact) => (
          <div key={contact.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-start justify-between group">
            <div className="flex items-center space-x-4">
              <div className={`p-3 rounded-2xl ${contact.type === 'PROVEEDOR' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                {contact.type === 'PROVEEDOR' ? <Briefcase className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{contact.name}</h3>
                <div className="mt-2 text-[10px] text-slate-500 space-y-1.5 font-bold">
                  {contact.email && <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-300" /> {contact.email}</p>}
                  {contact.phone && <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-300" /> {contact.phone}</p>}
                </div>
              </div>
            </div>
            {role !== 'VIEWER' && (
              <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(contact)} className="p-2 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => setContactToDelete(contact)} className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-xl"><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
          <form onSubmit={handleSubmit} onClick={e => e.stopPropagation()} className="relative bg-white rounded-[2.5rem] p-8 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{editingContact ? 'Editar Contacto' : 'Nuevo Contacto'}</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X className="text-slate-400 w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Nombre Completo *</label>
                <input type="text" required value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} className="mt-1 w-full p-3 bg-slate-100 rounded-xl outline-none font-bold text-sm uppercase" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipo</label>
                <select value={formData.type || 'CLIENTE'} onChange={e => setFormData({...formData, type: e.target.value as any})} className="mt-1 w-full p-3 bg-slate-100 rounded-xl outline-none font-bold text-sm uppercase appearance-none">
                  <option value="CLIENTE">CLIENTE</option>
                  <option value="PROVEEDOR">PROVEEDOR</option>
                  <option value="OTRO">OTRO</option>
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">RUC / DNI</label>
                <input type="text" value={formData.taxId || ''} onChange={e => setFormData({...formData, taxId: e.target.value})} className="mt-1 w-full p-3 bg-slate-100 rounded-xl outline-none font-bold text-sm" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Teléfono</label>
                <input type="tel" value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})} className="mt-1 w-full p-3 bg-slate-100 rounded-xl outline-none font-bold text-sm" />
              </div>
              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Email</label>
                <input type="email" value={formData.email || ''} onChange={e => setFormData({...formData, email: e.target.value})} className="mt-1 w-full p-3 bg-slate-100 rounded-xl outline-none font-bold text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Dirección</label>
                <input type="text" value={formData.address || ''} onChange={e => setFormData({...formData, address: e.target.value})} className="mt-1 w-full p-3 bg-slate-100 rounded-xl outline-none font-bold text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Notas</label>
                <textarea value={formData.notes || ''} onChange={e => setFormData({...formData, notes: e.target.value})} className="mt-1 w-full p-3 bg-slate-100 rounded-xl outline-none font-bold text-sm h-24 resize-none"></textarea>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-6 border-t mt-6">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-3 text-[10px] font-black uppercase text-slate-400">Cancelar</button>
              <button type="submit" disabled={saving} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl flex items-center gap-2">
                {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <User className="w-4 h-4" />} {editingContact ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      <CustomDialog
        isOpen={!!contactToDelete}
        title="Confirmar Eliminación"
        message={`¿Eliminar a "${contactToDelete?.name}"?`}
        type="error"
        onConfirm={handleConfirmDelete}
        onCancel={() => setContactToDelete(null)}
        confirmText="Sí, Eliminar"
      />
    </div>
  );
};
