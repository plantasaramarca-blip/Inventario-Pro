import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { X, Printer, Download, Info, AlertTriangle } from 'lucide-react';

interface ProductQRCodeProps {
  product: {
    id: string;
    code: string;
    name: string;
    qr_code?: string;
  };
  onClose: () => void;
}

export const ProductQRCode: React.FC<ProductQRCodeProps> = ({ product, onClose }) => {
  const labelRef = useRef<HTMLDivElement>(null);
  
  // Usamos el código del producto si el QR aún no existe en la BD
  const displayCode = product.qr_code || product.code || 'SIN-CODIGO';
  const qrUrl = `${window.location.origin}?view_product=${product.id}`;

  const handleDownload = async () => {
    if (!labelRef.current) return;
    try {
      const canvas = await html2canvas(labelRef.current, { scale: 3, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: [50, 30] });
      pdf.addImage(imgData, 'PNG', 0, 0, 50, 30);
      pdf.save(`QR_${displayCode}.pdf`);
    } catch (e) {
      console.error('Error al generar PDF:', e);
      alert('Error generando PDF. Por favor intente de nuevo.');
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="p-10">
          <div className="flex justify-between items-center mb-10">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Etiqueta de Activo</h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Generación de QR Térmico</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-3 hover:bg-slate-100 rounded-2xl transition-all text-slate-400 hover:text-slate-800"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {!product.qr_code && (
            <div className="mb-8 p-5 bg-amber-50 border border-amber-100 rounded-3xl flex items-start text-amber-700">
              <AlertTriangle className="w-5 h-5 mr-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-black uppercase tracking-tight mb-1">SKU en modo de respaldo</p>
                <p className="text-[10px] font-medium leading-relaxed">
                  La columna de QR no se detectó en Supabase. Se está usando el código del producto para la etiqueta.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-10">
            <div className="flex flex-col items-center justify-center bg-slate-50 rounded-[3rem] p-12 border-2 border-dashed border-slate-200">
              <div 
                ref={labelRef} 
                className="bg-white p-6 flex flex-col items-center justify-center shadow-xl rounded-lg" 
                style={{ width: '180px', height: '110px' }}
              >
                <QRCodeSVG value={qrUrl} size={65} level="H" includeMargin={false} />
                <p className="text-[10px] font-black mt-2 uppercase text-center truncate w-full px-1 text-slate-800">{product.name}</p>
                <p className="text-[8px] font-bold text-indigo-500 uppercase tracking-widest">{displayCode}</p>
              </div>
              <p className="mt-6 text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Vista previa (50x30mm)</p>
            </div>

            <div className="space-y-4">
              <button 
                onClick={handleDownload} 
                className="w-full py-5 bg-slate-900 text-white rounded-3xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 group"
              >
                <Download className="w-5 h-5 group-hover:translate-y-1 transition-transform" /> 
                Exportar Etiqueta PDF
              </button>
              
              <div className="p-5 bg-indigo-50/50 rounded-3xl border border-indigo-100/50">
                <div className="flex items-start gap-4">
                  <div className="bg-indigo-100 p-2 rounded-xl">
                    <Info className="w-4 h-4 text-indigo-600" />
                  </div>
                  <p className="text-[10px] text-indigo-700 font-bold leading-relaxed uppercase">
                    Configuración recomendada: Imprimir en escala 100%, papel térmico 50mm x 30mm, orientación horizontal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};