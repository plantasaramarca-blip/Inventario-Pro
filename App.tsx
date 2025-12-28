
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
import { Loader2, Zap, ArrowRight, X, Package, ArrowUpCircle, ArrowDownCircle } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<Role>('VIEWER');
  const [quickProduct, setQuickProduct] = useState<Product | null>(null);

  const fetchRole = async (email: string) => {
    try {
      const profile = await api.getCurrentUserProfile(email);
      if (profile) setRole(profile.role);
    } catch (e) { setRole('VIEWER'); }
  };

  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    }
    localStorage.removeItem('kardex_local_session');
    setSession(null);
    window.location.href = window.location.origin;
  };

  const checkUrlParams = async () => {
    const params = new URLSearchParams(window.location.search);
    const action = params.get('action');
    const id = params.get('id');
    if (action === 'quick_move' && id) {
      const products = await api.getProducts();
      const found = products.find(p => p.id === id);
      if (found) {
        setQuickProduct(found);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data: { session: initialSession }, error } = await supabase.auth.getSession();
          
          // Si hay error 400 o refresh_token fallido, limpiamos sesión
          if (error && error.status === 400) {
            console.warn("Sesión expirada o inválida detectada.");
            handleLogout();
            return;
          }

          if (initialSession) {
            setSession(initialSession);
            await fetchRole(initialSession.user.email!);
            await checkUrlParams();
          }
          
          supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (event === 'SIGNED_OUT' || event === 'USER_UPDATED' && !newSession) {
               setSession(null);
               return;
            }
            
            if (newSession) {
              setSession(newSession);
              if (newSession?.user?.email) { 
                await fetchRole(newSession.user.email); 
                await checkUrlParams(); 
              }
            }
          });
        } else {
          const localSession = localStorage.getItem('kardex_local_session');
          if (localSession) {
            const parsed = JSON.parse(localSession);
            setSession(parsed);
            await fetchRole(parsed.user.email);
            await checkUrlParams();
          }
        }
      } catch (e) {
        console.error("Error en inicialización de Auth:", e);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><div className="text-center"><Loader2 className="animate-spin w-10 h-10 text-indigo-600 mx-auto" /><p className="mt-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Sincronizando Almacén...</p></div></div>;
  if (!session) return <Login />;

  const navigateTo = (page: string) => { 
    setCurrentPage(page); 
    if (isSidebarOpen) setIsSidebarOpen(false);
    window.history.pushState({ page }, '', ''); 
  };

  const renderContent = () => {
    switch (currentPage) {
      case 'inventory': return <Inventory role={role} />;
      case 'kardex': return <Kardex role={role} userEmail={session.user?.email} initialProductId={quickProduct?.id} />;
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
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 no-scrollbar"><div className="max-w-7xl mx-auto">{renderContent()}</div></main>
      </div>

      {quickProduct && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-xl" onClick={() => setQuickProduct(null)}></div>
           <div className="relative bg-white w-full max-w-sm rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in">
              <div className="p-10 text-center space-y-8">
                 <div className="w-24 h-24 bg-indigo-50 rounded-[2.5rem] mx-auto flex items-center justify-center border-4 border-white shadow-xl">
                    {quickProduct.imageUrl ? <img src={quickProduct.imageUrl} className="w-full h-full object-cover rounded-[2rem]" /> : <Zap className="w-10 h-10 text-indigo-600" />}
                 </div>
                 <div>
                    <h3 className="text-[10px] font-black uppercase text-indigo-500 tracking-[0.3em] mb-2">Producto Detectado</h3>
                    <p className="text-xl font-black text-slate-800 leading-tight uppercase mb-1">{quickProduct.name}</p>
                    <p className="text-[11px] font-black text-slate-400 tracking-widest">{quickProduct.code}</p>
                    <div className="mt-4 inline-flex items-center px-4 py-2 bg-slate-100 rounded-2xl text-[10px] font-black text-slate-600">
                       STOCK: {quickProduct.stock} {quickProduct.unit}
                    </div>
                 </div>
                 <div className="grid grid-cols-1 gap-3">
                    <button onClick={() => { setQuickProduct(null); navigateTo('kardex'); }} className="w-full py-5 bg-indigo-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-2xl flex items-center justify-center gap-3 active:scale-95 transition-all">
                       <ArrowRight className="w-4 h-4" /> Gestionar Movimiento
                    </button>
                    <button onClick={() => setQuickProduct(null)} className="w-full py-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Ignorar</button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
