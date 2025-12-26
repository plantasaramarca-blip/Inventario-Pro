import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient.ts';
import { LogIn, Lock, Mail, Loader2, AlertCircle, UserPlus, Database, HardDrive } from 'lucide-react';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // MODO LOCAL
    if (!isSupabaseConfigured) {
      setTimeout(() => {
        const userEmail = email || 'admin@local.com';
        const fakeSession = { user: { email: userEmail, id: 'local-id' } };
        localStorage.setItem('kardex_local_session', JSON.stringify(fakeSession));
        // Forzamos recarga para que App lo detecte
        window.location.href = window.location.origin;
      }, 800);
      return;
    }

    // MODO SUPABASE
    try {
      if (isRegistering) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setError("¡Registro exitoso! Verifica tu correo o intenta iniciar sesión.");
        setIsRegistering(false);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
        // La sesión se actualiza automáticamente por el listener de Supabase, 
        // pero recargamos para asegurar consistencia
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || "Error de conexión.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className="p-8">
          <div className="flex justify-center mb-6">
            <div className="bg-indigo-600 p-3 rounded-xl shadow-lg shadow-indigo-200">
              {isRegistering ? <UserPlus className="w-8 h-8 text-white" /> : <LogIn className="w-8 h-8 text-white" />}
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">
            {isSupabaseConfigured ? (isRegistering ? 'Crea tu cuenta' : 'Bienvenido a Kardex Pro') : 'Kardex Pro (Modo Local)'}
          </h2>
          
          <p className="text-center text-slate-500 mb-6 text-sm">
            {!isSupabaseConfigured 
              ? 'Usando almacenamiento de navegador.' 
              : 'Ingresa tus credenciales'}
          </p>

          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className={`p-3 rounded-lg text-xs font-medium border ${error.includes('exitoso') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  required 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                  placeholder="admin@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  required 
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg transition-all flex items-center justify-center disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                <span className="flex items-center">
                  {!isSupabaseConfigured && <HardDrive className="w-4 h-4 mr-2" />}
                  {isRegistering ? "Crear Cuenta" : "Iniciar Sesión"}
                </span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};