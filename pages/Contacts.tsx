
import React, { useState, useEffect } from 'https://esm.sh/react@19.2.3';
import { Contact, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { Plus, Search, User, Briefcase, Phone, Mail, Trash2, Edit2, X } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

interface ContactsProps { role: Role; }

export const Contacts: React.FC<ContactsProps> = ({ role }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  const [formData, setFormData] = useState<Partial<Contact>>({ name: '', type: 'CLIENTE', taxId: '', phone: '', email: '' });

  const loadData = async () => { setContacts(await api.getContacts()); };
  useEffect(() => { loadData(); }, []);

  const handleOpenModal = (contact?: Contact) => {
    if (contact) { setEditingContact(contact); setFormData(contact); }
    else { setEditingContact(null); setFormData({ name: '', type: 'CLIENTE', taxId: '', phone: '', email: '' }); }
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Eliminar contacto?')) { await api.deleteContact(id); loadData(); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.saveContact(formData);
    setIsModalOpen(false);
    loadData();
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Agenda CRM</h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Directorio de Contactos</p>
        </div>
        {role === 'ADMIN' && <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all">+ Nuevo</button>}
      </div>

      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
        <input type="text" className="w-full pl-11 pr-11 py-3 bg-white border border-slate-100 rounded-xl text-sm outline-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all" placeholder="Buscar contactos..." value={search} onChange={(e) => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X className="w-4 h-4" /></button>}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map((contact) => (
          <div key={contact.id} className="bg-white p-5 rounded-[2rem] shadow-sm border border-slate-100 flex items-start justify-between group">
            <div className="flex items-center space-x-3">
              <div className={`p-3 rounded-2xl ${contact.type === 'PROVEEDOR' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                {contact.type === 'PROVEEDOR' ? <Briefcase className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">{contact.name}</h3>
                <div className="mt-2 text-[10px] text-slate-500 space-y-1 font-bold">
                  {contact.email && <p className="flex items-center"><Mail className="w-3 h-3 mr-1.5" /> {contact.email}</p>}
                  {contact.phone && <p className="flex items-center"><Phone className="w-3 h-3 mr-1.5" /> {contact.phone}</p>}
                </div>
              </div>
            </div>
            {role === 'ADMIN' && (
              <div className="flex flex-col gap-1">
                <button onClick={() => handleOpenModal(contact)} className="p-2 text-slate-300 hover:text-indigo-600"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => handleDelete(contact.id)} className="p-2 text-slate-300 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
