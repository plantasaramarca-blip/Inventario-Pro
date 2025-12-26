
import React, { useState, useEffect } from 'https://esm.sh/react@19.2.3';
import { Contact, Role } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { Plus, Search, User, Briefcase, Phone, Mail, Trash2, Edit2 } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Agenda CRM</h1>
        {role === 'ADMIN' && <button onClick={() => handleOpenModal()} className="bg-indigo-600 text-white px-4 py-2 rounded shadow-sm">+ Nuevo</button>}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <input type="text" className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm" placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {contacts.filter(c => c.name.toLowerCase().includes(search.toLowerCase())).map((contact) => (
          <div key={contact.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${contact.type === 'PROVEEDOR' ? 'bg-orange-50 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                {contact.type === 'PROVEEDOR' ? <Briefcase className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{contact.name}</h3>
                <div className="mt-2 text-xs text-gray-500 space-y-1">
                  {contact.email && <p className="flex items-center"><Mail className="w-3 h-3 mr-1" /> {contact.email}</p>}
                  {contact.phone && <p className="flex items-center"><Phone className="w-3 h-3 mr-1" /> {contact.phone}</p>}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
