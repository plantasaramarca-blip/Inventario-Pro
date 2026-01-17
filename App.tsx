'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabaseClient';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('./views/Dashboard').then(mod => mod.Dashboard), { ssr: false });
const Inventory = dynamic(() => import('./views/Inventory').then(mod => mod.Inventory), { ssr: false });
const Kardex = dynamic(() => import('./views/Kardex').then(mod => mod.Kardex), { ssr: false });
const Contacts = dynamic(() => import('./views/Contacts').then(mod => mod.Contacts), { ssr: false });
const Destinos = dynamic(() => import('./views/Destinos').then(mod => mod.Destinos), { ssr: false });
const Reports = dynamic(() => import('./views/Reports').then(mod => mod.Reports), { ssr: false });
const AuditPage = dynamic(() => import('./views/AuditLog').then(mod => mod.AuditPage), { ssr: false });
const UsersPage = dynamic(() => import('./views/Users').then(mod => mod.UsersPage), { ssr: false });
const CategoryManagement = dynamic(() => import('./views/Categories').then(mod => mod.CategoryManagement), { ssr: false });
const LocationManagement = dynamic(() => import('./views/Locations').then(mod => mod.LocationManagement), { ssr: false });
const Login = dynamic(() => import('./views/Login').then(mod => mod.Login), { ssr: false });
const ProductDetail = dynamic(() => import('./views/ProductDetail').then(mod => mod.ProductDetail), { ssr: false });
import { CommandPalette } from './components/CommandPalette';
import { Role, Product, Destination, CategoryMaster, LocationMaster, InventoryStats } from './types';
import * as api from './services/supabaseService';
import { Loader2 } from 'lucide-react';
import { CustomDialog } from './components/CustomDialog';
import { useNotification } from './contexts/NotificationContext';
import { Toast } from './components/Toast';
import { SupabaseDiagnostic } from './components/SupabaseDiagnostic';

