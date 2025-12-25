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

export function calculateMargin(purchase: number, sale: number) {
  if (!purchase || !sale) return { amount: 0, percent: 0 };
  const amount = sale - purchase;
  const percent = (amount / purchase) * 100;
  return { amount, percent };
}