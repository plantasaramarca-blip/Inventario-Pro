
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

// En Vite y Vercel, las variables deben empezar por VITE_ para ser públicas en el cliente
// Fixed: Property 'env' does not exist on type 'ImportMeta'. Casting to any to resolve the TS compilation error.
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
// Fixed: Property 'env' does not exist on type 'ImportMeta'. Casting to any to resolve the TS compilation error.
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "⚠️ Supabase: Faltan variables de entorno (VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY). " +
    "Asegúrate de configurarlas en tu archivo .env local o en el panel de Vercel."
  );
}

// Exportamos el cliente. Si faltan las llaves, los llamados a la API fallarán con gracia.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);
