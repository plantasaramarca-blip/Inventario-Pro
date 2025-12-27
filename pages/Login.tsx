
import React, { useState } from 'https://esm.sh/react@19.2.3';
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { LogIn, Lock, Mail, Loader2, AlertCircle, ArrowRight, ShieldCheck } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';
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
        window.location.reload(); // Solo recarga en modo local
      }, 800);
      return;
    }

    try {
      if (isRegistering) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        try {
          await api.saveUser({ email, role: 'VIEWER' });
        } catch (e) {}
        setError("Cuenta creada. Verifique su correo para confirmar.");
        setIsRegistering(false);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        // El listener de App.tsx se encargará de cargar la aplicación
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2rem] sm:rounded-[3rem] shadow-2xl p-6 sm:p-12 border border-slate-100 animate-in zoom-in-95 duration-500">
          <div className="text-center mb-8">
            <div className="bg-indigo-600 w-12 h-12 sm:w-16 sm:h-16 rounded-2xl sm:rounded-3xl mx-auto mb-4 sm:mb-6 flex items-center justify-center shadow-xl">
               <ShieldCheck className="text-white w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Kardex Pro</h2>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Acceso al Sistema</p>
          </div>

          {error && (
            <div className={`mb-6 p-4 rounded-xl text-xs font-bold border ${error.includes('Verifique') ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
              <AlertCircle className="w-4 h-4 inline mr-2 shrink-0" /> {error}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input type="email" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all" placeholder="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300" />
              <input type="password" required className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold outline-none focus:border-indigo-500 transition-all" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button type="submit" disabled={loading} className="w-full py-4 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin w-4 h-4" /> : <>{isRegistering ? 'Crear Cuenta' : 'Entrar'} <ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <div className="mt-8 text-center">
            <button onClick={() => setIsRegistering(!isRegistering)} className="text-[10px] font-black uppercase text-slate-400 hover:text-indigo-600 transition-colors">
              {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes acceso? Registrarse'}
            </button>
          </div>
      </div>
    </div>
  );
};
