import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

const getEnv = (key: string) => {
  if (typeof window !== 'undefined') {
    const viteEnv = (import.meta as any).env?.[key];
    if (viteEnv && !viteEnv.includes('placeholder')) return viteEnv;

    try {
      const procEnv = (process as any).env?.[key];
      if (procEnv && !procEnv.includes('placeholder')) return procEnv;
    } catch (e) {}

    const winEnv = (window as any).env?.[key];
    if (winEnv) return winEnv;
  }
  return null;
};

export const supabaseUrl = getEnv('VITE_SUPABASE_URL');
export const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);