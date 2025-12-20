
import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../supabaseClient';
import { LogIn, Lock, Mail, Loader2, AlertCircle, UserPlus, Database, HardDrive, ArrowRight, Copy, Check } from 'https://esm.sh/lucide-react@^0.561.0';

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

    if (!isSupabaseConfigured) {
      setTimeout(() => {
        const fakeSession = { user: { email: email || 'admin@local.com' } };
        localStorage.setItem('kardex_local_session', JSON.stringify(fakeSession));
        window.location.reload();
      }, 800);
      return;
    }

    try {
      if (isRegistering) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        setError("¡Registro exitoso! Verifica tu correo o intenta iniciar sesión.");
        setIsRegistering(false);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;
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
              ? 'Usando almacenamiento de navegador por falta de configuración cloud.' 
              : 'Ingresa tus credenciales para continuar'}
          </p>

          {!isSupabaseConfigured && (
            <div className="mb-6 space-y-3">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-start">
                <HardDrive className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <p className="text-xs text-blue-800 font-bold mb-1">¡Modo Demo Activado!</p>
                  <p className="text-[10px] text-blue-700 leading-relaxed">
                    Puedes entrar con cualquier correo y clave. Los datos se guardarán localmente.
                  </p>
                </div>
              </div>

              <button 
                onClick={() => setShowGuide(!showGuide)}
                className="w-full flex items-center justify-center py-2 px-4 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-[11px] font-bold hover:bg-amber-100 transition-colors"
              >
                <AlertCircle className="w-3.5 h-3.5 mr-2" />
                {showGuide ? 'Ocultar guía de Vercel' : '¿Cómo configurar las variables en Vercel?'}
              </button>

              {showGuide && (
                <div className="bg-slate-900 rounded-xl p-4 text-white animate-in slide-in-from-top-2">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Guía rápida de Vercel</p>
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] text-slate-500 font-black">
                        <span>KEY (Nombre)</span>
                        <span className="text-indigo-400">Paso 1</span>
                      </div>
                      <div className="flex items-center bg-slate-800 p-2 rounded border border-slate-700">
                        <code className="text-[11px] text-indigo-300 flex-1">VITE_SUPABASE_URL</code>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px] text-slate-500 font-black">
                        <span>KEY (Nombre)</span>
                        <span className="text-indigo-400">Paso 2</span>
                      </div>
                      <div className="flex items-center bg-slate-800 p-2 rounded border border-slate-700">
                        <code className="text-[11px] text-indigo-300 flex-1">VITE_SUPABASE_ANON_KEY</code>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-800 flex items-center">
                    <AlertCircle className="w-3 h-3 text-amber-400 mr-2" />
                    <p className="text-[9px] text-slate-400 italic">No pongas la URL en el campo "Key". La URL va en el campo "Value".</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            {error && (
              <div className={`p-3 rounded-lg text-xs font-medium border ${error.includes('exitoso') ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Correo Electrónico</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="email" 
                  required 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="admin@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <input 
                  type="password" 
                  required 
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full ${!isSupabaseConfigured ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'} text-white font-bold py-3 rounded-lg shadow-lg transition-all flex items-center justify-center disabled:opacity-50`}
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (
                <span className="flex items-center">
                  {!isSupabaseConfigured && <HardDrive className="w-4 h-4 mr-2" />}
                  {isRegistering ? "Crear Cuenta" : (!isSupabaseConfigured ? "Entrar en Modo Local" : "Iniciar Sesión")}
                </span>
              )}
            </button>

            {isSupabaseConfigured && (
              <div className="text-center mt-4">
                <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-xs text-indigo-600 font-bold hover:underline">
                  {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
                </button>
              </div>
            )}
          </form>
        </div>
        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center flex items-center justify-center space-x-2">
          {isSupabaseConfigured ? <Database className="w-3 h-3 text-green-500" /> : <HardDrive className="w-3 h-3 text-blue-500" />}
          <p className="text-[10px] text-slate-400 font-medium">
            CONECTADO A: <span className={isSupabaseConfigured ? 'text-green-600' : 'text-blue-600'}>{isSupabaseConfigured ? 'SUPABASE CLOUD' : 'BROWSER STORAGE'}</span>
          </p>
        </div>
      </div>
    </div>
  );
};
