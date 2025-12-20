
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Kardex } from './pages/Kardex';
import { Contacts } from './pages/Contacts';
import { Login } from './pages/Login';
import { Role } from './types';
import { Loader2 } from 'https://esm.sh/lucide-react@^0.561.0';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<Role>('ADMIN');

  useEffect(() => {
    const initAuth = async () => {
      // 1. Intentar sesión real con Supabase
      if (isSupabaseConfigured) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setSession(session);
          setLoading(false);
          return;
        }
      }

      // 2. Intentar sesión local (Modo Demo)
      const localSession = localStorage.getItem('kardex_local_session');
      if (localSession) {
        setSession(JSON.parse(localSession));
      }
      
      setLoading(false);
    };

    initAuth();

    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });
      return () => subscription.unsubscribe();
    }
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin w-10 h-10 text-indigo-600" />
      </div>
    );
  }

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
          userEmail={session.user?.email || 'Admin Local'}
        />
        
        {!isSupabaseConfigured && (
          <div className="bg-blue-600 text-white text-[10px] py-1 px-4 text-center font-bold tracking-widest uppercase">
            ⚡ Estás trabajando en Modo Local (LocalStorage). Los datos se guardan solo en este navegador.
          </div>
        )}
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
           <div className="max-w-7xl mx-auto">
             {renderContent()}
           </div>
        </main>
      </div>
    </div>
  );
}
