
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

// Función segura para obtener env vars
const getEnv = (key: string) => {
  try {
    return (import.meta as any).env?.[key] || (process as any).env?.[key] || null;
  } catch {
    return null;
  }
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase: Faltan variables de entorno. La aplicación podría no funcionar correctamente hasta que se configuren en Vercel."
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);
