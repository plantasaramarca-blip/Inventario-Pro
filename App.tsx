import React, { useState, useEffect } from 'https://esm.sh/react@19.0.0';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Kardex } from './pages/Kardex';
import { Contacts } from './pages/Contacts';
import { AuditPage } from './pages/AuditLog';
import { Login } from './pages/Login';
import { Role } from './types';
import { Loader2 } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.0.0';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<Role>('ADMIN');

  useEffect(() => {
    const initAuth = async () => {
      try {
        // Intentar obtener sesión de Supabase si está configurado
        if (isSupabaseConfigured) {
          const { data: { session: currentSession }, error } = await supabase.auth.getSession();
          if (currentSession && !error) {
            setSession(currentSession);
            setLoading(false);
            return;
          }
        }

        // Si no hay Supabase o falló, intentar sesión local
        const localSession = localStorage.getItem('kardex_local_session');
        if (localSession) {
          setSession(JSON.parse(localSession));
        }
      } catch (err) {
        console.error("Auth Initialization Error:", err);
      } finally {
        // Asegurar que siempre se quite el estado de carga
        setLoading(false);
      }
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
        <div className="flex flex-col items-center">
          <Loader2 className="animate-spin w-12 h-12 text-indigo-600 mb-4" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Iniciando Sistema...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'inventory': return <Inventory role={role} />;
      case 'kardex': return <Kardex />;
      case 'contacts': return <Contacts role={role} />;
      case 'audit': return role === 'ADMIN' ? <AuditPage /> : <Dashboard />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        role={role}
      />
      
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar 
          onMenuClick={() => setIsSidebarOpen(true)} 
          role={role}
          setRole={setRole}
          userEmail={session.user?.email || 'Administrador Local'}
        />
        
        {!isSupabaseConfigured && (
          <div className="bg-amber-500 text-white text-[9px] py-1 px-4 text-center font-black tracking-widest uppercase">
            ⚠️ Modo Offline: Los datos solo se guardan en este dispositivo.
          </div>
        )}
        
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#fdfdfd]">
           <div className="max-w-7xl mx-auto">
             {renderContent()}
           </div>
        </main>
      </div>
    </div>
  );
}