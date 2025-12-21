
import * as XLSX from 'xlsx';

/**
 * Exporta un array de objetos a un archivo Excel.
 * @param data Lista de objetos con los datos (las llaves serán los encabezados).
 * @param fileName Nombre del archivo (incluyendo extensión .xlsx).
 * @param sheetName Nombre de la pestaña dentro del Excel.
 */
export function exportToExcel(
  data: any[],
  fileName: string,
  sheetName: string
): void {
  try {
    if (data.length === 0) {
      throw new Error("No hay datos para exportar");
    }

    // Crear un nuevo libro de trabajo (workbook)
    const wb = XLSX.utils.book_new();
    
    // Convertir los datos JSON a una hoja (worksheet)
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Ajuste automático de ancho de columnas básico
    const objectMaxLength: number[] = [];
    data.forEach((row) => {
      Object.values(row).forEach((val, i) => {
        const columnValue = val ? val.toString() : "";
        objectMaxLength[i] = Math.max(objectMaxLength[i] || 10, columnValue.length + 2);
      });
    });
    ws['!cols'] = objectMaxLength.map(w => ({ width: w }));

    // Agregar la hoja al libro
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    
    // Disparar la descarga del archivo
    XLSX.writeFile(wb, fileName);
    
  } catch (error) {
    console.error('Error exportando a Excel:', error);
    throw error;
  }
}

/**
 * Formatea una fecha para ser usada en nombres de archivos.
 * Resultado: YYYYMMDD_HHMMSS
 */
export function formatTimestamp(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
}

/**
 * Obtiene el texto legible del estado de stock.
 */
export function getStockStatusLabel(stock: number, minStock: number): string {
  if (stock === 0) return 'Sin Stock';
  if (stock <= minStock) return 'Stock Bajo';
  return 'Disponible';
}
