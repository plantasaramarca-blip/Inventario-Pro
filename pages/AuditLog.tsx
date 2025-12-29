
import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { 
  ClipboardCheck, Loader2
} from 'lucide-react';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.getAuditLogs(0, 50);
      setLogs(data || []);
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { loadLogs(); }, []);

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight flex items-center">
            <ClipboardCheck className="w-5 h-5 mr-2 text-indigo-600" /> Auditoría
          </h1>
          <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">Historial de Acciones</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto no-scrollbar">
          <table className="min-w-full divide-y divide-slate-50">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Acción</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Resumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-indigo-500" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} className="py-10 text-center text-[10px] font-black text-slate-300 uppercase">Sin registros</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-6 py-4 text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-[11px] font-bold text-slate-800">
                    {log.user_email}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[9px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[11px] text-slate-600 font-medium">
                    {log.changes_summary}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