const NotificationContainer = () => {
  const { notifications, removeNotification } = useNotification();
  return (
    <div className="fixed top-6 right-6 z-[2000] w-full max-w-sm space-y-3">
      {notifications.map((n) => (<Toast key={n.id} notification={n} onClose={removeNotification} />))}
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
  const [navigationStack, setNavigationStack] = useState<string[]>(['dashboard']);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const [destinos, setDestinos] = useState<Destination[] | null>(null);
  const [categories, setCategories] = useState<CategoryMaster[] | null>(null);
  const [locations, setLocations] = useState<LocationMaster[] | null>(null);
  const [stats, setStats] = useState<InventoryStats | null>(null);

  const dataLoadedRef = useRef(false);
  const { addNotification } = useNotification();

  // ===== DESREGISTRO AGRESIVO DE SERVICE WORKERS =====
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
          console.log('🧹 Desregistrando service worker:', registration.scope);
          registration.unregister();
        });
      });

      if ('caches' in window) {
        caches.keys().then(cacheNames => {
          cacheNames.forEach(cacheName => {
            console.log('🧹 Eliminando cache:', cacheName);
            caches.delete(cacheName);
          });
        });
      }

      const originalRegister = navigator.serviceWorker.register;
      navigator.serviceWorker.register = function () {
        console.log('🚫 Service Worker registration BLOCKED permanently');
        return Promise.reject(new Error('Service Worker deshabilitado'));
      };

      console.log('✅ Service Worker bloqueado permanentemente');
    }
  }, []);

  const fetchRole = async (email: string) => {
    const cachedRole = localStorage.getItem('kardex_user_role') as Role;
    if (cachedRole) {
      setRole(cachedRole);
      console.log('✅ Rol cargado desde localStorage:', cachedRole);
    }

    try {
      const profile = await api.getCurrentUserProfile(email);
      const userRole = profile ? profile.role : 'VIEWER';

      if (userRole !== cachedRole) {
        setRole(userRole);
        localStorage.setItem('kardex_user_role', userRole);
        console.log('✅ Rol actualizado desde Supabase:', userRole);
      }
    } catch (e) {
      console.log('⚠️ No se pudo sincronizar rol (usando localStorage)');
    }
  };

  const loadInitialData = async (currentSession: any) => {
    if (!currentSession?.user?.email || dataLoadedRef.current) return;

    fetchRole(currentSession.user.email);

    // Cargar estadísticas
    const statsData = await api.getStats();
    setStats(statsData);

    dataLoadedRef.current = true;
    setLoadingData(false);
  };

  const navigateTo = useCallback((page: string, options: { push?: boolean; state?: any } = {}) => {
    const { push = true, state = null } = options;
    if (page === currentPage && JSON.stringify(state) === JSON.stringify(navigationState)) return;

    setCurrentPage(page);
    setNavigationState(state);
    if (isSidebarOpen) setIsSidebarOpen(false);

    if (push) {
      setNavigationStack(prev => [...prev, page]);
      const url = new URL(window.location.href);
      url.search = '';
      if (page === 'productDetail' && state?.productId) url.searchParams.set('id', state.productId);
      window.history.pushState({ page, state }, "", url.toString());
    }
  }, [currentPage, navigationState, isSidebarOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ===== NAVEGACIÓN INTERNA CON BOTÓN ATRÁS =====
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      event.preventDefault();

      // Si hay más de una página en el stack, volver atrás
      if (navigationStack.length > 1) {
        const newStack = [...navigationStack];
        newStack.pop(); // Quitar la página actual
        const previousPage = newStack[newStack.length - 1];

        setNavigationStack(newStack);
        setCurrentPage(previousPage);
        setNavigationState(event.state?.state || null);
      } else {
        // Si estamos en dashboard (inicio), mostrar diálogo de cerrar sesión
        setShowLogoutDialog(true);
        // Mantener la historia para evitar salir accidentalmente
        window.history.pushState({ page: currentPage, state: navigationState }, "", window.location.href);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [navigationStack, currentPage, navigationState]);

  useEffect(() => {
    if (isSupabaseConfigured) {
      console.log('🔵 Iniciando suscripción a Supabase Auth');

      supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
        console.log('🔵 Sesión inicial obtenida:', currentSession ? 'Existe' : 'No existe');
        setSession(currentSession);
        setLoadingSession(false);
        if (currentSession) loadInitialData(currentSession);
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
    setNavigationStack(['dashboard']);
    setShowLogoutDialog(false);
  };

  const clearCache = (keys: Array<'destinos' | 'categories' | 'locations'>) => {
    keys.forEach(key => {
      if (key === 'destinos') setDestinos(null);
      if (key === 'categories') setCategories(null);
      if (key === 'locations') setLocations(null);
    });
  };

  if (loadingSession || (session && loadingData)) {
    return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin w-10 h-10 text-indigo-600" /></div>;
  }

  if (!session) return <Login onLoginSuccess={handleLoginSuccess} />;

  const renderContent = () => {
    switch (currentPage) {
      case 'productDetail':
        return <ProductDetail productId={navigationState?.productId} role={role} userEmail={session.user?.email} onBack={() => window.history.back()} onNavigate={navigateTo} />;
      case 'inventory':
        return <Inventory role={role} userEmail={session.user?.email} onNavigate={navigateTo} initialState={navigationState} onInitialStateConsumed={() => setNavigationState(null)} categories={categories || []} setCategories={setCategories} locations={locations || []} setLocations={setLocations} />;
      case 'kardex':
        return <Kardex role={role} userEmail={session.user?.email} initialState={navigationState} onInitialStateConsumed={() => setNavigationState(null)} destinos={destinos || []} setDestinos={setDestinos} locations={locations || []} setLocations={setLocations} />;
      case 'destinos':
        return <Destinos destinations={destinos} setDestinations={setDestinos} onCacheClear={clearCache} />;
      case 'reports':
        return <Reports onNavigate={navigateTo} />;
      case 'contacts':
        return <Contacts role={role} initialState={navigationState} onInitialStateConsumed={() => setNavigationState(null)} />;
      case 'categories':
        return <CategoryManagement role={role} categories={categories} setCategories={setCategories} onCacheClear={clearCache} />;
      case 'locations':
        return <LocationManagement role={role} locations={locations} setLocations={setLocations} onCacheClear={clearCache} />;
      case 'users':
        return role === 'ADMIN' ? <UsersPage /> : <Dashboard onNavigate={navigateTo} />;
      case 'audit':
        return role === 'ADMIN' ? <AuditPage /> : <Dashboard onNavigate={navigateTo} />;
      default:
        return <Dashboard onNavigate={navigateTo} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-inter animate-in fade-in duration-300">
      <Sidebar currentPage={currentPage} onNavigate={(p) => navigateTo(p, { push: true })} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} role={role} stats={stats} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} role={role} userEmail={session.user?.email} onLogout={handleLogout} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 no-scrollbar">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>
      </div>
      <CommandPalette isOpen={isCommandPaletteOpen} onClose={() => setIsCommandPaletteOpen(false)} onNavigate={navigateTo} />
      <SupabaseDiagnostic />
      <NotificationContainer />

      {/* Diálogo de cerrar sesión */}
      <CustomDialog
        isOpen={showLogoutDialog}
        title="¿Cerrar Sesión?"
        message="¿Estás seguro que deseas cerrar tu sesión?"
        type="warning"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutDialog(false)}
        confirmText="Sí, Cerrar Sesión"
        cancelText="Cancelar"
      />
    </div>
  );
}
