
import React, { useRef } from 'https://esm.sh/react@19.0.0';
import { QRCodeSVG } from 'https://esm.sh/qrcode.react@3.1.0';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';
import html2canvas from 'https://esm.sh/html2canvas@1.4.1';
// Added Info to the imports
import { X, Printer, Files, Settings, MapPin, Package, Download, Info } from 'https://esm.sh/lucide-react@0.475.0?deps=react@19.0.0';

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

  // ═══════════════════════════════════════════════════════
  // CONFIGURACIÓN DE MEDIDAS - AJUSTABLE SEGÚN ETIQUETADORA
  // ═══════════════════════════════════════════════════════
  const CONFIG = {
    // TAMAÑO DE LA ETIQUETA (en milímetros)
    // 50x30mm es el estándar para etiquetas de estantería o productos.
    labelWidth: 50,  
    labelHeight: 30, 
    
    // TAMAÑO DEL QR (en milímetros)
    // 20mm es ideal para ser escaneado rápidamente por celulares.
    qrSize: 20, 
    
    // RESOLUCIÓN DE IMPRESIÓN (DPI)
    // 203 DPI es el estándar de las Zebra, Brother y TSC térmicas.
    dpi: 203,
    
    // TAMAÑO DE FUENTE (en puntos pt)
    fontSizeTitle: 8,  
    fontSizeCode: 7,   
    fontSizeLocation: 6,
    
    // MÁRGENES (en milímetros)
    margin: 2, 
  };

  // Conversión técnica de mm a píxeles para el renderizado del navegador
  const mmToPx = (mm: number) => (mm * CONFIG.dpi) / 25.4;
  
  const labelWidthPx = mmToPx(CONFIG.labelWidth);
  const labelHeightPx = mmToPx(CONFIG.labelHeight);
  const qrSizePx = mmToPx(CONFIG.qrSize);
  const marginPx = mmToPx(CONFIG.margin);

  // URL para el QR: Redirige a la vista pública del producto
  const qrUrl = `${window.location.origin}?view_product=${product.id}`;

  const generatePDF = async (count: number = 1) => {
    if (!labelRef.current) return;

    try {
      const canvas = await html2canvas(labelRef.current, {
        scale: 3, // Multiplicador de calidad para evitar pixelado en impresión térmica
        backgroundColor: '#ffffff',
        useCORS: true
      });

      const imgData = canvas.toDataURL('image/png');

      if (count === 1) {
        // PDF de etiqueta única (Tamaño exacto del papel de la etiquetadora)
        const pdf = new jsPDF({
          orientation: CONFIG.labelWidth > CONFIG.labelHeight ? 'l' : 'p',
          unit: 'mm',
          format: [CONFIG.labelWidth, CONFIG.labelHeight],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, CONFIG.labelWidth, CONFIG.labelHeight);
        pdf.save(`QR_${product.qr_code || 'PROD'}_${product.name.substring(0, 10)}.pdf`);
      } else {
        // PDF en hoja A4 para impresión masiva en oficina
        const pdf = new jsPDF('p', 'mm', 'a4');
        const pageWidth = 210;
        const pageHeight = 297;
        const cols = Math.floor((pageWidth - 10) / CONFIG.labelWidth);
        const rows = Math.floor((pageHeight - 10) / CONFIG.labelHeight);
        const labelsPerPage = cols * rows;

        for (let i = 0; i < count; i++) {
          if (i > 0 && i % labelsPerPage === 0) pdf.addPage();
          
          const pageIdx = i % labelsPerPage;
          const col = pageIdx % cols;
          const row = Math.floor(pageIdx / cols);
          
          const x = 5 + (col * CONFIG.labelWidth);
          const y = 5 + (row * CONFIG.labelHeight);

          pdf.addImage(imgData, 'PNG', x, y, CONFIG.labelWidth, CONFIG.labelHeight);
        }
        pdf.save(`QR_Masivo_${product.qr_code}_x${count}.pdf`);
      }
    } catch (error) {
      console.error('Error:', error);
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
              <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                <Printer className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Etiquetado QR</h2>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Preparación de identificación física</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <X className="w-6 h-6 text-slate-400" />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* VISTA PREVIA TÉCNICA */}
            <div className="space-y-4">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vista Previa de Impresión</p>
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
                      boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    }}
                  >
                    <QRCodeSVG value={qrUrl} size={qrSizePx} level="M" />
                    
                    <div style={{
                      fontSize: `${CONFIG.fontSizeTitle}pt`,
                      fontWeight: '900',
                      textAlign: 'center',
                      marginTop: '2px',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      textTransform: 'uppercase',
                      color: '#1e293b'
                    }}>
                      {product.name}
                    </div>
                    
                    <div style={{
                      fontSize: `${CONFIG.fontSizeCode}pt`,
                      color: '#64748b',
                      fontWeight: 'bold',
                      letterSpacing: '1px'
                    }}>
                      {product.qr_code || 'SIN-CODIGO'}
                    </div>

                    {product.location && (
                      <div style={{
                        fontSize: `${CONFIG.fontSizeLocation}pt`,
                        color: '#94a3b8',
                        fontWeight: 'bold',
                        marginTop: '1px',
                        display: 'flex',
                        alignItems: 'center'
                      }}>
                        LOC: {product.location}
                      </div>
                    )}
                  </div>
               </div>
               
               <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <Settings className="w-3 h-3 text-indigo-600" />
                    <span className="text-[9px] font-black text-indigo-700 uppercase">Ajustes Técnicos</span>
                  </div>
                  <pre className="text-[8px] text-indigo-500 font-mono leading-relaxed">
                    PAPEL: {CONFIG.labelWidth}x{CONFIG.labelHeight}mm<br/>
                    DPI: {CONFIG.dpi} | QR: {CONFIG.qrSize}mm<br/>
                    MÁRGEN: {CONFIG.margin}mm
                  </pre>
               </div>
            </div>

            {/* OPCIONES DE DESCARGA */}
            <div className="space-y-6">
              <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Acciones de Generación</p>
                
                <button 
                  onClick={() => generatePDF(1)}
                  className="w-full p-4 bg-white border-2 border-slate-100 hover:border-indigo-600 hover:bg-indigo-50 rounded-2xl flex items-center group transition-all"
                >
                  <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl mr-4 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                    <Download className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-800 uppercase">Etiqueta Individual</p>
                    <p className="text-[9px] text-slate-400 font-bold">PDF para impresora térmica ({CONFIG.labelWidth}x{CONFIG.labelHeight}mm)</p>
                  </div>
                </button>

                <button 
                  onClick={() => {
                    const qty = prompt("¿Cuántas etiquetas desea en la hoja A4?", String(product.stock || 1));
                    if(qty) generatePDF(Number(qty));
                  }}
                  className="w-full p-4 bg-white border-2 border-slate-100 hover:border-emerald-600 hover:bg-emerald-50 rounded-2xl flex items-center group transition-all"
                >
                  <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl mr-4 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                    <Files className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-black text-slate-800 uppercase">Planilla Masiva (A4)</p>
                    <p className="text-[9px] text-slate-400 font-bold">PDF con múltiples etiquetas para hojas adhesivas</p>
                  </div>
                </button>
              </div>

              <div className="p-5 bg-slate-50 rounded-3xl border border-slate-100">
                <div className="flex items-start space-x-3">
                  <Info className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight">Recomendaciones</p>
                    <ul className="text-[9px] text-slate-500 font-bold space-y-1 list-disc ml-3">
                      <li>Use papel térmico autoadhesivo de alta calidad.</li>
                      <li>Limpie el cabezal de su impresora cada 200 etiquetas.</li>
                      <li>El QR incluye una URL única para escaneo móvil.</li>
                    </ul>
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
