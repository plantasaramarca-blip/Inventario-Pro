
import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient.ts';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { Dashboard } from './pages/Dashboard.tsx';
import { Inventory } from './pages/Inventory.tsx';
import { Kardex } from './pages/Kardex.tsx';
import { Contacts } from './pages/Contacts.tsx';
import { Destinos } from './pages/Destinos.tsx';
import { Reports } from './pages/Reports.tsx';
import { AuditPage } from './pages/AuditLog.tsx';
import { UsersPage } from './pages/Users.tsx';
import { CategoryManagement } from './pages/Categories.tsx';
import { LocationManagement } from './pages/Locations.tsx';
import { Login } from './pages/Login.tsx';
import { ProductDetail } from './pages/ProductDetail.tsx';
import { CommandPalette } from './components/CommandPalette.tsx';
import { Role, Product, Movement, Contact, Destination, CategoryMaster, LocationMaster, InventoryStats } from './types.ts';
import * as api from './services/supabaseService.ts';
import { Loader2, RefreshCcw } from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';
import { CustomDialog } from './components/CustomDialog.tsx';
import { useNotification } from './contexts/NotificationContext.tsx';
import { Toast } from './components/Toast.tsx';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();
  return (
    <div className="fixed top-6 right-6 z-[2000] w-full max-w-sm space-y-3">
      {notifications.map((n) => ( <Toast key={n.id} notification={n} onClose={removeNotification} /> ))}
    </div>
  );
};

