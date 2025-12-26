
import React from 'https://esm.sh/react@19.2.3';
import { getStockInfo } from '../utils/stockUtils';

interface StockBadgeProps {
  stock: number;
  minStock: number;
  criticalStock?: number;
}

export const StockBadge: React.FC<StockBadgeProps> = ({ stock, minStock, criticalStock = 10 }) => {
  const info = getStockInfo(stock, minStock, criticalStock);

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${info.bgColor} ${info.textColor} border-transparent shadow-sm`}>
      <span className={`w-1.5 h-1.5 mr-1.5 rounded-full ${info.dotColor} ${info.status === 'CRITICO' || info.status === 'SIN_STOCK' ? 'animate-pulse' : ''}`}></span>
      {info.label}
    </span>
  );
};
