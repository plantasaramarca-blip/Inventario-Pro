import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function exportToExcel(
  data: any[],
  fileName: string,
  sheetName: string
): void {
  if (data.length === 0) throw new Error("Sin datos para exportar");
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${fileName}.xlsx`);
}

export function exportToPDF(
  title: string,
  headers: string[][],
  body: any[][],
  fileName: string
) {
  const doc = new jsPDF();
  doc.setFontSize(14);
  doc.setTextColor(79, 70, 229);
  doc.text(title, 14, 15);

  doc.setFontSize(7);
  doc.setTextColor(150);
  doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 20);

  autoTable(doc, {
    startY: 25,
    head: headers,
    body: body,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    margin: { top: 25 }
  });

  doc.save(`${fileName}.pdf`);
}