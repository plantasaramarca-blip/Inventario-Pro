
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';
import { jsPDF } from 'https://esm.sh/jspdf@2.5.1';
import 'https://esm.sh/jspdf-autotable@3.8.2?deps=jspdf@2.5.1';

export function exportToExcel(
  data: any[],
  fileName: string,
  sheetName: string
): void {
  try {
    if (data.length === 0) throw new Error("Sin datos");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Autoajustar ancho de columnas
    const objectMaxLength: number[] = [];
    data.forEach((row) => {
      Object.values(row).forEach((val, i) => {
        const columnValue = val ? val.toString() : "";
        objectMaxLength[i] = Math.max(objectMaxLength[i] || 10, columnValue.length + 2);
      });
    });
    ws['!cols'] = objectMaxLength.map(w => ({ width: w }));

    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  } catch (error) {
    console.error('Excel Export Error:', error);
    alert('Error al exportar Excel');
  }
}

export function exportToPDF(
  title: string,
  headers: string[][],
  body: any[][],
  fileName: string
) {
  const doc = new jsPDF();
  
  // Header del PDF
  doc.setFontSize(18);
  doc.setTextColor(79, 70, 229); // Indigo 600
  doc.text(title, 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Generado el: ${new Date().toLocaleString()}`, 14, 30);

  (doc as any).autoTable({
    startY: 35,
    head: headers,
    body: body,
    theme: 'striped',
    headStyles: { fillStyle: 'dark', fillColor: [79, 70, 229], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    margin: { top: 35 }
  });

  doc.save(`${fileName}.pdf`);
}

export function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}`;
}
