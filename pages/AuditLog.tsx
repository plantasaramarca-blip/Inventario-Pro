import React, { useState, useEffect } from 'https://esm.sh/react@19.0.0';
import { AuditLog } from '../types';
import * as api from '../services/supabaseService';
import { exportToExcel, formatTimestamp } from '../services/excelService';
import { 
  ClipboardCheck, User, ChevronLeft, ChevronRight, Eye, FileDown, 
  CheckCircle, Edit, Trash2, X, Info, History, AlertCircle,
  FileSpreadsheet, Loader2, Filter
} from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.0.0';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  
  const [filters, setFilters] = useState({
    action: 'ALL',
    tableName: 'ALL',
    userEmail: '',
    dateFrom: '',
    dateTo: ''
  });

  const PAGE_SIZE = 50;

  const loadLogs = async () => {
    setLoading(true);
    try {
      const { data, count } = await api.getAuditLogs(page, PAGE_SIZE, filters);
      setLogs(data);
      setCount(count);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadLogs(); }, [page, filters]);

  const clearFilters = () => {
    setFilters({ action: 'ALL', tableName: 'ALL', userEmail: '', dateFrom: '', dateTo: '' });
    setPage(0);
  };

  const handleExcelExport = async () => {
    if (logs.length === 0) {
      alert("No hay logs registrados para exportar.");
      return;
    }

    setExporting(true);
    try {
      const { data: allData } = await api.getAuditLogs(0, 1000, filters);
      const dataToExport = allData.map(l => ({
        'Fecha/Hora': new Date(l.created_at).toLocaleString(),
        'Usuario (Actor)': l.user_email,
        'Acción': l.action,
        'Módulo/Tabla': l.table_name,
        'Registro Afectado': l.record_name,
        'Resumen de Cambios': l.changes_summary,
        'Valores Anteriores': JSON.stringify(l.old_values || {}),
        'Valores Nuevos': JSON.stringify(l.new_values || {})
      }));

      const fileName = `Auditoria_${formatTimestamp(new Date())}.xlsx`;
      exportToExcel(dataToExport, fileName, 'Auditoría');
    } catch (e: any) {
      alert(`Error al exportar: ${e.message}`);
    } finally {
      setExporting(false);
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE': return <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase"><CheckCircle className="w-3 h-3 mr-1" /> Creado</span>;
      case 'UPDATE': return <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-100 uppercase"><Edit className="w-3 h-3 mr-1" /> Editado</span>;
      case 'DELETE': return <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-100 uppercase"><Trash2 className="w-3 h-3 mr-1" /> Borrado</span>;
      default: return null;
    }
  };

  const hasActiveFilters = filters.action !== 'ALL' || filters.tableName !== 'ALL' || filters.userEmail !== '' || filters.dateFrom !== '' || filters.dateTo !== '';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ClipboardCheck className="w-7 h-7 mr-2 text-indigo-600" /> Auditoría de Sistema
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Trazabilidad de identidades reales y acciones de base de datos.</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button 
            onClick={handleExcelExport}
            disabled={exporting}
            className="flex-1 sm:flex-none inline-flex items-center justify-center px-4 py-2.5 bg-green-600 border border-green-700 text-white rounded-xl shadow-sm hover:bg-green-700 font-bold text-xs transition-all disabled:opacity-50"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <FileSpreadsheet className="mr-2 h-4 w-4" />}
            {exporting ? 'Exportando...' : 'Excel'}
          </button>
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Filtrar por Email</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-slate-300" />
              <input 
                type="text" 
                placeholder="Ej: user@planta.com" 
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-transparent rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all shadow-inner"
                value={filters.userEmail}
                onChange={e => setFilters({...filters, userEmail: e.target.value})}
              />
            </div>
          </div>
          <div className="space-y-1.5 flex flex-col justify-end">
             <button 
              onClick={clearFilters}
              className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center ${hasActiveFilters ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100' : 'bg-slate-100 text-slate-400 cursor-default'}`}
             >
               <X className="w-3.5 h-3.5 mr-2" /> Limpiar Filtros
             </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-50">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Identidad (Email)</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Operación</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Registro Afectado</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen Cambios</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center"><History className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                    {new Date(log.created_at).toLocaleString('es-ES')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs font-bold text-slate-800">{log.user_email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getActionBadge(log.action)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-xs font-bold text-indigo-600">{log.record_name}</div>
                    <div className="text-[9px] text-slate-400 uppercase font-black">{log.table_name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-600 line-clamp-1 group-hover:line-clamp-none transition-all duration-300">
                      {log.changes_summary}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
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