
import React, { useState, useEffect } from 'https://esm.sh/react@19.0.0';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Kardex } from './pages/Kardex';
import { Contacts } from './pages/Contacts';
import { Destinos } from './pages/Destinos';
import { AuditPage } from './pages/AuditLog';
import { Login } from './pages/Login';
import { Role, Product } from './types';
import * as api from './services/supabaseService';
import { Loader2, Package, MapPin, QrCode, ArrowLeft } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.0.0';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<Role>('ADMIN');

  // Estado para la vista pública de QR
  const [publicProduct, setPublicProduct] = useState<Product | null>(null);
  const [loadingPublic, setLoadingPublic] = useState(false);

  // ═══════════════════════════════════════════════════════
  // MANEJO DEL HISTORIAL DEL NAVEGADOR (Fix Problema 2)
  // ═══════════════════════════════════════════════════════
  useEffect(() => {
    // 1. Sincronizar estado inicial con el hash actual
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    setCurrentPage(hash);
    
    if (!window.history.state?.page) {
      window.history.replaceState({ page: hash }, '', `#${hash}`);
    }

    // 2. Escuchar evento "popstate" (botón atrás/adelante)
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.page) {
        setCurrentPage(event.state.page);
      } else {
        const newHash = window.location.hash.replace('#', '') || 'dashboard';
        setCurrentPage(newHash);
      }
    };

    window.addEventListener('popstate', handlePopState);

    // 3. Verificar Vista Pública QR (view_product)
    const urlParams = new URLSearchParams(window.location.search);
    const viewProductId = urlParams.get('view_product');
    
    if (viewProductId) {
      setLoadingPublic(true);
      api.getProductById(viewProductId).then(p => {
        setPublicProduct(p);
        setLoadingPublic(false);
      });
    }

    const initAuth = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) {
            setSession(currentSession);
            setLoading(false);
            return;
          }
        }
        const localSession = localStorage.getItem('kardex_local_session');
        if (localSession) setSession(JSON.parse(localSession));
      } catch (err) {} 
      finally { setLoading(false); }
    };
    initAuth();

    if (isSupabaseConfigured) {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });
      return () => {
        subscription.unsubscribe();
        window.removeEventListener('popstate', handlePopState);
      };
    }

    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Función global para cambiar de página con historial
  function navigateToPage(page: string) {
    setCurrentPage(page);
    window.history.pushState({ page }, '', `#${page}`);
  }

  if (loading || loadingPublic) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin w-10 h-10 text-indigo-600" />
    </div>
  );

  // Renderizar vista pública de escaneo QR
  if (publicProduct) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-lg bg-white rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-300">
           <div className="relative h-64 bg-slate-200">
             {publicProduct.imageUrl ? (
               <img src={publicProduct.imageUrl} className="w-full h-full object-cover" />
             ) : (
               <div className="w-full h-full flex items-center justify-center text-slate-400">
                 <Package className="w-20 h-20" />
               </div>
             )}
             <div className="absolute top-6 left-6">
               <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center shadow-sm border border-white/50">
                  <QrCode className="w-4 h-4 text-indigo-600 mr-2" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-800">{publicProduct.qr_code}</span>
               </div>
             </div>
           </div>

           <div className="p-10 space-y-8">
              <div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase leading-tight mb-2">{publicProduct.name}</h1>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">{publicProduct.category} | SKU: {publicProduct.code}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                   <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1">Stock Actual</p>
                   <p className="text-3xl font-black text-slate-800">{publicProduct.stock} <span className="text-xs text-slate-400">{publicProduct.unit}</span></p>
                 </div>
                 <div className="p-6 bg-indigo-50 rounded-3xl border border-indigo-100">
                   <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest mb-1">Ubicación</p>
                   <div className="flex items-center text-indigo-600">
                     <MapPin className="w-4 h-4 mr-2" />
                     <p className="text-sm font-black uppercase">{publicProduct.location || 'N/A'}</p>
                   </div>
                 </div>
              </div>

              <button 
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.delete('view_product');
                  window.history.pushState({}, '', url.pathname + url.hash);
                  setPublicProduct(null);
                }}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center hover:bg-slate-800 transition-all shadow-xl"
              >
                <ArrowLeft className="w-4 h-4 mr-3" /> Volver al Sistema
              </button>
           </div>
        </div>
        <p className="mt-8 text-[10px] text-slate-400 font-black uppercase tracking-widest">Kardex Pro • Información de Activos</p>
      </div>
    );
  }

  if (!session) return <Login />;

  const renderContent = () => {
    switch (currentPage) {
      case 'inventory': return <Inventory role={role} />;
      case 'kardex': return <Kardex onNavigateToDestinos={() => navigateToPage('destinos')} />;
      case 'destinos': return <Destinos />;
      case 'contacts': return <Contacts role={role} />;
      case 'audit': return role === 'ADMIN' ? <AuditPage /> : <Dashboard />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar 
        currentPage={currentPage} 
        onNavigate={navigateToPage} 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        role={role}
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
            ⚡ Modo Local: Los datos se guardan solo en este navegador.
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#fdfdfd]">
           <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
}
