
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
import { Login } from './pages/Login.tsx';
import { Role, Product } from './types.ts';
import * as api from './services/supabaseService.ts';
import { Loader2 } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<Role>('VIEWER'); // Default a Viewer por seguridad
  const [publicProduct, setPublicProduct] = useState<Product | null>(null);
  const [loadingPublic, setLoadingPublic] = useState(false);

  const fetchRole = async (email: string) => {
    const profile = await api.getCurrentUserProfile(email);
    if (profile) setRole(profile.role);
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewProductId = urlParams.get('view_product');
    
    if (viewProductId) {
      setLoadingPublic(true);
      api.getProductById(viewProductId).then(p => {
        if (p) setPublicProduct(p);
        setLoadingPublic(false);
      });
    }

    const initAuth = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          setSession(currentSession);
          if (currentSession?.user?.email) {
            await fetchRole(currentSession.user.email);
          }

          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            setSession(session);
            if (session?.user?.email) {
              await fetchRole(session.user.email);
            }
          });

          return () => subscription.unsubscribe();
        } else {
          const localSession = localStorage.getItem('kardex_local_session');
          if (localSession) {
            const parsed = JSON.parse(localSession);
            setSession(parsed);
            await fetchRole(parsed.user.email);
          }
        }
      } catch (e) {
        console.error("Auth error:", e);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  if (loading || loadingPublic) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <Loader2 className="animate-spin w-12 h-12 text-indigo-600 mx-auto mb-4" />
        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Iniciando Kardex Pro...</p>
      </div>
    </div>
  );

  if (publicProduct) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 max-w-sm w-full">
           <h1 className="text-2xl font-black mb-2 text-slate-800 uppercase tracking-tight">{publicProduct.name}</h1>
           <p className="text-[10px] font-black text-slate-400 uppercase mb-8">Información de Stock</p>
           <div className="bg-indigo-50 p-6 rounded-3xl mb-8 border border-indigo-100">
             <p className="text-4xl font-black text-indigo-600 mb-1">{publicProduct.stock}</p>
             <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{publicProduct.unit} Disponibles</p>
           </div>
           <button onClick={() => window.location.href = window.location.origin} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl">Volver al sistema</button>
        </div>
      </div>
    );
  }

  if (!session) return <Login />;

  const renderContent = () => {
    switch (currentPage) {
      case 'inventory': return <Inventory role={role} />;
      case 'kardex': return <Kardex onNavigateToDestinos={() => setCurrentPage('destinos')} role={role} />;
      case 'destinos': return <Destinos role={role} />;
      case 'contacts': return <Contacts role={role} />;
      case 'users': return role === 'ADMIN' ? <UsersPage /> : <Dashboard />;
      case 'audit': return role === 'ADMIN' ? <AuditPage /> : <Dashboard />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-inter">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} role={role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} role={role} setRole={setRole} userEmail={session.user?.email || 'Admin Local'} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
           <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
}
