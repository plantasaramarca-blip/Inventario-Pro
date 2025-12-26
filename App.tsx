
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
import { Login } from './pages/Login.tsx';
import { Role, Product } from './types.ts';
import * as api from './services/supabaseService.ts';
import { Loader2, Package, MapPin, QrCode, ArrowLeft } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [role, setRole] = useState<Role>('ADMIN');
  const [publicProduct, setPublicProduct] = useState<Product | null>(null);
  const [loadingPublic, setLoadingPublic] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const viewProductId = urlParams.get('view_product');
    
    if (viewProductId) {
      setLoadingPublic(true);
      api.getProductById(viewProductId).then(p => {
        if (p) setPublicProduct(p);
        setLoadingPublic(false);
      });
    }

    const initAuth = async () => {
      try {
        if (isSupabaseConfigured) {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession) setSession(currentSession);
        } else {
          const localSession = localStorage.getItem('kardex_local_session');
          if (localSession) setSession(JSON.parse(localSession));
        }
      } finally { setLoading(false); }
    };
    initAuth();
  }, []);

  if (loading || loadingPublic) return (
    <div className="h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="animate-spin w-10 h-10 text-indigo-600" />
    </div>
  );

  if (publicProduct) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-black mb-4">{publicProduct.name}</h1>
        <p className="text-xl font-bold text-indigo-600 mb-8">Stock: {publicProduct.stock} {publicProduct.unit}</p>
        <button onClick={() => window.location.href = window.location.origin} className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold uppercase text-xs">Ir al Sistema</button>
      </div>
    );
  }

  if (!session) return <Login />;

  const renderContent = () => {
    switch (currentPage) {
      case 'inventory': return <Inventory role={role} />;
      case 'kardex': return <Kardex onNavigateToDestinos={() => setCurrentPage('destinos')} />;
      case 'destinos': return <Destinos />;
      case 'contacts': return <Contacts role={role} />;
      case 'audit': return role === 'ADMIN' ? <AuditPage /> : <Dashboard />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar currentPage={currentPage} onNavigate={setCurrentPage} isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} role={role} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Navbar onMenuClick={() => setIsSidebarOpen(true)} role={role} setRole={setRole} userEmail={session.user?.email || 'Admin Local'} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
           <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
}
