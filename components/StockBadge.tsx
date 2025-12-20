import React from 'react';

interface StockBadgeProps {
  stock: number;
  minStock: number;
}

export const StockBadge: React.FC<StockBadgeProps> = ({ stock, minStock }) => {
  let colorClass = '';
  let label = '';
  let dotClass = '';

  if (stock === 0) {
    colorClass = 'bg-red-100 text-red-800 border-red-200';
    dotClass = 'bg-red-500';
    label = 'Sin Stock';
  } else if (stock <= minStock) {
    colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-200';
    dotClass = 'bg-yellow-500';
    label = 'Stock Bajo';
  } else {
    colorClass = 'bg-green-100 text-green-800 border-green-200';
    dotClass = 'bg-green-500';
    label = 'Disponible';
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
      <span className={`w-2 h-2 mr-1.5 rounded-full ${dotClass} animate-pulse`}></span>
      {label}
    </span>
  );
};