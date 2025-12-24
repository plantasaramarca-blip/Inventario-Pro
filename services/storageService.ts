
import { Product, Movement, InventoryStats, Contact, AuditLog } from '../types';

const PRODUCTS_KEY = 'kardex_products';
const MOVEMENTS_KEY = 'kardex_movements';
const CONTACTS_KEY = 'kardex_contacts';
const CATEGORIES_KEY = 'kardex_categories';
const AUDIT_KEY = 'kardex_audit';

const seedData = () => {
  if (!localStorage.getItem(CATEGORIES_KEY)) {
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(['Tecnología', 'Oficina', 'Impresión', 'Limpieza', 'Otros']));
  }
  if (!localStorage.getItem(PRODUCTS_KEY)) {
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(MOVEMENTS_KEY)) {
    localStorage.setItem(MOVEMENTS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(CONTACTS_KEY)) {
    localStorage.setItem(CONTACTS_KEY, JSON.stringify([]));
  }
  if (!localStorage.getItem(AUDIT_KEY)) {
    localStorage.setItem(AUDIT_KEY, JSON.stringify([]));
  }
};

export const getAuditLogs = (page = 0, limit = 50) => {
  seedData();
  const data = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
  const sorted = data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return {
    data: sorted.slice(page * limit, (page + 1) * limit),
    count: sorted.length
  };
};

export const saveAuditLog = (log: Partial<AuditLog>) => {
  seedData();
  const logs = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
  const newLog = {
    ...log,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString()
  };
  logs.unshift(newLog);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
};

export const getCategories = (): string[] => {
  seedData();
  return JSON.parse(localStorage.getItem(CATEGORIES_KEY) || '[]');
};

export const saveCategory = (category: string): void => {
  const categories = getCategories();
  if (!categories.includes(category)) {
    categories.push(category);
    localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories));
  }
};

export const getProducts = (): Product[] => {
  seedData();
  return JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
};

export const saveProduct = (product: Product): void => {
  const products = getProducts();
  const existingIndex = products.findIndex(p => p.id === product.id);
  if (existingIndex >= 0) products[existingIndex] = product;
  else products.push(product);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

export const deleteProduct = (id: string): void => {
  const products = getProducts().filter(p => p.id !== id);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
};

export const getContacts = (): Contact[] => {
  seedData();
  return JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]');
};

export const saveContact = (contact: Contact): void => {
  const contacts = getContacts();
  const existingIndex = contacts.findIndex(c => c.id === contact.id);
  if (existingIndex >= 0) contacts[existingIndex] = contact;
  else contacts.push(contact);
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
};

export const deleteContact = (id: string): void => {
  const contacts = getContacts().filter(c => c.id !== id);
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
};

export const getMovements = (): Movement[] => {
  seedData();
  return JSON.parse(localStorage.getItem(MOVEMENTS_KEY) || '[]');
};

export const registerMovement = (movement: Omit<Movement, 'id' | 'balanceAfter' | 'productName'>): Movement => {
  const products = getProducts();
  const productIndex = products.findIndex(p => p.id === movement.productId);
  if (productIndex === -1) throw new Error("Producto no encontrado");

  const product = products[productIndex];
  let newStock = product.stock;
  if (movement.type === 'INGRESO') newStock += movement.quantity;
  else {
    if (product.stock < movement.quantity) throw new Error("Stock insuficiente");
    newStock -= movement.quantity;
  }

  product.stock = newStock;
  product.updatedAt = new Date().toISOString();
  products[productIndex] = product;
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));

  const newMovement: Movement = {
    ...movement,
    id: Date.now().toString(),
    productName: product.name,
    balanceAfter: newStock,
  };

  const movements = getMovements();
  movements.unshift(newMovement);
  localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));
  return newMovement;
};

export const getStats = (): InventoryStats => {
  const products = getProducts();
  const movements = getMovements();
  const contacts = getContacts();
  
  const critical = products.filter(p => p.stock > 0 && p.stock <= (p.criticalStock || 10)).length;
  const low = products.filter(p => p.stock > (p.criticalStock || 10) && p.stock <= (p.minStock || 30)).length;
  const totalValue = products.reduce((sum, p) => sum + (p.stock * (p.price || 0)), 0);

  return {
    totalProducts: products.length,
    lowStockCount: low,
    criticalStockCount: critical,
    outOfStockCount: products.filter(p => p.stock === 0).length,
    totalMovements: movements.length,
    totalContacts: contacts.length,
    totalValue: totalValue
  };
};
