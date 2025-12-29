
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
import { Role, Product } from './types.ts';
import * as api from './services/supabaseService.ts';
import { Loader2, Zap, ArrowRight, Package } from 'lucide-react';

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

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data: { session: initialSession } } = await supabase.auth.getSession();
          if (initialSession) {
            setSession(initialSession);
            await fetchRole(initialSession.user.email!);
          }
          supabase.auth.onAuthStateChange(async (event, newSession) => {
            if (newSession) {
              setSession(newSession);
              if (newSession.user.email) await fetchRole(newSession.user.email);
            } else {
              setSession(null);
            }
          });
        } else {
          const localSession = localStorage.getItem('kardex_local_session');
          if (localSession) {
            const parsed = JSON.parse(localSession);
            setSession(parsed);
            await fetchRole(parsed.user.email);
          }
        }
      } catch (e) {
        console.error("Auth init error:", e);
      } finally {
        setLoading(false);
      }
    };
    initAuth();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin w-10 h-10 text-indigo-600" /></div>;
  if (!session) return <Login />;

  const navigateTo = (page: string) => { 
    setCurrentPage(page); 
    if (isSidebarOpen) setIsSidebarOpen(false);
  };

  const renderContent = () => {
    switch (currentPage) {
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
    <div className="flex h-screen overflow-hidden bg-slate-50 font-inter">
      <Sidebar currentPage={currentPage} onNavigate={navigateTo} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} role={role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} role={role} setRole={setRole} userEmail={session.user?.email} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 no-scrollbar"><div className="max-w-7xl mx-auto">{renderContent()}</div></main>
      </div>
    </div>
  );
}
