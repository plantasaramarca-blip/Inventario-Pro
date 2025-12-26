
import React, { useState } from 'https://esm.sh/react@19.2.3';
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { LogIn, Lock, Mail, Loader2, AlertCircle, UserPlus, Database, HardDrive, ArrowRight, ShieldCheck } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';
import * as api from '../services/supabaseService.ts';

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

    if (!isSupabaseConfigured) {
      setTimeout(() => {
        const userEmail = email || 'admin@local.com';
        const fakeSession = { user: { email: userEmail, id: 'local-id' } };
        localStorage.setItem('kardex_local_session', JSON.stringify(fakeSession));
        window.location.href = window.location.origin;
      }, 800);
      return;
    }

    try {
      if (isRegistering) {
        const { error: signUpError, data } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        
        // Crear perfil inicial como VIEWER para nuevos usuarios registrados
        try {
          await api.saveUser({ email, role: 'VIEWER' });
        } catch (e) { console.warn("No se pudo crear perfil inicial, asegúrese de tener la tabla profiles."); }
        
        setError("Cuenta creada. Verifique su correo para confirmar.");
        setIsRegistering(false);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[3rem] shadow-[0_40px_80px_-15px_rgba(0,0,0,0.1)] p-12 border border-slate-100 animate-in zoom-in-95 duration-500">
          <div className="text-center mb-10">
            <div className="bg-indigo-600 w-16 h-16 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-indigo-200">
               <ShieldCheck className="text-white w-8 h-8" />
            </div>
            <h2 className="text-3xl font-black text-slate-800 tracking-tight">Kardex Pro</h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Acceso Blindado al Sistema</p>
          </div>

          {error && (
            <div className={`mb-6 p-4 rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 ${error.includes('Verifique') ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
              <AlertCircle className="w-5 h-5 shrink-0" />
              <p className="text-xs font-bold leading-tight">{error}</p>
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative group">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="email" 
                required 
                className="w-full pl-12 pr-4 py-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                placeholder="Correo corporativo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            
            <div className="relative group">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
              <input 
                type="password" 
                required 
                className="w-full pl-12 pr-4 py-5 bg-slate-50 border-2 border-transparent rounded-[1.5rem] text-sm font-bold outline-none focus:border-indigo-500 focus:bg-white transition-all"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-[1.5rem] shadow-2xl shadow-indigo-200 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                <>
                  {isRegistering ? 'Crear Cuenta' : 'Entrar'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => { setIsRegistering(!isRegistering); setError(null); }}
              className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-600 transition-colors"
            >
              {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes acceso? Solicitar registro'}
            </button>
          </div>

          <div className="mt-12 flex items-center justify-center gap-6 opacity-30">
             <Database className="w-5 h-5" />
             <HardDrive className="w-5 h-5" />
             <LogIn className="w-5 h-5" />
          </div>
      </div>
    </div>
  );
};
