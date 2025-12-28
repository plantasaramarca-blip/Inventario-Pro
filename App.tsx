
import React, { useState, useEffect } from 'https://esm.sh/react@19.2.3';
import { supabase, isSupabaseConfigured } from './supabaseClient.ts';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { Inventory } from './pages/Inventory.tsx';
import { Kardex } from './pages/Kardex.tsx';
import { Contacts } from './pages/Contacts.tsx';
import { Destinos } from './pages/Destinos.tsx';
import { AuditPage } from './pages/AuditLog.tsx';
import { UsersPage } from './pages/Users.tsx';
import { CategoryManagement } from './pages/Categories.tsx';
import { LocationManagement } from './pages/Locations.tsx';
import { Login } from './pages/Login.tsx';
import { Role } from './types.ts';
import * as api from './services/supabaseService.ts';
import { Loader2 } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<Role>('VIEWER');

  const fetchRole = async (email: string) => {
    try {
      const profile = await api.getCurrentUserProfile(email);
      if (profile) setRole(profile.role);
    } catch (e) {
      setRole('VIEWER');
    }
  };

  // Manejo de Navegación e Historial (Botón Atrás del móvil)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.page) {
        setCurrentPage(event.state.page);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigateTo = (page: string) => {
    if (page !== currentPage) {
      setCurrentPage(page);
      window.history.pushState({ page }, '', '');
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      if (isSupabaseConfigured) {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        if (initialSession) {
          setSession(initialSession);
          await fetchRole(initialSession.user.email!);
        }
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
          setSession(newSession);
          if (newSession?.user?.email) {
            await fetchRole(newSession.user.email);
          } else {
            setRole('VIEWER');
            setCurrentPage('dashboard');
          }
        });
        
        setLoading(false);
        return () => subscription.unsubscribe();
      } else {
        const localSession = localStorage.getItem('kardex_local_session');
        if (localSession) {
          const parsed = JSON.parse(localSession);
          setSession(parsed);
          await fetchRole(parsed.user.email);
        }
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="animate-spin w-12 h-12 text-indigo-600 mx-auto mb-4" />
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Sincronizando Sistema...</p>
      </div>
    </div>
  );

  if (!session) return <Login />;

  const renderContent = () => {
    switch (currentPage) {
      case 'inventory': return <Inventory role={role} />;
      case 'kardex': return <Kardex role={role} />;
      case 'destinos': return <Destinos />;
      case 'contacts': return <Contacts role={role} />;
      case 'categories': return <CategoryManagement role={role} />;
      case 'locations': return <LocationManagement role={role} />;
      case 'users': return role === 'ADMIN' ? <UsersPage /> : <Dashboard />;
      case 'audit': return role === 'ADMIN' ? <AuditPage /> : <Dashboard />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-inter">
      <Sidebar currentPage={currentPage} onNavigate={navigateTo} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} role={role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} role={role} setRole={setRole} userEmail={session.user?.email} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 no-scrollbar">
           <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
}
