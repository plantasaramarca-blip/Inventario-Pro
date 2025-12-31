
import React, { useState, useEffect, useMemo } from 'react';
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
import { ProductDetail } from './pages/ProductDetail.tsx'; // Importación de la nueva página
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
  const { addNotification } = useNotification();

  const fetchRole = async (email: string) => {
    try {
      const profile = await api.getCurrentUserProfile(email);
      if (profile) {
        setRole(profile.role);
      } else {
        setRole('VIEWER');
        addNotification('Rol no verificado, se asignó acceso de solo lectura.', 'info');
      }
    } catch (e) {
      setRole('VIEWER');
      addNotification('Error de red al verificar permisos. Acceso de solo lectura.', 'error');
    }
  };

  const navigateTo = (page: string, pushState = true) => {
    if (page === currentPage) return;
    setCurrentPage(page);
    if (isSidebarOpen) setIsSidebarOpen(false);
    if (pushState) {
      const url = new URL(window.location.href);
      url.search = ''; // Limpia los parámetros de la URL para evitar bucles
      window.history.pushState({ page }, "", url.pathname);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => { if (document.visibilityState === 'visible' && isSupabaseConfigured) { supabase.auth.getSession(); } };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const initAuth = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const productIdFromUrl = urlParams.get('id');
        
        if (isSupabaseConfigured) {
          const { data: { session: initialSession } } = await supabase.auth.getSession();
          if (initialSession) {
            setSession(initialSession);
            await fetchRole(initialSession.user.email!);
            if (productIdFromUrl) {
              setScannedProductId(productIdFromUrl);
              navigateTo('productDetail', false);
            }
          }
          
          const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
            setSession(newSession);
            if (newSession && newSession.user.email) {
              await fetchRole(newSession.user.email);
              // Lógica para QR después de iniciar sesión
              const params = new URLSearchParams(window.location.search);
              if (params.get('id') && currentPage !== 'productDetail') {
                 setScannedProductId(params.get('id'));
                 navigateTo('productDetail');
              }
            }
          });
          
          return () => { subscription.unsubscribe(); document.removeEventListener('visibilitychange', handleVisibilityChange); };
        } else {
          const localSession = localStorage.getItem('kardex_local_session');
          if (localSession) {
            const parsed = JSON.parse(localSession);
            setSession(parsed); await fetchRole(parsed.user.email);
            if (productIdFromUrl) {
              setScannedProductId(productIdFromUrl);
              navigateTo('productDetail', false);
            }
          }
        }
      } catch (e) {} finally { setLoading(false); }
    };
    const unsubscribePromise = initAuth();
    
    window.history.replaceState({ page: 'dashboard' }, "", "");
    const handlePopState = (event: PopStateEvent) => {
      if (event.state && event.state.page) navigateTo(event.state.page, false);
      else navigateTo('dashboard', false);
    };
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
      unsubscribePromise.then(cleanup => { if (typeof cleanup === 'function') cleanup(); });
    };
  }, []); // El array de dependencias se deja vacío para que solo se ejecute una vez

  const handleFinalExit = async () => {
    if (isSupabaseConfigured) await supabase.auth.signOut();
    localStorage.removeItem('kardex_local_session');
    window.location.reload();
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin w-10 h-10 text-indigo-600" /></div>;
  if (!session) return <Login />;

  const renderContent = () => {
    switch (currentPage) {
      case 'productDetail': return <ProductDetail productId={scannedProductId} role={role} userEmail={session.user?.email} onBack={() => navigateTo('inventory')} />;
      case 'inventory': return <Inventory role={role} />;
      case 'kardex': return <Kardex role={role} userEmail={session.user?.email} />;
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
      <Sidebar currentPage={currentPage} onNavigate={(p) => navigateTo(p)} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} role={role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} role={role} userEmail={session.user?.email} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 no-scrollbar"><div className="max-w-7xl mx-auto">{renderContent()}</div></main>
      </div>
      <NotificationContainer />
      <CustomDialog isOpen={showExitConfirm} title="Seguridad" message="¿Deseas cerrar la sesión y salir del sistema?" type="error" onConfirm={handleFinalExit} onCancel={() => setShowExitConfirm(false)} confirmText="Cerrar Sesión" cancelText="Permanecer" />
    </div>
  );
}
