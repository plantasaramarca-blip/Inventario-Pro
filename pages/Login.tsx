
import React, { useState } from 'https://esm.sh/react@19.2.3';
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { LogIn, Lock, Mail, Loader2, AlertCircle, UserPlus, Database, HardDrive, ArrowRight } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

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
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setError("Verifica tu correo electrónico.");
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-slate-100">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-black text-slate-800">Kardex Pro</h2>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-tighter">Acceso al Sistema</p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <input 
              type="email" 
              required 
              className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Correo electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <input 
              type="password" 
              required 
              className="w-full p-4 bg-slate-50 border border-transparent rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500"
              placeholder="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-indigo-100"
            >
              {loading ? <Loader2 className="animate-spin mx-auto w-5 h-5" /> : "Entrar"}
            </button>
          </form>
      </div>
    </div>
  );
};
