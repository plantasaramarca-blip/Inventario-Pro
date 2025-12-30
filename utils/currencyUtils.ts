
export function formatCurrency(
  amount: number, 
  currency: string = 'PEN'
): string {
  const symbols: Record<string, string> = {
    'PEN': 'S/',
    'USD': '$',
    'EUR': '€'
  };
  
  const symbol = symbols[currency] || 'S/';
  
  return `${symbol} ${amount.toLocaleString('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}
