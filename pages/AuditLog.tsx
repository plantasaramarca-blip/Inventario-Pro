
import React, { useState, useEffect } from 'react';
import { AuditLog } from '../types';
import * as api from '../services/supabaseService';
import { exportToExcel, formatTimestamp } from '../services/excelService';
import { 
  ClipboardCheck, Search, Filter, Calendar, User, 
  ChevronLeft, ChevronRight, Eye, FileDown, 
  CheckCircle, Edit, Trash2, X, Info, History, AlertCircle,
  FileSpreadsheet, Loader2
} from 'https://esm.sh/lucide-react@^0.561.0';

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
    userEmail: '', // Por defecto vacío para ver TODO
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
      // Intentamos cargar hasta 1000 logs para el excel (más que la página actual)
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
    link.setAttribute("download", `auditoria_reporte_${new Date().getTime()}.csv`);
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
          
          <button 
            onClick={exportToCSV}
            className="flex-1 sm:flex-none inline-flex items-center px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl shadow-sm hover:bg-slate-50 font-bold text-xs transition-all"
          >
            <FileDown className="mr-2 h-4 w-4 text-indigo-500" /> CSV
          </button>
        </div>
      </div>

      {/* FILTROS */}
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

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo Acción</label>
            <select 
              className="w-full p-2.5 bg-slate-50 border border-transparent rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all shadow-inner"
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
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Módulo</label>
            <select 
              className="w-full p-2.5 bg-slate-50 border border-transparent rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all shadow-inner"
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
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Fecha Inicial</label>
            <input 
              type="date" 
              className="w-full p-2.5 bg-slate-50 border border-transparent rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner"
              value={filters.dateFrom}
              onChange={e => setFilters({...filters, dateFrom: e.target.value})}
            />
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

      {/* TABLA DE LOGS */}
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
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-6 py-24 text-center">
                    <div className="max-w-xs mx-auto">
                      <History className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                      <h4 className="text-sm font-bold text-slate-800">No se encontraron registros</h4>
                      <p className="text-xs text-slate-400 mt-2 italic">
                        {hasActiveFilters 
                          ? "Los filtros actuales no coinciden con ninguna acción registrada." 
                          : "Aún no se han realizado acciones auditables en el sistema."}
                      </p>
                      {hasActiveFilters && (
                        <button onClick={clearFilters} className="mt-4 text-xs text-indigo-600 font-bold hover:underline">Ver todos los registros</button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-tight">
            Resultados: <span className="text-indigo-600">{count} logs totales</span>
          </div>
          <div className="flex space-x-2">
            <button disabled={page === 0} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-all"><ChevronLeft className="w-4 h-4" /></button>
            <button disabled={(page + 1) * PAGE_SIZE >= count} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 shadow-sm transition-all"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>
      </div>

      {/* AVISO DE IDENTIDAD */}
      <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex items-start">
        <AlertCircle className="w-5 h-5 text-indigo-500 mt-0.5 mr-3 flex-shrink-0" />
        <div>
          <p className="text-xs text-indigo-900 font-bold">Nota sobre Identidades</p>
          <p className="text-[10px] text-indigo-700 leading-relaxed mt-1">
            Este sistema registra el correo real de autenticación de Supabase (quién eres en la base de datos). 
            Los botones de "Admin / Usuario" en la barra superior son simuladores de permisos de interfaz y no afectan tu identidad en la auditoría.
          </p>
        </div>
      </div>

      {/* MODAL DE DETALLES */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setSelectedLog(null)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-indigo-50/30">
              <div className="flex items-center">
                <div className="p-2 bg-indigo-600 rounded-xl mr-3"><Info className="w-5 h-5 text-white" /></div>
                <div>
                  <h3 className="text-lg font-black text-slate-800">Detalles Técnicos</h3>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest">ID: {selectedLog.id.substring(0,8)}...</p>
                </div>
              </div>
              <button onClick={() => setSelectedLog(null)} className="p-2 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            </div>

            <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
               <div className="grid grid-cols-2 gap-6 bg-slate-50 p-5 rounded-2xl border border-slate-100">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Actor Real</p>
                    <p className="text-sm font-bold text-slate-800">{selectedLog.user_email}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Momento</p>
                    <p className="text-sm font-bold text-slate-800">{new Date(selectedLog.created_at).toLocaleString()}</p>
                  </div>
               </div>

               <div className="space-y-3">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center"><Filter className="w-3 h-3 mr-2" /> Comparativa de Cambios</h4>
                  {selectedLog.action === 'UPDATE' && selectedLog.old_values && selectedLog.new_values ? (
                    <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          <tr>
                            <th className="px-4 py-2">Propiedad</th>
                            <th className="px-4 py-2">Antes</th>
                            <th className="px-4 py-2">Después</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {Object.keys(selectedLog.new_values).map(key => {
                            // Limpiar llaves técnicas de comparación
                            if (key === 'updated_at' || key === 'updatedAt' || key === 'id') return null;
                            const oldVal = JSON.stringify(selectedLog.old_values[key]);
                            const newVal = JSON.stringify(selectedLog.new_values[key]);
                            if (oldVal !== newVal) {
                              return (
                                <tr key={key}>
                                  <td className="px-4 py-3 font-bold text-slate-500 uppercase text-[9px]">{key}</td>
                                  <td className="px-4 py-3 bg-rose-50/50 text-rose-700">{oldVal?.replace(/"/g, '') || 'vacio'}</td>
                                  <td className="px-4 py-3 bg-emerald-50/50 text-emerald-700 font-bold">{newVal?.replace(/"/g, '')}</td>
                                </tr>
                              );
                            }
                            return null;
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl text-xs text-indigo-800 font-medium italic">
                       {selectedLog.changes_summary}
                    </div>
                  )}
               </div>

               <div className="space-y-2">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">JSON Crudo (Payload)</p>
                  <pre className="bg-slate-900 text-indigo-300 p-4 rounded-xl text-[10px] overflow-x-auto max-h-32 shadow-inner">
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
