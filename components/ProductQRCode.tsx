
import React, { useRef } from 'react';
import { QRCodeSVG } from 'https://esm.sh/qrcode.react@3.1.0?deps=react@19.2.3';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';
import html2canvas from 'https://esm.sh/html2canvas@1.4.1';
import { X, Printer, Download, Info, AlertTriangle } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

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
      alert('Error generando PDF');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-white rounded-[2rem] w-full max-w-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-indigo-600 rounded-xl text-white"><Printer className="w-5 h-5" /></div>
              <h2 className="text-lg font-black text-slate-800 uppercase">Etiqueta QR</h2>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X className="w-5 h-5 text-slate-400" /></button>
          </div>

          {!product.qr_code && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center text-amber-700">
              <AlertTriangle className="w-5 h-5 mr-3 flex-shrink-0" />
              <p className="text-[10px] font-bold uppercase">Nota: Usando SKU temporal. Ejecute el SQL en Supabase para habilitar QRs únicos.</p>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col items-center justify-center bg-slate-50 rounded-3xl p-6 border-2 border-dashed border-slate-200">
              <div ref={labelRef} className="bg-white p-4 flex flex-col items-center justify-center shadow-sm" style={{ width: '150px', height: '90px' }}>
                <QRCodeSVG value={qrUrl} size={50} level="M" />
                <p className="text-[8px] font-black mt-1 uppercase text-center truncate w-full">{product.name}</p>
                <p className="text-[7px] font-bold text-slate-400">{displayCode}</p>
              </div>
            </div>

            <div className="space-y-4">
              <button onClick={handleDownload} className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Descargar PDF (50x30mm)
              </button>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-indigo-500 mt-0.5" />
                  <p className="text-[9px] text-slate-500 font-medium leading-relaxed uppercase">
                    Ideal para impresoras térmicas. Ajuste la escala al 100% al imprimir.
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
