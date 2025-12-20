import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.1';

/**
 * SEGURIDAD: Al subir a GitHub, las llaves se leen de las variables de entorno.
 * Si usas Vite: import.meta.env.VITE_SUPABASE_URL
 * Si usas Vercel/Normal: process.env.SUPABASE_URL
 */

// Intentamos obtener las variables de diferentes entornos posibles
const supabaseUrl = 
  (import.meta as any).env?.VITE_SUPABASE_URL || 
  (window as any).process?.env?.SUPABASE_URL || 
  'https://wbquviznbkokxctcbgur.supabase.co'; // Fallback temporal para que no se rompa tu app ahora

const supabaseAnonKey = 
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 
  (window as any).process?.env?.SUPABASE_ANON_KEY || 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndicXV2aXpuYmtva3hjdGNiZ3VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwOTkyMDMsImV4cCI6MjA4MTY3NTIwM30.3e5e7YXjgkaDSjYs1FcJaaqh3tykFMAtyvj98MW8jW4'; // Fallback temporal

export const supabase = createClient(supabaseUrl, supabaseAnonKey);