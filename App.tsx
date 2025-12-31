
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
import { Role } from './types.ts';
import * as api from './services/supabaseService.ts';
import { Loader2 } from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';
import { CustomDialog } from './components/CustomDialog.tsx';
import { useNotification } from './contexts/NotificationContext.tsx';
import { Toast } from './components/Toast.tsx';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();
  return (
    <div className="fixed top-6 right-6 z-[2000] w-full max-w-sm space-y-3">
      {notifications.map((n) => (
        <Toast key={n.id} notification={n} onClose={removeNotification} />
      ))}
    </div>
  );
};

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<Role>('VIEWER');
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [scannedProductId, setScannedProductId] = useState<string | null>(null);
  const [navigationState, setNavigationState] = useState<any>(null);

  const fetchRole = async (email: string) => {
    const cachedRole = localStorage.getItem('kardex_user_role');
    if (cachedRole) setRole(cachedRole as Role);
    try {
      const profile = await api.getCurrentUserProfile(email);
      if (profile) setRole(profile.role);
      else if (!cachedRole) setRole('VIEWER');
    } catch (e) {
      console.warn("Error de red al sincronizar el rol. Usando la versión local.");
    }
  };

  const navigateTo = (page: string, options: { push?: boolean; state?: any } = {}) => {
    const { push = true, state = null } = options;

    if (page === currentPage && JSON.stringify(state) === JSON.stringify(navigationState)) return;

    setCurrentPage(page);
    setNavigationState(state);
    if (isSidebarOpen) setIsSidebarOpen(false);

    if (push) {
      const url = new URL(window.location.origin + window.location.pathname);
      const productId = state?.productId || state?.prefill?.product?.id || scannedProductId;
      
      if (page === 'productDetail' && productId) {
        url.searchParams.set('id', productId);
      }
      
      window.history.pushState({ page, state }, "", url.toString());
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible' && isSupabaseConfigured) { supabase.auth.getSession(); } };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const initAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const productIdFromUrl = urlParams.get('id');
        
        const processSession = async (currentSession: any) => {
          if (currentSession) {
            setSession(currentSession);
            await fetchRole(currentSession.user.email!);
            if (productIdFromUrl && !scannedProductId) {
              setScannedProductId(productIdFromUrl);
              // Create synthetic history for QR code entry to allow backing out to inventory
              window.history.replaceState({ page: 'inventory' }, "", window.location.pathname);
              navigateTo('productDetail', { push: true, state: { productId: productIdFromUrl } });
            }
          }
        };

        if (isSupabaseConfigured) {
          const { data: { session: initialSession } } = await supabase.auth.getSession();
          await processSession(initialSession);
          
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => { await processSession(newSession); });
          return () => { subscription.unsubscribe(); };
        } else {
          const localSession = localStorage.getItem('kardex_local_session');
          if (localSession) await processSession(JSON.parse(localSession));
        }
      } catch (e) {} finally { setLoading(false); }
    };
    
    const unsubscribePromise = initAuth();
    
    // Set initial history state only if not coming from a QR code link
    const urlParams = new URLSearchParams(window.location.search);
    if (!urlParams.get('id')) {
        window.history.replaceState({ page: currentPage }, "", window.location.pathname);
    }
    
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.page) {
        navigateTo(event.state.page, { push: false, state: event.state.state });
      }
    };
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      unsubscribePromise.then(cleanup => { if (typeof cleanup === 'function') cleanup(); });
    };
  }, []);

  const handleFinalExit = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    localStorage.removeItem('kardex_local_session');
    localStorage.removeItem('kardex_user_role');
    window.location.reload();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin w-10 h-10 text-indigo-600" /></div>;
  if (!session) return <Login />;

  const renderContent = () => {
    switch (currentPage) {
      case 'productDetail': return <ProductDetail productId={navigationState?.productId || scannedProductId} role={role} userEmail={session.user?.email} onBack={() => window.history.back()} onNavigate={navigateTo} />;
      case 'inventory': return <Inventory role={role} />;
      case 'kardex': return <Kardex role={role} userEmail={session.user?.email} initialState={navigationState} onInitialStateConsumed={() => setNavigationState(null)} />;
      case 'destinos': return <Destinos />;
      case 'reports': return <Reports />;
      case 'contacts': return <Contacts role={role} />;
      case 'categories': return <CategoryManagement role={role} />;
      case 'locations': return <LocationManagement role={role} />;
      case 'users': return role === 'ADMIN' ? <UsersPage /> : <Dashboard />;
      case 'audit': return role === 'ADMIN' ? <AuditPage /> : <Dashboard />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-inter animate-in fade-in duration-300">
      <Sidebar currentPage={currentPage} onNavigate={(p) => navigateTo(p, { push: true })} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} role={role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} role={role} userEmail={session.user?.email} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 no-scrollbar"><div className="max-w-7xl mx-auto">{renderContent()}</div></main>
      </div>
      <NotificationContainer />
      <CustomDialog isOpen={showExitConfirm} title="Seguridad" message="¿Deseas cerrar la sesión y salir del sistema?" type="error" onConfirm={handleFinalExit} onCancel={() => setShowExitConfirm(false)} confirmText="Cerrar Sesión" cancelText="Permanecer" />
    </div>
  );
}
