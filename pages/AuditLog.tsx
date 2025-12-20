
import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import * as api from '../services/supabaseService';
import { 
  ClipboardCheck, Search, Filter, Calendar, User, 
  ChevronLeft, ChevronRight, Eye, FileDown, 
  CheckCircle, Edit, Trash2, X, Info, History
} from 'https://esm.sh/lucide-react@^0.561.0';

export const AuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
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

  const exportToCSV = () => {
    const headers = ['Fecha', 'Usuario', 'Accion', 'Tabla', 'Registro', 'Resumen'];
    const rows = logs.map(l => [
      new Date(l.created_at).toLocaleString(),
      l.user_email,
      l.action,
      l.table_name,
      l.record_name,
      l.changes_summary
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `auditoria_${new Date().getTime()}.csv`);
    link.click();
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'CREATE': return <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase"><CheckCircle className="w-3 h-3 mr-1" /> Creado</span>;
      case 'UPDATE': return <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-100 uppercase"><Edit className="w-3 h-3 mr-1" /> Editado</span>;
      case 'DELETE': return <span className="flex items-center px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-50 text-rose-700 border border-rose-100 uppercase"><Trash2 className="w-3 h-3 mr-1" /> Borrado</span>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ClipboardCheck className="w-7 h-7 mr-2 text-indigo-600" /> Auditoría de Sistema
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-1">Trazabilidad completa de cada acción realizada en la plataforma.</p>
        </div>
        <button 
          onClick={exportToCSV}
          className="inline-flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm hover:bg-slate-50 font-bold text-xs transition-all"
        >
          <FileDown className="mr-2 h-4 w-4 text-indigo-500" /> Descargar CSV
        </button>
      </div>

      {/* FILTROS */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuario</label>
            <div className="relative">
              <User className="absolute left-3 top-3 w-4 h-4 text-slate-300" />
              <input 
                type="text" 
                placeholder="Email..." 
                className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border-transparent rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
                value={filters.userEmail}
                onChange={e => setFilters({...filters, userEmail: e.target.value})}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acción</label>
            <select 
              className="w-full p-2.5 bg-slate-50 border-transparent rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              value={filters.action}
              onChange={e => setFilters({...filters, action: e.target.value})}
            >
              <option value="ALL">Todas las acciones</option>
              <option value="CREATE">Solo Creaciones</option>
              <option value="UPDATE">Solo Ediciones</option>
              <option value="DELETE">Solo Eliminaciones</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Módulo / Tabla</label>
            <select 
              className="w-full p-2.5 bg-slate-50 border-transparent rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all"
              value={filters.tableName}
              onChange={e => setFilters({...filters, tableName: e.target.value})}
            >
              <option value="ALL">Todos los módulos</option>
              <option value="products">Productos</option>
              <option value="movements">Movimientos</option>
              <option value="contacts">Contactos</option>
              <option value="categories">Categorías</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Desde</label>
            <input 
              type="date" 
              className="w-full p-2 bg-slate-50 border-transparent rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={filters.dateFrom}
              onChange={e => setFilters({...filters, dateFrom: e.target.value})}
            />
          </div>

          <div className="space-y-1.5 flex flex-col justify-end">
             <button 
              onClick={clearFilters}
              className="w-full py-2.5 bg-slate-100 text-slate-500 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center"
             >
               <X className="w-3.5 h-3.5 mr-2" /> Limpiar Filtros
             </button>
          </div>
        </div>
      </div>

      {/* TABLA DE LOGS */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-50">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Fecha y Hora</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Usuario</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Acción</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Registro</th>
                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumen de Cambios</th>
                <th className="px-6 py-4 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center"><Loader className="w-8 h-8 animate-spin mx-auto text-indigo-500" /></td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500 font-mono">
                    {new Date(log.created_at).toLocaleString('es-ES', { 
                      day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', second: '2-digit'
                    })}
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
                      title="Ver Detalles"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center">
                    <History className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                    <p className="text-sm text-slate-400 italic">No se encontraron registros de auditoría.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
            Página {page + 1} de {Math.ceil(count / PAGE_SIZE)} — <span className="text-indigo-600">Total: {count} logs</span>
          </div>
          <div className="flex space-x-2">
            <button 
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              disabled={(page + 1) * PAGE_SIZE >= count}
              onClick={() => setPage(p => p + 1)}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-all shadow-sm"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL DE DETALLES (DIFF VIEWER) */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedLog(null)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-600 rounded-xl mr-3">
                  <Info className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Detalles de Operación</h3>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">{selectedLog.id}</p>
                </div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-6">
               <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ejecutor</p>
                    <p className="text-sm font-bold text-slate-800">{selectedLog.user_email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Timestamp</p>
                    <p className="text-sm font-bold text-slate-800">{new Date(selectedLog.created_at).toLocaleString()}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Módulo</p>
                    <p className="text-sm font-bold text-indigo-600 uppercase">{selectedLog.table_name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Acción</p>
                    <div className="mt-1">{getActionBadge(selectedLog.action)}</div>
                  </div>
               </div>

               <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                    <Filter className="w-3 h-3 mr-2" /> Cambios Detectados
                  </h4>
                  {selectedLog.action === 'UPDATE' && selectedLog.old_values && selectedLog.new_values ? (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className="px-4 py-2 text-slate-400 font-black tracking-widest uppercase text-[9px]">Campo</th>
                            <th className="px-4 py-2 text-rose-500 font-black tracking-widest uppercase text-[9px]">Anterior</th>
                            <th className="px-4 py-2 text-emerald-600 font-black tracking-widest uppercase text-[9px]">Nuevo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {Object.keys(selectedLog.new_values).map(key => {
                            const oldVal = JSON.stringify(selectedLog.old_values[key]);
                            const newVal = JSON.stringify(selectedLog.new_values[key]);
                            if (oldVal !== newVal) {
                              return (
                                <tr key={key}>
                                  <td className="px-4 py-3 font-bold text-slate-500">{key}</td>
                                  <td className="px-4 py-3 bg-rose-50/30 text-rose-700">{oldVal?.replace(/"/g, '') || 'n/a'}</td>
                                  <td className="px-4 py-3 bg-emerald-50/30 text-emerald-700 font-bold">{newVal?.replace(/"/g, '')}</td>
                                </tr>
                              );
                            }
                            return null;
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl text-xs text-indigo-800 font-medium">
                       {selectedLog.changes_summary}
                    </div>
                  )}
               </div>

               <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Metadata Técnica (JSON)</p>
                  <pre className="bg-slate-900 text-indigo-300 p-4 rounded-xl text-[10px] overflow-x-auto max-h-32">
                    {JSON.stringify(selectedLog.new_values || selectedLog.old_values, null, 2)}
                  </pre>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Loader = ({ className }: { className?: string }) => <History className={className} />;
