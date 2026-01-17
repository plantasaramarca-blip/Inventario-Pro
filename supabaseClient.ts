import { createClient } from '@supabase/supabase-js';

const getEnv = (key: string) => {
  if (typeof window !== 'undefined') {
    const viteEnv = (import.meta as any).env?.[key];
    if (viteEnv && !viteEnv.includes('placeholder')) return viteEnv;

    try {
      const procEnv = (process as any).env?.[key];
      if (procEnv && !procEnv.includes('placeholder')) return procEnv;
    } catch (e) { }

    const winEnv = (window as any).env?.[key];
    if (winEnv) return winEnv;
  }
  return null;
};

export const supabaseUrl = getEnv('VITE_SUPABASE_URL');
export const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Cliente con TIMEOUT AUMENTADO
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co',
  supabaseAnonKey || 'placeholder-key',
  {
    auth: {
      autoRefreshToken: false, // ← CAMBIAR a false
      persistSession: true,
      detectSessionInUrl: true,
      flowType: 'implicit'
    },
    global: {
      headers: {
        'x-client-info': 'kardex-pro'
      },
      fetch: (url, options = {}) => {
        // Timeout de 60 segundos (antes era ~10)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000);

        return fetch(url, {
          ...options,
          signal: controller.signal
        }).finally(() => clearTimeout(timeoutId));
      }
    },
    db: {
      schema: 'public'
    }
  }
);