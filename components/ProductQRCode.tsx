import React, { useRef } from 'react';
import { QRCodeSVG } from 'https://esm.sh/qrcode.react@3.1.0?external=react,react-dom';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';
import html2canvas from 'https://esm.sh/html2canvas@1.4.1';
import { X, Printer, FileDown } from 'https://esm.sh/lucide-react@0.475.0?external=react,react-dom';

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
  const displayCode = product.code || 'SIN-CODIGO';
  const qrUrl = `${window.location.origin}?action=quick_move&id=${product.id}`;

  const handleDownload = async () => {
    if (!labelRef.current) return;
    try {
      const canvas = await html2canvas(labelRef.current, { 
        scale: 4, 
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({ 
        orientation: 'l', 
        unit: 'mm', 
        format: [50, 30]
      });
      pdf.addImage(imgData, 'PNG', 0, 0, 50, 30);
      pdf.save(`ETIQUETA_${displayCode}.pdf`);
    } catch (e) {
      console.error('Error al generar PDF:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white rounded-[2.5rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 border border-white/20">
        <div className="p-8">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-indigo-600 rounded-xl text-white shadow-lg">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Etiqueta QR</h2>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">Térmica 50x30mm</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-6">
            <div className="bg-slate-50 rounded-[2rem] p-6 border-2 border-dashed border-slate-200 w-full flex justify-center">
              <div 
                ref={labelRef} 
                className="bg-white flex flex-col items-center justify-center" 
                style={{ width: '188px', height: '113px', border: '1px solid #000', padding: '4px' }}
              >
                <div style={{ marginBottom: '2px' }}>
                  <QRCodeSVG value={qrUrl} size={60} level="H" />
                </div>
                <div className="text-center w-full">
                  <p style={{ fontSize: '8px', fontWeight: '900', color: '#000', textTransform: 'uppercase', lineHeight: '1.0', margin: '0', height: '16px', overflow: 'hidden' }}>
                    {product.name}
                  </p>
                  <p style={{ fontSize: '11px', fontWeight: '900', color: '#000', margin: '1px 0 0 0', letterSpacing: '0.5px' }}>
                    {displayCode}
                  </p>
                </div>
              </div>
            </div>

            <button onClick={handleDownload} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 active:scale-95">
              <FileDown className="w-4 h-4" /> 
              Descargar PDF Etiqueta
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};