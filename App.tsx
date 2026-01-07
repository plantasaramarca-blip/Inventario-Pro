import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { Loader2 } from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';
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

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loadingSession, setLoadingSession] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [role, setRole] = useState<Role>('VIEWER');
  const [navigationState, setNavigationState] = useState<any>(null);

  // Global State for Master Data (for lazy loading)
  const [destinos, setDestinos] = useState<Destination[] | null>(null);
  const [categories, setCategories] = useState<CategoryMaster[] | null>(null);
  const [locations, setLocations] = useState<LocationMaster[] | null>(null);
  
  const dataLoadedRef = useRef(false);
  const { addNotification } = useNotification();
  
 // ===== BLOQUEO PERMANENTE DE SERVICE WORKERS =====
useEffect(() => {
  // Desregistrar existentes
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        console.log('🧹 Desregistrando SW:', registration.scope);
        registration.unregister();
      });
    });
    
    // Limpiar cachés
    if ('caches' in window) {
      caches.keys().then(cacheNames => {
        cacheNames.forEach(cacheName => {
          console.log('🧹 Eliminando cache:', cacheName);
          caches.delete(cacheName);
        });
      });
    }
    
    // BLOQUEAR cualquier intento futuro de registro
    const originalRegister = navigator.serviceWorker.register;
    navigator.serviceWorker.register = function() {
      console.log('🚫 Service Worker registration BLOCKED permanently');
      return Promise.reject(new Error('Service Worker deshabilitado'));
    };
    
    console.log('✅ Service Worker bloqueado permanentemente');
  }
}, []); // Solo una vez al montar
  
  // ===== MANEJO DE VISIBILITY CHANGE ====
  /*
 useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible' && session) {
       console.log('👁️ Usuario regresó a la app, verificando sesión...');
        
        if (isSupabaseConfigured) {
          supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            if (!currentSession) {
              console.log('❌ Sesión expirada, redirigiendo a login');
              setSession(null);
              addNotification('Sesión expirada. Por favor, inicia sesión nuevamente.', 'warning');
            } else {
              console.log('✅ Sesión válida');
            }
          }).catch(error => {
            console.error('Error al verificar sesión:', error);
          });
        }
      }
*/   }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session]);
  
  const fetchRole = async (email: string) => {
  // Primero usar localStorage
  const cachedRole = localStorage.getItem('kardex_user_role') as Role;
  if (cachedRole) {
    setRole(cachedRole);
    console.log('✅ Rol cargado desde localStorage:', cachedRole);
  }
  
  // Intentar actualizar desde Supabase en background (sin bloquear)
  try {
    const profile = await api.getCurrentUserProfile(email);
    const userRole = profile ? profile.role : 'VIEWER';
    
    // Solo actualizar si cambió
    if (userRole !== cachedRole) {
      setRole(userRole);
      localStorage.setItem('kardex_user_role', userRole);
      console.log('✅ Rol actualizado desde Supabase:', userRole);
    }
  } catch (e) {
    // Si falla, NO importa, ya tenemos el rol en localStorage
    console.log('⚠️ No se pudo sincronizar rol (usando localStorage)');
  }
};

 const loadInitialData = async (currentSession: any) => {
  if (!currentSession?.user?.email || dataLoadedRef.current) return;
  
  // NO bloquear la UI esperando el rol
  fetchRole(currentSession.user.email); // Sin await
  
  dataLoadedRef.current = true;
  setLoadingData(false); // Liberar UI inmediatamente
};
  
  const navigateTo = useCallback((page: string, options: { push?: boolean; state?: any } = {}) => {
    const { push = true, state = null } = options;
    if (page === currentPage && JSON.stringify(state) === JSON.stringify(navigationState)) return;
    setCurrentPage(page);
    setNavigationState(state);
    if (isSidebarOpen) setIsSidebarOpen(false);
    if (push) {
      const url = new URL(window.location.href);
      url.search = ''; 
      if (page === 'productDetail' && state?.productId) url.searchParams.set('id', state.productId);
      window.history.pushState({ page, state }, "", url.toString());
    }
  }, [currentPage, navigationState, isSidebarOpen]);

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
  }, [navigateTo]);

/*  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        setSession(currentSession);
        setLoadingSession(false);
        if(currentSession) loadInitialData(currentSession);
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
        setSession(newSession);
        if (event === 'SIGNED_OUT') {
          dataLoadedRef.current = false;
          setDestinos(null);
          setCategories(null);
          setLocations(null);
        }
      });
*/

useEffect(() => {
  if (isSupabaseConfigured) {
    console.log('🔵 Iniciando suscripción a Supabase Auth');
    
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log('🔵 Sesión inicial obtenida:', currentSession ? 'Existe' : 'No existe');
      setSession(currentSession);
      setLoadingSession(false);
      if(currentSession) loadInitialData(currentSession);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      console.log('🔴 onAuthStateChange triggereado:', event, newSession ? 'Con sesión' : 'Sin sesión');
      setSession(newSession);
      if (event === 'SIGNED_OUT') {
        console.log('🔴 Usuario cerró sesión');
        dataLoadedRef.current = false;
        setDestinos(null);
        setCategories(null);
        setLocations(null);
      }
    });

    return () => {
      console.log('🔵 Desuscribiendo de Supabase Auth');
      subscription.unsubscribe();
    };
  } else {
    console.log('🟡 Modo local (sin Supabase)');
    const localSession = localStorage.getItem('kardex_local_session');
    const currentSession = localSession ? JSON.parse(localSession) : null;
    setSession(currentSession);
    setLoadingSession(false);
    if (currentSession) loadInitialData(currentSession);
  }
}, []);

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

  const renderContent = () => {
    switch (currentPage) {
      case 'productDetail': return <ProductDetail productId={navigationState?.productId} role={role} userEmail={session.user?.email} onBack={() => window.history.back()} onNavigate={navigateTo} />;
      case 'inventory': return <Inventory role={role} userEmail={session.user?.email} onNavigate={navigateTo} initialState={navigationState} onInitialStateConsumed={() => setNavigationState(null)} categories={categories || []} setCategories={setCategories} locations={locations || []} setLocations={setLocations} />;
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
    </div>
  );
}
