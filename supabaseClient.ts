
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

// Función robusta para obtener variables de entorno en cualquier contexto
const getEnv = (key: string) => {
  if (typeof window !== 'undefined') {
    // @ts-ignore - Acceso seguro a import.meta.env de Vite
    const viteEnv = (import.meta as any).env?.[key];
    if (viteEnv) return viteEnv;

    // @ts-ignore - Acceso seguro a process.env si existe
    const procEnv = typeof process !== 'undefined' ? process.env?.[key] : null;
    if (procEnv) return procEnv;
  }
  return null;
};

const supabaseUrl = getEnv('VITE_SUPABASE_URL');
const supabaseAnonKey = getEnv('VITE_SUPABASE_ANON_KEY');

// Fallback preventivo pero informativo
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "FATAL ERROR: Las variables de entorno de Supabase no están configuradas correctamente.",
    "\nURL detectada:", supabaseUrl,
    "\nKey detectada:", supabaseAnonKey ? "Presente (oculta)" : "Ausente"
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder-url-must-be-set.supabase.co', 
  supabaseAnonKey || 'placeholder-anon-key-must-be-set'
);
