
import React, { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { X } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string, decodedResult: any) => void;
  onClose: () => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onClose }) => {
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0,
      disableFlip: false,
    };

    const html5QrCode = new Html5Qrcode('qr-reader');
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          onScanSuccess,
          (errorMessage) => { }
        );
      } catch (err) {
        console.error('Error al iniciar el escáner QR:', err);
        onClose();
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(err => console.error("Fallo al detener el escáner", err));
      }
    };
  }, [onScanSuccess, onClose]);

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/90 backdrop-blur-sm animate-in fade-in">
      <div id="qr-reader" className="w-full h-full"></div>
      <button
        onClick={onClose}
        className="absolute top-6 right-6 p-4 bg-white/20 rounded-2xl text-white hover:bg-white/30 transition-all"
        aria-label="Cerrar escáner"
      >
        <X className="w-6 h-6" />
      </button>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[280px] h-[280px] border-4 border-white/50 rounded-3xl shadow-2xl"></div>
      </div>
      <p className="absolute bottom-10 left-1/2 -translate-x-1/2 text-white/80 text-xs font-bold uppercase tracking-widest">Alinear código QR</p>
    </div>
  );
};
