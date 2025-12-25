export type TransactionType = 'INGRESO' | 'SALIDA';
export type ContactType = 'CLIENTE' | 'PROVEEDOR' | 'OTRO';
export type Role = 'ADMIN' | 'USER';

export interface Contact {
  id: string;
  name: string;
  type: ContactType;
  phone?: string;
  email?: string;
  taxId?: string;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  location: string;
  stock: number;
  minStock: number;      // Stock Bajo (Amarillo)
  criticalStock: number; // Stock Crítico (Rojo)
  price: number;         // Alias para purchasePrice (compatibilidad)
  purchasePrice: number; // Precio de compra unitario
  salePrice?: number;    // Precio de venta unitario
  currency: 'PEN' | 'USD' | 'EUR';
  unit: string;
  imageUrl?: string;
  updatedAt: string;
}

export interface Movement {
  id: string;
  productId: string;
  productName: string;
  type: TransactionType;
  quantity: number;
  date: string;
  dispatcher: string;
  reason: string;
  balanceAfter: number;
  contactId?: string;
  contactName?: string;
  updatedPrice?: number; // Precio de compra actualizado en este movimiento
}

export interface InventoryStats {
  totalProducts: number;
  lowStockCount: number;
  criticalStockCount: number;
  outOfStockCount: number;
  totalMovements: number;
  totalContacts: number;
  totalValue: number;         // Basado en purchasePrice * stock
}

export interface AuditLog {
  id: string;
  created_at: string;
  user_id: string;
  user_email: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  table_name: string;
  record_id: string;
  record_name: string;
  old_values: any;
  new_values: any;
  changes_summary: string;
}