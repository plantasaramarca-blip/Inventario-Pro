'use client';

import React, { useEffect, useState } from 'react';
import { supabase, supabaseUrl, supabaseAnonKey, isSupabaseConfigured } from '../supabaseClient';

export const SupabaseDiagnostic: React.FC = () => {
    const [testResult, setTestResult] = useState<string>('Probando...');
    const [envVars, setEnvVars] = useState<any>({});

    useEffect(() => {
        // Verificar variables de entorno
        setEnvVars({
            NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NO DEFINIDA',
            NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '***DEFINIDA***' : 'NO DEFINIDA',
            supabaseUrl: supabaseUrl || 'NO DEFINIDA',
            supabaseAnonKey: supabaseAnonKey ? '***DEFINIDA***' : 'NO DEFINIDA',
            isConfigured: isSupabaseConfigured ? 'SÍ' : 'NO'
        });

        // Probar conexión
        const testConnection = async () => {
            try {
                const { data, error } = await supabase.from('products').select('count').limit(1);
                if (error) {
                    setTestResult(`❌ Error: ${error.message}`);
                } else {
                    setTestResult('✅ Conexión exitosa a Supabase');
                }
            } catch (err: any) {
                setTestResult(`❌ Error de red: ${err.message}`);
            }
        };

        testConnection();
    }, []);

    return (
        <div className="fixed bottom-4 right-4 bg-white p-4 rounded-lg shadow-xl border-2 border-indigo-500 max-w-md z-[9999]">
            <h3 className="font-bold text-sm mb-2">🔍 Diagnóstico Supabase</h3>
            <div className="text-xs space-y-1 font-mono">
                <p><strong>NEXT_PUBLIC_SUPABASE_URL:</strong> {envVars.NEXT_PUBLIC_SUPABASE_URL}</p>
                <p><strong>NEXT_PUBLIC_SUPABASE_ANON_KEY:</strong> {envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY}</p>
                <p><strong>URL detectada:</strong> {envVars.supabaseUrl}</p>
                <p><strong>Key detectada:</strong> {envVars.supabaseAnonKey}</p>
                <p><strong>Configurado:</strong> {envVars.isConfigured}</p>
                <hr className="my-2" />
                <p><strong>Test de conexión:</strong> {testResult}</p>
            </div>
        </div>
    );
};
