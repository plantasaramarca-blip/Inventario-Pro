
import React, { useRef } from 'https://esm.sh/react@19.2.3';
import { QRCodeSVG } from 'https://esm.sh/qrcode.react@3.1.0?deps=react@19.2.3';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';
import html2canvas from 'https://esm.sh/html2canvas@1.4.1';
import { X, Printer, Download, AlertTriangle, FileDown } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.2.3';

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
  // El link ahora incluye un parámetro de acción rápida
  const qrUrl = `${window.location.origin}?action=quick_move&id=${product.id}`;

  const handleDownload = async () => {
    if (!labelRef.current) return;
    try {
      // Optimizamos para impresión térmica: blanco y negro, sin suavizado excesivo
      const canvas = await html2canvas(labelRef.current, { 
        scale: 4, 
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      // Tamaño estándar de etiqueta térmica: 50mm x 30mm
      const pdf = new jsPDF({ orientation: 'l', unit: 'mm', format: [50, 30] });
      pdf.addImage(imgData, 'PNG', 0, 0, 50, 30);
      pdf.save(`ETIQUETA_${displayCode}.pdf`);
    } catch (e) {
      console.error('Error al generar PDF:', e);
    }
  };

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white rounded-[3rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
        <div className="p-8 sm:p-10">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-600 rounded-2xl text-white shadow-lg">
                <Printer className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Etiqueta de Activo</h2>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Optimizado para Térmica 50x30mm</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex flex-col items-center gap-8">
            {/* Contenedor de la Etiqueta Real (Lo que se imprime) */}
            <div className="bg-slate-50 rounded-[2.5rem] p-10 border-2 border-dashed border-slate-200 w-full flex justify-center">
              <div 
                ref={labelRef} 
                className="bg-white flex flex-col items-center justify-between p-2" 
                style={{ width: '188px', height: '113px', border: '1px solid #eee' }}
              >
                {/* QR más grande para facilitar lectura */}
                <div className="mt-1">
                  <QRCodeSVG value={qrUrl} size={70} level="H" includeMargin={false} />
                </div>
                <div className="text-center w-full px-1 mb-1">
                  {/* Nombre con ajuste de línea si es largo */}
                  <p className="text-[9px] font-black uppercase text-slate-900 leading-[1.1] mb-0.5 max-h-[22px] overflow-hidden">
                    {product.name}
                  </p>
                  <p className="text-[10px] font-black text-indigo-600 tracking-widest leading-none">
                    {displayCode}
                  </p>
                </div>
              </div>
            </div>

            <div className="w-full space-y-3">
              <button onClick={handleDownload} className="w-full py-5 bg-slate-900 text-white rounded-[2rem] text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 active:scale-95">
                <FileDown className="w-5 h-5" /> 
                Descargar Etiqueta (PDF)
              </button>
              <p className="text-center text-[9px] text-slate-400 font-bold uppercase">Formato compatible con Zebra / Brother / XPprinter</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
