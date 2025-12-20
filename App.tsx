
import React, { useState, useEffect } from 'react';
import { supabase } from './supabaseClient.ts';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { Inventory } from './pages/Inventory.tsx';
import { Kardex } from './pages/Kardex.tsx';
import { Contacts } from './pages/Contacts.tsx';
import { Login } from './pages/Login.tsx';
import { Role } from './types.ts';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<Role>('ADMIN');

  useEffect(() => {
    // 1. Obtener sesión actual
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // 2. Escuchar cambios en la sesión
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin w-10 h-10 text-indigo-600" />
      </div>
    );
  }

  // Si no hay sesión, mostrar Login
  if (!session) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'inventory':
        return <Inventory role={role} />;
      case 'kardex':
        return <Kardex />;
      case 'contacts':
        return <Contacts role={role} />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar 
          onMenuClick={() => setIsSidebarOpen(true)} 
          role={role}
          setRole={setRole}
          userEmail={session.user.email}
        />
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
           <div className="max-w-7xl mx-auto">
             {renderContent()}
           </div>
        </main>
      </div>
    </div>
  );
}
