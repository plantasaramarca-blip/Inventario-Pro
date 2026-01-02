
import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types.ts';
import * as api from '../services/supabaseService.ts';
import { 
  ClipboardCheck, Loader2, ChevronLeft, ChevronRight, ChevronDown
} from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

const ITEMS_PER_PAGE = 20;

const LogDetails: React.FC<{ log: AuditLog }> = ({ log }) => {
  const { old_values, new_values, action } = log;
  if (action === 'DELETE' || !old_values || !new_values) return null;

  const allKeys = new Set([...Object.keys(old_values), ...Object.keys(new_values)]);
  const ignoredKeys = ['id', 'created_at', 'updated_at', 'user_id', 'imageUrl'];
  const changes = Array.from(allKeys).filter(key => !ignoredKeys.includes(key) && String(old_values[key] ?? '') !== String(new_values[key] ?? ''));

  if (changes.length === 0) {
    return <p className="text-center text-xs text-slate-400 py-3">No se encontraron diferencias de datos.</p>;
  }

  return (
    <div className="bg-slate-100/50 p-4">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[9px] font-black uppercase text-slate-400">
            <th className="p-2 text-left w-1/3">Campo</th>
            <th className="p-2 text-left w-1/3">Valor Anterior</th>
            <th className="p-2 text-left w-1/3">Valor Nuevo</th>
          </tr>
        </thead>
        <tbody>
          {changes.map(key => (
            <tr key={key} className="border-t border-slate-200">
              <td className="p-2 font-bold text-slate-600">{key}</td>
              <td className="p-2 text-rose-600 font-mono bg-rose-50 rounded-lg my-1 block">{String(old_values[key] ?? 'N/A')}</td>
              <td className="p-2 text-emerald-600 font-mono bg-emerald-50 rounded-lg my-1 block">{String(new_values[key] ?? 'N/A')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const loadLogs = async (page: number) => {
    setLoading(true);
    try {
      const { data, count } = await api.getAuditLogs(page, ITEMS_PER_PAGE);
      setLogs(data || []);
      setTotalCount(count || 0);
      setCurrentPage(page);
    } catch (e) {
      console.error("Failed to load audit logs", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(0); }, []);

  const toggleExpand = (logId: string) => {
    setExpandedLogId(prev => (prev === logId ? null : logId));
  };

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
          <table className="min-w-full">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Fecha</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Acción</th>
                <th className="px-6 py-4 text-left text-[9px] font-black text-slate-400 uppercase tracking-widest">Resumen</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center"><Loader2 className="animate-spin h-6 w-6 mx-auto text-indigo-500" /></td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="py-10 text-center text-[10px] font-black text-slate-300 uppercase">Sin registros</td></tr>
              ) : logs.map((log) => (
                <React.Fragment key={log.id}>
                  <tr onClick={() => toggleExpand(log.id)} className={`hover:bg-indigo-50/30 transition-colors cursor-pointer ${expandedLogId === log.id ? 'bg-indigo-50' : ''}`}>
                    <td className="px-6 py-4 text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-[11px] font-bold text-slate-800">
                      {log.user_email}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-700' : log.action === 'DELETE' ? 'bg-rose-50 text-rose-700' : 'bg-indigo-50 text-indigo-700'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-[11px] text-slate-600 font-medium max-w-sm truncate">
                      {log.changes_summary}
                    </td>
                    <td className="px-6 py-4">
                       <ChevronDown className={`w-5 h-5 text-slate-300 transition-transform ${expandedLogId === log.id ? 'rotate-180' : ''}`} />
                    </td>
                  </tr>
                  {expandedLogId === log.id && (
                     <tr><td colSpan={5} className="p-0"><LogDetails log={log} /></td></tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="p-4 flex justify-between items-center text-[10px] font-black uppercase text-slate-500 border-t">
            <button onClick={() => loadLogs(currentPage - 1)} disabled={currentPage === 0 || loading} className="px-3 py-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 flex items-center gap-1.5"><ChevronLeft className="w-3.5 h-3.5" /> Ant</button>
            <span>Página {currentPage + 1} de {totalPages}</span>
            <button onClick={() => loadLogs(currentPage + 1)} disabled={currentPage >= totalPages - 1 || loading} className="px-3 py-2 hover:bg-slate-100 rounded-lg disabled:opacity-30 flex items-center gap-1.5">Sig <ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
    </div>
  );
};
