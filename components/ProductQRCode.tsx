
import React, { useRef } from 'https://esm.sh/react@19.0.0';
import { QRCodeSVG } from 'https://esm.sh/qrcode.react@3.1.0';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';
import html2canvas from 'https://esm.sh/html2canvas@1.4.1';
import { X, Printer, Files, Settings, MapPin, Package, Download, Info, AlertTriangle } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.0.0';

interface ProductQRCodeProps {
  product: {
    id: string;
    code: string;
    name: string;
    qr_code?: string;
    location?: string;
    stock?: number;
  };
  onClose: () => void;
}

export const ProductQRCode: React.FC<ProductQRCodeProps> = ({ product, onClose }) => {
  const labelRef = useRef<HTMLDivElement>(null);

  // PROTECCIÓN CRÍTICA: Si no hay qr_code, mostrar aviso amigable
  if (!product.qr_code) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose}></div>
        <div className="relative bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl animate-in zoom-in-95">
          <div className="text-center space-y-6">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mx-auto border-4 border-amber-100">
               <AlertTriangle className="w-10 h-10 text-amber-500" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight mb-2">QR No Generado</h2>
              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Este producto no tiene un código asignado. Esto suele ocurrir con ítems antiguos o errores en la base de datos.
              </p>
            </div>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-left">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Solución rápida:</p>
              <p className="text-[10px] text-slate-600 font-bold uppercase">Edita este producto y presiona "Guardar" para asignarle un QR automáticamente.</p>
            </div>
            <button onClick={onClose} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Cerrar</button>
          </div>
        </div>
      </div>
    );
  }

  const CONFIG = {
    labelWidth: 50,  
    labelHeight: 30, 
    qrSize: 20, 
    dpi: 203,
    fontSizeTitle: 8,  
    fontSizeCode: 7,   
    fontSizeLocation: 6,
    margin: 2, 
  };

  const mmToPx = (mm: number) => (mm * CONFIG.dpi) / 25.4;
  const labelWidthPx = mmToPx(CONFIG.labelWidth);
  const labelHeightPx = mmToPx(CONFIG.labelHeight);
  const qrSizePx = mmToPx(CONFIG.qrSize);
  const marginPx = mmToPx(CONFIG.margin);

  const qrUrl = `${window.location.origin}?view_product=${product.id}`;

  const generatePDF = async (count: number = 1) => {
    if (!labelRef.current) return;
    try {
      const canvas = await html2canvas(labelRef.current, {
        scale: 3,
        backgroundColor: '#ffffff',
        useCORS: true
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: CONFIG.labelWidth > CONFIG.labelHeight ? 'l' : 'p',
        unit: 'mm',
        format: [CONFIG.labelWidth, CONFIG.labelHeight],
      });
      pdf.addImage(imgData, 'PNG', 0, 0, CONFIG.labelWidth, CONFIG.labelHeight);
      pdf.save(`QR_${product.qr_code}.pdf`);
    } catch (error) {
      alert('Error al generar PDF');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-md" onClick={onClose}></div>
      <div className="relative bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-8">
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg">
                <Printer className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Etiquetado QR</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Vista de Identificación Física</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Previsualización</p>
               <div className="bg-slate-100 rounded-[2rem] p-8 flex items-center justify-center border-2 border-dashed border-slate-200">
                  <div
                    ref={labelRef}
                    style={{
                      width: `${labelWidthPx}px`,
                      height: `${labelHeightPx}px`,
                      padding: `${marginPx}px`,
                      backgroundColor: 'white',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <QRCodeSVG value={qrUrl} size={qrSizePx} level="M" />
                    <div style={{ fontSize: `${CONFIG.fontSizeTitle}pt`, fontWeight: '900', textAlign: 'center', marginTop: '2px', textTransform: 'uppercase' }}>{product.name}</div>
                    <div style={{ fontSize: `${CONFIG.fontSizeCode}pt`, color: '#64748b', fontWeight: 'bold' }}>{product.qr_code}</div>
                  </div>
               </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <button onClick={() => generatePDF(1)} className="w-full p-4 bg-white border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50 rounded-2xl flex items-center group transition-all">
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl mr-4 group-hover:bg-indigo-600 group-hover:text-white transition-all"><Download className="w-5 h-5" /></div>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-800 uppercase">Descargar Etiqueta</p>
                    <p className="text-[9px] text-slate-400 font-bold">PDF Térmico ({CONFIG.labelWidth}x{CONFIG.labelHeight}mm)</p>
                  </div>
                </button>
              </div>
              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-indigo-500 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-black text-slate-800 uppercase">Instrucciones</p>
                    <p className="text-[9px] text-slate-500 font-bold">Asegúrese de imprimir en tamaño real (100%) para mantener las medidas exactas de la etiquetadora.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
