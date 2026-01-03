
import React, { useState, useEffect, useRef } from 'react';
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
import { Role, Product, Destination, CategoryMaster, LocationMaster, InventoryStats } from './types.ts';
import * as api from './services/supabaseService.ts';
import { Loader2, RefreshCcw, DownloadCloud } from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';
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
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState(false);
  
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [role, setRole] = useState<Role>('VIEWER');
  const [navigationState, setNavigationState] = useState<any>(null);

  // Global State for Master Data (for lazy loading)
  const [destinos, setDestinos] = useState<Destination[] | null>(null);
  const [categories, setCategories] = useState<CategoryMaster[] | null>(null);
  const [locations, setLocations] = useState<LocationMaster[] | null>(null);
  
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const dataLoadedRef = useRef(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => { window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt); };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`User response: ${outcome}`);
    setInstallPrompt(null);
  };
  
  const fetchRole = async (email: string) => {
    try {
      const profile = await api.getCurrentUserProfile(email);
      const userRole = profile ? profile.role : 'VIEWER';
      setRole(userRole);
      localStorage.setItem('kardex_user_role', userRole);
    } catch (e) {
      console.warn("Error de red al sincronizar el rol. Usando la versión local.");
      setRole(localStorage.getItem('kardex_user_role') as Role || 'VIEWER');
      throw e;
    }
  };

  const loadInitialData = async (currentSession: any) => {
    if (!currentSession?.user?.email) return;
    if (dataLoadedRef.current) return;
    setLoadingData(true);
    setDataError(false);
    try {
      await fetchRole(currentSession.user.email);
      dataLoadedRef.current = true;
    } catch (e) {
      console.error("Failed to load user profile", e);
      setDataError(true);
    } finally {
      setLoadingData(false);
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
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        setSession(currentSession);
        setLoadingSession(false);
        if(currentSession) loadInitialData(currentSession);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
        if (JSON.stringify(session) !== JSON.stringify(newSession)) {
          if (!newSession) { // User logged out
            dataLoadedRef.current = false;
            setDestinos(null); setCategories(null); setLocations(null);
          }
          setSession(newSession);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      const localSession = localStorage.getItem('kardex_local_session');
      const currentSession = localSession ? JSON.parse(localSession) : null;
      setSession(currentSession);
      setLoadingSession(false);
      if (currentSession) loadInitialData(currentSession);
    }
  }, []);
  
  const handleLoginSuccess = (newSession: any) => {
    setSession(newSession);
    loadInitialData(newSession);
  };
  
  const handleLogout = async () => {
    if (isSupabaseConfigured) {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('kardex_local_session');
      setSession(null);
    }
    dataLoadedRef.current = false;
    setCurrentPage('dashboard');
  };

  const clearCache = (keys: Array<'destinos' | 'categories' | 'locations'>) => {
    keys.forEach(key => {
      if (key === 'destinos') setDestinos(null);
      if (key === 'categories') setCategories(null);
      if (key === 'locations') setLocations(null);
    });
  };

  if (loadingSession || (session && loadingData)) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin w-10 h-10 text-indigo-600" /></div>;
  if (!session) return <Login onLoginSuccess={handleLoginSuccess} />;
  if (dataError) return <FullScreenError onRetry={() => loadInitialData(session)} />;

  const renderContent = () => {
    switch (currentPage) {
      case 'productDetail': return <ProductDetail productId={navigationState?.productId} role={role} userEmail={session.user?.email} onBack={() => window.history.back()} onNavigate={navigateTo} />;
      case 'inventory': return <Inventory role={role} onNavigate={navigateTo} initialState={navigationState} onInitialStateConsumed={() => setNavigationState(null)} categories={categories || []} setCategories={setCategories} locations={locations || []} setLocations={setLocations} />;
      case 'kardex': return <Kardex role={role} userEmail={session.user?.email} initialState={navigationState} onInitialStateConsumed={() => setNavigationState(null)} destinos={destinos || []} setDestinos={setDestinos} locations={locations || []} setLocations={setLocations} />;
      case 'destinos': return <Destinos destinations={destinos} setDestinations={setDestinos} onCacheClear={clearCache} />;
      case 'reports': return <Reports onNavigate={navigateTo} />;
      case 'contacts': return <Contacts role={role} initialState={navigationState} onInitialStateConsumed={() => setNavigationState(null)} />;
      case 'categories': return <CategoryManagement role={role} categories={categories} setCategories={setCategories} onCacheClear={clearCache} />;
      case 'locations': return <LocationManagement role={role} locations={locations} setLocations={setLocations} onCacheClear={clearCache} />;
      case 'users': return role === 'ADMIN' ? <UsersPage /> : <Dashboard onNavigate={navigateTo} />;
      case 'audit': return role === 'ADMIN' ? <AuditPage /> : <Dashboard onNavigate={navigateTo} />;
      default: return <Dashboard onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-inter animate-in fade-in duration-300">
      <Sidebar currentPage={currentPage} onNavigate={(p) => navigateTo(p, { push: true })} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} role={role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} role={role} userEmail={session.user?.email} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 no-scrollbar"><div className="max-w-7xl mx-auto">{renderContent()}</div></main>
      </div>
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} onNavigate={navigateTo} />
      <NotificationContainer />
      {installPrompt && (
        <div className="fixed bottom-8 right-8 z-[100] animate-in slide-in-from-bottom-10">
          <button onClick={handleInstallClick} className="bg-indigo-600 text-white px-6 py-4 rounded-full text-sm font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl hover:bg-indigo-700 active:scale-95 ring-4 ring-white/20">
            <DownloadCloud className="w-5 h-5" /> Instalar App
          </button>
        </div>
      )}
    </div>
  );
}