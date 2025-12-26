
import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { LogIn, Lock, Mail, Loader2, AlertCircle, UserPlus, Database, HardDrive, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // MODO LOCAL (Simulación para cuando no hay Supabase configurado)
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        const userEmail = email || 'admin@local.com';
        const fakeSession = { user: { email: userEmail, id: 'local-id' } };
        localStorage.setItem('kardex_local_session', JSON.stringify(fakeSession));
        window.location.href = window.location.origin;
      }, 800);
      return;
    }

    // MODO SUPABASE CLOUD
    try {
      if (isRegistering) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        
        // Supabase por defecto requiere confirmar email. 
        // Si ya existe el usuario, devuelve el error que viste.
        setError("¡Registro iniciado! Si el correo es nuevo, verifica tu bandeja de entrada.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        // El listener en App.tsx detectará el cambio automáticamente
      }
    } catch (err: any) {
      if (err.message === "User already registered") {
        setError("Este correo ya está registrado. Por favor, selecciona 'Iniciar Sesión' arriba.");
      } else {
        setError(err.message || "Error de conexión. Revisa tus datos.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100">
        
        {/* Pestañas de Navegación */}
        <div className="flex p-2 bg-slate-50 m-6 rounded-2xl border border-slate-200">
          <button 
            onClick={() => { setIsRegistering(false); setError(null); }}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${!isRegistering ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <LogIn className="w-4 h-4" /> Iniciar Sesión
          </button>
          <button 
            onClick={() => { setIsRegistering(true); setError(null); }}
            className={`flex-1 py-3 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${isRegistering ? 'bg-white shadow-md text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <UserPlus className="w-4 h-4" /> Crear Cuenta
          </button>
        </div>

        <div className="px-10 pb-10 pt-4">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {isRegistering ? 'Únete a Kardex Pro' : 'Hola de nuevo'}
            </h2>
            <p className="text-slate-400 text-xs font-medium mt-1 uppercase tracking-tighter">
              {isRegistering ? 'Registra tu empresa o almacén' : 'Ingresa tus credenciales de acceso'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className={`p-4 rounded-2xl text-[10px] font-black uppercase tracking-tight border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 ${error.includes('registrado') || error.includes('Error') ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo Electrónico</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-4 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="email" 
                  required 
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
                  placeholder="ejemplo@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-4 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="password" 
                  required 
                  minLength={6}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all shadow-inner"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50 mt-6"
            >
              {loading ? (
                <Loader2 className="animate-spin w-5 h-5" />
              ) : (
                <>
                  {isRegistering ? "Confirmar Registro" : "Acceder al Sistema"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-slate-50 p-6 border-t border-slate-100 flex items-center justify-center gap-3 text-[9px] font-black uppercase text-slate-400 tracking-widest">
          {isSupabaseConfigured ? (
            <><Database className="w-4 h-4 text-emerald-500" /> Cloud Sync Active</>
          ) : (
            <><HardDrive className="w-4 h-4 text-amber-500" /> Local Storage Mode</>
          )}
        </div>
      </div>
    </div>
  );
};
