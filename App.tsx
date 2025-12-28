
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
import { Role, Product } from './types.ts';
import * as api from './services/supabaseService.ts';
import { Loader2, Zap, ArrowRight, X, Package } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<Role>('VIEWER');
  
  // Estado para escaneo rápido
  const [quickProduct, setQuickProduct] = useState<Product | null>(null);

  const fetchRole = async (email: string) => {
    try {
      const profile = await api.getCurrentUserProfile(email);
      if (profile) setRole(profile.role);
    } catch (e) {
      setRole('VIEWER');
    }
  };

  const checkUrlParams = async () => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const id = params.get('id');
    
    if (action === 'quick_move' && id) {
      try {
        const products = await api.getProducts();
        const found = products.find(p => p.id === id);
        if (found) {
          setQuickProduct(found);
          // Limpiar URL para no repetir acción al recargar
          window.history.replaceState({}, '', window.location.pathname);
        }
      } catch (e) {}
    }
  };

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
          await checkUrlParams();
        }
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
          setSession(newSession);
          if (newSession?.user?.email) {
            await fetchRole(newSession.user.email);
            await checkUrlParams();
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
          await checkUrlParams();
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
      case 'kardex': return <Kardex role={role} userEmail={session.user?.email} />;
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

      {/* MODAL DE ACCIÓN RÁPIDA (ESCANEO QR) */}
      {quickProduct && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 animate-in fade-in duration-300">
           <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={() => setQuickProduct(null)}></div>
           <div className="relative bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="p-8 text-center space-y-6">
                 <div className="w-20 h-20 bg-indigo-50 rounded-3xl mx-auto flex items-center justify-center border-2 border-indigo-100">
                    <Zap className="w-10 h-10 text-indigo-600" />
                 </div>
                 <div>
                    <h3 className="text-[10px] font-black uppercase text-indigo-500 tracking-widest mb-1">Acceso Directo QR</h3>
                    <p className="text-lg font-black text-slate-800 leading-tight uppercase">{quickProduct.name}</p>
                    <p className="text-xs font-bold text-slate-400 mt-1">Stock Actual: <span className="text-slate-800">{quickProduct.stock} {quickProduct.unit}</span></p>
                 </div>
                 <div className="space-y-3">
                    <button 
                      onClick={() => { setQuickProduct(null); navigateTo('kardex'); }}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 active:scale-95"
                    >
                       Realizar Movimiento <ArrowRight className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setQuickProduct(null)}
                      className="w-full py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-800"
                    >
                       Cerrar
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
