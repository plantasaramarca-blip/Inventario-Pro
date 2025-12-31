
import React, { useRef } from 'react';
import { QRCodeSVG } from 'https://esm.sh/qrcode.react@3.1.0?external=react,react-dom';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { X, Printer, FileDown, Loader2 } from 'lucide-react';
import { Product } from '../types.ts';

interface MultiQRCodeProps {
  products: Product[];
  onClose: () => void;
}

export const MultiQRCode = ({ products, onClose }: MultiQRCodeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = React.useState(false);

  const handleDownloadPDF = async () => {
    if (!containerRef.current) return;
    setGenerating(true);
    try {
      const canvas = await html2canvas(containerRef.current, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
      const imgData = canvas.toDataURL('image/jpeg', 0.9);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Planilla_QR_${new Date().getTime()}.pdf`);
    } catch (e) { console.error('Error:', e); } 
    finally { setGenerating(false); }
  };

  const handleDirectPrint = () => {
    if (!containerRef.current) return;
    const printable = containerRef.current.cloneNode(true) as HTMLElement;
    printable.classList.add('printable-area');
    document.body.appendChild(printable);
    window.print();
    document.body.removeChild(printable);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white rounded-[3rem] w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
        <div className="p-8 border-b flex justify-between items-center bg-slate-50/50">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Impresión Masiva QR</h2>
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Vista previa de planilla A4</p>
          </div>
          <div className="flex gap-3">
             <button onClick={handleDirectPrint} className="bg-slate-800 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-slate-900"><Printer className="w-4 h-4" /> Imprimir Directo</button>
             <button onClick={handleDownloadPDF} disabled={generating} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-xl hover:bg-indigo-700 disabled:opacity-50">
               {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />} Generar PDF A4
             </button>
             <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-2xl transition-all"><X className="w-6 h-6 text-slate-400" /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-10 bg-slate-200/50 no-scrollbar">
           <div ref={containerRef} className="bg-white mx-auto shadow-2xl p-8 grid grid-cols-3 gap-6" style={{ width: '210mm', minHeight: '297mm' }}>
             {products.map(p => (
               <div key={p.id} className="border border-slate-900 flex flex-col items-center justify-around p-4 h-[40mm] break-words">
                  <QRCodeSVG value={`${window.location.origin}?id=${p.id}`} size={70} />
                  <div className="text-center w-full mt-2">
                    <p className="text-[10px] font-black uppercase leading-tight h-8 flex items-center justify-center">{p.name}</p>
                    <p className="text-[12px] font-black mt-1">{p.code}</p>
                  </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};
