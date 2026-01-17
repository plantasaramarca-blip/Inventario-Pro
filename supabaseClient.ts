import { createClient } from '@supabase/supabase-js';

// Variables de entorno para Next.js
// IMPORTANTE: En Next.js, process.env se reemplaza en tiempo de build
// Las variables NEXT_PUBLIC_* son las únicas expuestas al cliente
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabaseUrl = SUPABASE_URL;
export const supabaseAnonKey = SUPABASE_ANON_KEY;

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey &&
  !supabaseUrl.includes('placeholder') &&
  !supabaseAnonKey.includes('placeholder'));

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