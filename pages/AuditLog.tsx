
import React, { useState, useEffect } from 'https://esm.sh/react@19.2.3';
import { AuditLog } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { exportToExcel, formatTimestamp } from '../services/excelService.ts';
import { 
  ClipboardCheck, User, Eye, 
  CheckCircle, Edit, Trash2, X, History, 
  FileSpreadsheet, Loader2
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data } = await api.getAuditLogs(0, 50);
      setLogs(data);
    } catch (e) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center tracking-tight">
          <ClipboardCheck className="w-7 h-7 mr-2 text-indigo-600" /> Auditoría
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-50">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Acción</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={4} className="py-20 text-center"><Loader2 className="animate-spin h-8 w-8 mx-auto text-indigo-500" /></td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-xs text-slate-500 font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-800">
                    {log.user_email}
                  </td>
                  <td className="px-6 py-4 text-[10px] font-black uppercase text-indigo-600">
                    {log.action}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">
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
