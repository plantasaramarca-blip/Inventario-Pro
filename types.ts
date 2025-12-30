
export type TransactionType = 'INGRESO' | 'SALIDA';
export type ContactType = 'CLIENTE' | 'PROVEEDOR' | 'OTRO';
export type Role = 'ADMIN' | 'USER' | 'VIEWER';
export type DestinationType = 'cliente' | 'sucursal' | 'interno';

export interface UserAccount {
  id: string;
  email: string;
  password?: string;
  role: Role;
  createdAt: string;
}

export interface LocationMaster {
  id: string;
  name: string;
}

export interface CategoryMaster {
  id: string;
  name: string;
}

export interface Destination {
  id: string;
  name: string;
  type: DestinationType;
  description?: string;
  active: boolean;
  createdAt: string;
}

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
  brand: string;
  size: string;
  model: string;
  category: string;
  location: string;
  stock: number;
  minStock: number;
  criticalStock: number;
  purchasePrice: number;
  currency: 'PEN' | 'USD' | 'EUR';
  unit: string;
  imageUrl?: string;
  updatedAt: string;
  qr_code?: string;
  qr_data?: string;
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
  supplierName?: string; // Nuevo: Nombre del proveedor en ingresos
  carriedBy?: string;    // Nuevo: Quién llevó la mercadería en salidas
  updatedPrice?: number;
  destinationId?: string;
  destinationName?: string;
  destinationType?: DestinationType;
}

export interface InventoryStats {
  totalProducts: number;
  lowStockCount: number;
  criticalStockCount: number;
  outOfStockCount: number;
  totalMovements: number;
  totalContacts: number;
  totalValue: number;
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