const FullScreenError: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <div className="h-screen flex items-center justify-center bg-slate-50">
    <div className="text-center animate-in zoom-in-95 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-2xl">
      <RefreshCcw className="h-12 w-12 text-rose-500 mx-auto mb-4" />
      <h3 className="text-sm font-black text-slate-800 uppercase mb-2">Error de Conexión</h3>
      <p className="text-[10px] font-bold text-slate-400 uppercase mb-6">No se pudo sincronizar con la base de datos. Verifica tu internet.</p>
      <button onClick={onRetry} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">
        Reintentar Carga
      </button>
    </div>
  </div>
);

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState(false);
  
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [role, setRole] = useState<Role>('VIEWER');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [navigationState, setNavigationState] = useState<any>(null);

  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [destinos, setDestinos] = useState<Destination[]>([]);
  const [categories, setCategories] = useState<CategoryMaster[]>([]);
  const [locations, setLocations] = useState<LocationMaster[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);

  const loadGlobalData = async () => {
    setLoadingData(true);
    setDataError(false);
    try {
      const [p, m, c, d, cats, locs, s] = await Promise.all([
        api.getProducts(), api.getMovements(), api.getContacts(),
        api.getDestinos(), api.getCategoriesMaster(), api.getLocationsMaster(),
        api.getStats()
      ]);
      setProducts(p || []); setMovements(m || []); setContacts(c || []); setDestinos(d || []);
      setCategories(cats || []); setLocations(locs || []); setStats(s || null);
    } catch (e) {
      console.error("Failed to load global data", e);
      setDataError(true);
      throw e;
    } finally {
      setLoadingData(false);
    }
  };

  const fetchRole = async (email: string) => {
    try {
      const profile = await api.getCurrentUserProfile(email);
      setRole(profile ? profile.role : 'VIEWER');
    } catch (e) {
      console.warn("Error de red al sincronizar el rol. Usando la versión local.");
      setRole(localStorage.getItem('kardex_user_role') as Role || 'VIEWER');
    }
  };

  const navigateTo = (page: string, options: { push?: boolean; state?: any } = {}) => {
    const { push = true, state = null } = options;
    if (page === currentPage && JSON.stringify(state) === JSON.stringify(navigationState)) return;
    setCurrentPage(page); setNavigationState(state);
    if (isSidebarOpen) setIsSidebarOpen(false);
    if (push) {
      const url = new URL(window.location.href);
      url.search = ''; 
      if (page === 'productDetail' && state?.productId) url.searchParams.set('id', state.productId);
      window.history.pushState({ page, state }, "", url.toString());
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); setIsCommandPaletteOpen(prev => !prev); }};
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (event.state?.page) navigateTo(event.state.page, { push: false, state: event.state.state });
      else navigateTo('dashboard', { push: false });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    let authSubscriptionCleanup: (() => void) | undefined;

    const initAuth = async () => {
      setLoadingSession(true);
      try {
        const processSession = async (currentSession: any) => {
          if (currentSession) {
            setSession(currentSession);
            await Promise.all([fetchRole(currentSession.user.email!), loadGlobalData()]);
          } else {
            setLoadingData(false); // No session, so no data to load
          }
        };

        if (isSupabaseConfigured) {
          const { data: { session: initialSession } } = await supabase.auth.getSession();
          await processSession(initialSession);

          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            setSession(newSession);
            if (newSession) {
              await fetchRole(newSession.user.email!);
              await loadGlobalData();
            }
          });
          authSubscriptionCleanup = () => subscription.unsubscribe();
        } else {
          const localSession = localStorage.getItem('kardex_local_session');
          await processSession(localSession ? JSON.parse(localSession) : null);
        }
      } catch (err) {
        console.error("Error during app initialization:", err);
        setDataError(true);
      } finally {
        setLoadingSession(false);
      }
    };

    initAuth();

    return () => {
      authSubscriptionCleanup?.();
    };
  }, []);
  
  if (loadingSession) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin w-10 h-10 text-indigo-600" /></div>;
  if (!session) return <Login />;
  if (dataError) return <FullScreenError onRetry={loadGlobalData} />;

  const renderContent = () => {
    if (loadingData) return <div className="h-full flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-indigo-600" /></div>;
    
    switch (currentPage) {
      case 'productDetail': return <ProductDetail productId={navigationState?.productId} role={role} userEmail={session.user?.email} onBack={() => window.history.back()} onNavigate={navigateTo} />;
      case 'inventory': return <Inventory role={role} onNavigate={navigateTo} initialState={navigationState} onInitialStateConsumed={() => setNavigationState(null)} products={products} categories={categories} locations={locations} onDataRefresh={loadGlobalData} />;
      case 'kardex': return <Kardex role={role} userEmail={session.user?.email} initialState={navigationState} onInitialStateConsumed={() => setNavigationState(null)} products={products} movements={movements} destinos={destinos} locations={locations} onDataRefresh={loadGlobalData} />;
      case 'destinos': return <Destinos destinations={destinos} onDataRefresh={loadGlobalData} />;
      case 'reports': return <Reports onNavigate={navigateTo} products={products} movements={movements} />;
      case 'contacts': return <Contacts role={role} initialState={navigationState} onInitialStateConsumed={() => setNavigationState(null)} contacts={contacts} onDataRefresh={loadGlobalData} />;
      case 'categories': return <CategoryManagement role={role} categories={categories} onDataRefresh={loadGlobalData} />;
      case 'locations': return <LocationManagement role={role} locations={locations} onDataRefresh={loadGlobalData} />;
      case 'users': return role === 'ADMIN' ? <UsersPage /> : <Dashboard onNavigate={navigateTo} stats={stats} products={products} />;
      case 'audit': return role === 'ADMIN' ? <AuditPage /> : <Dashboard onNavigate={navigateTo} stats={stats} products={products} />;
      default: return <Dashboard onNavigate={navigateTo} stats={stats} products={products} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-inter animate-in fade-in duration-300">
      <Sidebar currentPage={currentPage} onNavigate={(p) => navigateTo(p, { push: true })} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} role={role} stats={stats} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} role={role} userEmail={session.user?.email} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 no-scrollbar"><div className="max-w-7xl mx-auto">{renderContent()}</div></main>
      </div>
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} onNavigate={navigateTo} />
      <NotificationContainer />
      <CustomDialog isOpen={showExitConfirm} title="Seguridad" message="¿Deseas cerrar la sesión y salir del sistema?" type="error" onConfirm={() => { if(isSupabaseConfigured) supabase.auth.signOut(); localStorage.clear(); window.location.reload(); }} onCancel={() => setShowExitConfirm(false)} confirmText="Cerrar Sesión" cancelText="Permanecer" />
    </div>
  );
}
