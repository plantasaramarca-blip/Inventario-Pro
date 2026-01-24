import React, { useRef } from 'react';
import { X, Printer } from 'lucide-react';

interface DispatchNoteProps {
  data: {
    items: any[];
    destination: any;
    transportista: string;
    observaciones: string;
    responsable?: string;
  };
  onClose: () => void;
}

export const DispatchNote: React.FC<DispatchNoteProps> = ({ data, onClose }) => {
  const noteRef = useRef<HTMLDivElement>(null);
  const dispatchId = `OD-${new Date().getTime()}`;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-2 sm:p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}></div>
      
      {/* Modal Container - Responsive */}
      <div className="relative bg-white w-full max-w-4xl rounded-2xl sm:rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        
        {/* Header - No se imprime */}
        <div className="print:hidden p-4 sm:p-6 border-b flex flex-wrap justify-between items-center gap-3 bg-slate-50/50">
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-800 uppercase tracking-tight">Orden de Despacho</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Vista Previa de Impresión</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button 
              onClick={handlePrint} 
              className="bg-slate-800 text-white px-4 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-transform"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
            <button 
              onClick={onClose} 
              className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 print:p-0 print:overflow-visible print:bg-white">
          
          {/* Documento Principal */}
          <div 
            ref={noteRef} 
            className="bg-white p-4 sm:p-6 md:p-10 mx-auto print:p-0"
          >
            {/* Header del Documento */}
            <header className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 sm:pb-6 border-b">
              <div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900">Kardex Pro</h1>
                <p className="text-xs sm:text-sm text-slate-500">Sistema de Gestión Logística</p>
              </div>
              <div className="text-left sm:text-right">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-800">ORDEN DE DESPACHO</h2>
                <p className="text-xs sm:text-sm font-mono text-slate-600 mt-1">{dispatchId}</p>
              </div>
            </header>
            
            {/* Info Grid - Responsive */}
            <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 md:gap-8 my-6 sm:my-8 text-sm">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">FECHA DE EMISIÓN</h4>
                <p className="font-semibold text-slate-700 text-sm">{new Date().toLocaleString()}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">DESTINO (CENTRO DE COSTO)</h4>
                <p className="font-semibold text-slate-700 text-sm">{data.destination?.nombre || data.destination?.name || 'N/A'}</p>
                <p className="text-xs text-slate-500 capitalize">{data.destination?.type || ''}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">TRANSPORTISTA</h4>
                <p className="font-semibold text-slate-700 text-sm">{data.transportista || 'N/A'}</p>
              </div>
            </section>
            
            {/* Tabla de Productos - Responsive */}
            <section className="my-6 sm:my-8">
              {/* Vista Desktop/Tablet */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 print:bg-slate-100">
                    <tr>
                      <th className="p-2 sm:p-3 font-bold text-slate-600 text-xs uppercase w-20 sm:w-24">SKU</th>
                      <th className="p-2 sm:p-3 font-bold text-slate-600 text-xs uppercase">Descripción</th>
                      <th className="p-2 sm:p-3 font-bold text-slate-600 text-xs uppercase w-24 sm:w-28 text-center">Cantidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {data.items.map(item => (
                      <tr key={item.id} className="print:break-inside-avoid">
                        <td className="p-2 sm:p-3 font-mono text-xs sm:text-sm text-slate-700">{item.code}</td>
                        <td className="p-2 sm:p-3 font-semibold text-sm text-slate-800">
                          {item.name} <span className="text-slate-500 font-normal">({item.brand})</span>
                        </td>
                        <td className="p-2 sm:p-3 font-bold text-sm text-slate-800 text-center">{item.quantity} {item.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vista Mobile - Cards */}
              <div className="block sm:hidden space-y-3">
                {data.items.map(item => (
                  <div key={item.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-mono text-slate-500 bg-white px-2 py-1 rounded">{item.code}</span>
                      <span className="text-lg font-bold text-slate-800">{item.quantity} {item.unit}</span>
                    </div>
                    <p className="font-semibold text-sm text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500 mt-1">({item.brand})</p>
                  </div>
                ))}
              </div>
            </section>
            
            {/* Observaciones */}
            {data.observaciones && (
              <section className="my-6 sm:my-8 text-sm print:break-inside-avoid">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">OBSERVACIONES</h4>
                <p className="p-3 sm:p-4 bg-slate-50 rounded-lg text-slate-600 text-xs sm:text-sm">{data.observaciones}</p>
              </section>
            )}
            
            {/* Firmas */}
            <footer className="mt-12 sm:mt-16 md:mt-20 pt-8 sm:pt-10 grid grid-cols-2 gap-4 sm:gap-6 md:gap-8 text-center text-xs print:break-inside-avoid">
              <div>
                <div className="border-t-2 border-slate-300 pt-2">
                  <p className="font-bold text-slate-700 mb-1">Entregado por:</p>
                  <p className="text-slate-500 mt-4 sm:mt-6">{data.responsable?.split('@')[0] || 'admin'}</p>
                </div>
              </div>
              <div>
                <div className="border-t-2 border-slate-300 pt-2">
                  <p className="font-bold text-slate-700 mb-1">Recibido por:</p>
                  <p className="text-slate-500 mt-4 sm:mt-6">Nombre y Firma</p>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>

      {/* Estilos para impresión */}
      <style>{`
        @media print {
          /* Ocultar todo excepto el contenido del documento */
          body * {
            visibility: hidden;
          }
          
          /* Mostrar solo el contenido imprimible */
          .print\\:block,
          [class*="print:"],
          ${noteRef.current ? '[ref="noteRef"]' : ''} * {
            visibility: visible;
          }

          /* Configurar página */
          @page {
            size: A4;
            margin: 1.5cm;
          }

          /* Ajustar contenedor principal */
          .fixed {
            position: static;
            background: white;
          }

          /* Remover estilos de modal */
          .max-w-4xl,
          .rounded-2xl,
          .shadow-2xl,
          .overflow-hidden {
            max-width: 100%;
            border-radius: 0;
            box-shadow: none;
            overflow: visible;
          }

          /* Tabla en impresión */
          table {
            width: 100%;
            border-collapse: collapse;
          }

          thead {
            display: table-header-group;
          }

          tbody {
            display: table-row-group;
          }

          tr {
            page-break-inside: avoid;
          }

          th, td {
            border: 1px solid #e2e8f0;
          }

          th {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          /* Ocultar vista mobile en impresión */
          .sm\\:hidden {
            display: none !important;
          }

          /* Mostrar vista desktop en impresión */
          .sm\\:block {
            display: block !important;
          }

          /* Forzar colores */
          .bg-slate-50,
          .bg-slate-100 {
            background-color: #f8fafc !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};
