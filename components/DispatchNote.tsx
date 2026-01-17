
import React, { useRef } from 'react';
import { X, Printer, Package } from 'lucide-react';

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
    if (!noteRef.current) return;
    const printable = noteRef.current.cloneNode(true) as HTMLElement;
    printable.classList.add('printable-area');
    document.body.appendChild(printable);
    window.print();
    document.body.removeChild(printable);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Orden de Despacho</h3>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Vista Previa de Impresión</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handlePrint} className="bg-slate-800 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-lg active:scale-95 transition-transform"><Printer className="w-4 h-4" /> Imprimir</button>
            <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-xl"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-8 bg-slate-100/70">
          <div ref={noteRef} className="bg-white p-10 mx-auto" style={{ width: '210mm', minHeight: '297mm', fontFamily: 'sans-serif' }}>
            <header className="flex justify-between items-start pb-6 border-b">
              <div>
                <h1 className="text-2xl font-black text-slate-900">Kardex Pro</h1>
                <p className="text-sm text-slate-500">Sistema de Gestión Logística</p>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold text-slate-800">ORDEN DE DESPACHO</h2>
                <p className="text-sm font-mono text-slate-600 mt-1">{dispatchId}</p>
              </div>
            </header>
            <section className="grid grid-cols-3 gap-8 my-8 text-sm">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">FECHA DE EMISIÓN</h4>
                <p className="font-semibold text-slate-700">{new Date().toLocaleString()}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">DESTINO (CENTRO DE COSTO)</h4>
                <p className="font-semibold text-slate-700">{data.destination?.nombre || data.destination?.name || 'N/A'}</p>
                <p className="text-xs text-slate-500 capitalize">{data.destination?.type || ''}</p>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">TRANSPORTISTA</h4>
                <p className="font-semibold text-slate-700">{data.transportista || 'N/A'}</p>
              </div>
            </section>
            <section className="my-8">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="p-3 font-bold text-slate-600 text-xs uppercase w-24">SKU</th>
                    <th className="p-3 font-bold text-slate-600 text-xs uppercase">Descripción</th>
                    <th className="p-3 font-bold text-slate-600 text-xs uppercase w-28 text-center">Cantidad</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.items.map(item => (
                    <tr key={item.id}>
                      <td className="p-3 font-mono text-slate-700">{item.code}</td>
                      <td className="p-3 font-semibold text-slate-800">{item.name} <span className="text-slate-500 font-normal">({item.brand})</span></td>
                      <td className="p-3 font-bold text-slate-800 text-center">{item.quantity} {item.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
            {data.observaciones && (
              <section className="my-8 text-sm">
                <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">OBSERVACIONES</h4>
                <p className="p-4 bg-slate-50 rounded-lg text-slate-600 text-xs">{data.observaciones}</p>
              </section>
            )}
            <footer className="mt-20 pt-10 grid grid-cols-3 gap-8 text-center text-xs">
              <div>
                <div className="border-t pt-2">
                  <p className="font-bold text-slate-700">Entregado por:</p>
                  <p className="text-slate-500 mt-6">{data.responsable?.split('@')[0]}</p>
                </div>
              </div>
              <div>
                <div className="border-t pt-2">
                  <p className="font-bold text-slate-700">Recibido por:</p>
                  <p className="text-slate-500 mt-6">Nombre y Firma</p>
                </div>
              </div>
              <div>
                <div className="border-t pt-2">
                  <p className="font-bold text-slate-700">DNI:</p>
                </div>
              </div>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
};
