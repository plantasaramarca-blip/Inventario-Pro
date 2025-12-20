
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { LogIn, Lock, Mail, Loader2, AlertCircle, UserPlus } from 'https://esm.sh/lucide-react@^0.561.0';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [envMissing, setEnvMissing] = useState(false);

  useEffect(() => {
    // Verificar si las variables de entorno parecen estar presentes
    const url = (import.meta as any).env?.VITE_SUPABASE_URL;
    if (!url || url.includes('placeholder')) {
      setEnvMissing(true);
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegistering) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) throw signUpError;
        setError("¡Registro exitoso! Por favor, verifica tu correo (revisa spam) o intenta iniciar sesión.");
        setIsRegistering(false);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
      }
    } catch (err: any) {
      console.error("Error de autenticación:", err);
      // Mostrar el mensaje real de Supabase para diagnóstico
      setError(err.message || "Ocurrió un error inesperado.");
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
            {isRegistering ? 'Crea tu cuenta' : 'Bienvenido a Kardex Pro'}
          </h2>
          <p className="text-center text-slate-500 mb-8 text-sm">
            {isRegistering ? 'Registra un nuevo usuario de acceso' : 'Ingresa tus credenciales para continuar'}
          </p>

          {envMissing && (
            <div className="mb-6 bg-amber-50 border border-amber-200 p-3 rounded-lg flex items-start">
              <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 mr-2 flex-shrink-0" />
              <p className="text-[11px] text-amber-800 font-medium">
                Configuración incompleta: No se detectan VITE_SUPABASE_URL o KEY. Revisa las variables de entorno en Vercel.
              </p>
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
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
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading || envMissing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg shadow-lg shadow-indigo-200 transition-all flex items-center justify-center disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (isRegistering ? "Crear Cuenta" : "Iniciar Sesión")}
            </button>

            <div className="text-center mt-4">
              <button 
                type="button"
                onClick={() => setIsRegistering(!isRegistering)}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate aquí'}
              </button>
            </div>
          </form>
        </div>
        <div className="bg-slate-50 p-4 border-t border-slate-100 text-center">
          <p className="text-xs text-slate-400">Sistema de Inventario v1.1.2 • Supabase Auth</p>
        </div>
      </div>
    </div>
  );
};
