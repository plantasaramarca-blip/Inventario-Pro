
import * as XLSX from 'https://esm.sh/xlsx@0.18.5';

export function exportToExcel(
  data: any[],
  fileName: string,
  sheetName: string
): void {
  try {
    if (data.length === 0) throw new Error("Sin datos");
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    const objectMaxLength: number[] = [];
    data.forEach((row) => {
      Object.values(row).forEach((val, i) => {
        const columnValue = val ? val.toString() : "";
        objectMaxLength[i] = Math.max(objectMaxLength[i] || 10, columnValue.length + 2);
      });
    });
    ws['!cols'] = objectMaxLength.map(w => ({ width: w }));
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
  } catch (error) {
    console.error('Excel Export Error:', error);
    throw error;
  }
}

export function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}`;
}

export function getStockStatusLabel(stock: number, minStock: number): string {
  if (stock === 0) return 'Sin Stock';
  if (stock <= minStock) return 'Stock Bajo';
  return 'Disponible';
}
