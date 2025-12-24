
import { Product } from '../types';

export type StockStatus = 'CRITICO' | 'BAJO' | 'BUENO' | 'SIN_STOCK';

export interface StockInfo {
  status: StockStatus;
  color: string;
  bgColor: string;
  textColor: string;
  dotColor: string;
  icon: string;
  label: string;
}

export function getStockInfo(
  currentStock: number,
  minStock: number = 30,
  criticalStock: number = 10
): StockInfo {
  if (currentStock === 0) {
    return {
      status: 'SIN_STOCK',
      color: 'bg-slate-500',
      bgColor: 'bg-slate-100',
      textColor: 'text-slate-800',
      dotColor: 'bg-slate-500',
      icon: '⛔',
      label: 'Sin Stock'
    };
  }
  
  if (currentStock <= criticalStock) {
    return {
      status: 'CRITICO',
      color: 'bg-red-500',
      bgColor: 'bg-red-100',
      textColor: 'text-red-800',
      dotColor: 'bg-red-500',
      icon: '🔴',
      label: 'Crítico'
    };
  }
  
  if (currentStock <= minStock) {
    return {
      status: 'BAJO',
      color: 'bg-amber-500',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-800',
      dotColor: 'bg-amber-500',
      icon: '🟡',
      label: 'Stock Bajo'
    };
  }
  
  return {
    status: 'BUENO',
    color: 'bg-emerald-500',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-800',
    dotColor: 'bg-emerald-500',
    icon: '🟢',
    label: 'Disponible'
  };
}

export function groupProductsByStatus(products: Product[]) {
  return {
    sinStock: products.filter(p => p.stock === 0),
    criticos: products.filter(p => p.stock > 0 && p.stock <= p.criticalStock),
    bajos: products.filter(p => p.stock > p.criticalStock && p.stock <= p.minStock),
    buenos: products.filter(p => p.stock > p.minStock)
  };
}
