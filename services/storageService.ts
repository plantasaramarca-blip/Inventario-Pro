
import { Product, Movement, InventoryStats, Contact, AuditLog, Destination } from '../types';

const PRODUCTS_KEY = 'kardex_products';
const MOVEMENTS_KEY = 'kardex_movements';
const CONTACTS_KEY = 'kardex_contacts';
const CATEGORIES_KEY = 'kardex_categories';
const AUDIT_KEY = 'kardex_audit';
const DESTINOS_KEY = 'kardex_destinos';
const USER_EMAIL = 'admin@local.com'; // Usuario por defecto para auditoría local

const seedData = () => {
  if (!localStorage.getItem(CATEGORIES_KEY)) localStorage.setItem(CATEGORIES_KEY, JSON.stringify(['Tecnología', 'Oficina', 'Impresión', 'Limpieza', 'Otros']));
  if (!localStorage.getItem(PRODUCTS_KEY)) localStorage.setItem(PRODUCTS_KEY, JSON.stringify([]));
  if (!localStorage.getItem(MOVEMENTS_KEY)) localStorage.setItem(MOVEMENTS_KEY, JSON.stringify([]));
  if (!localStorage.getItem(CONTACTS_KEY)) localStorage.setItem(CONTACTS_KEY, JSON.stringify([]));
  if (!localStorage.getItem(AUDIT_KEY)) localStorage.setItem(AUDIT_KEY, JSON.stringify([]));
  if (!localStorage.getItem(DESTINOS_KEY)) localStorage.setItem(DESTINOS_KEY, JSON.stringify([]));
};

export const saveAuditLog = (log: Partial<AuditLog>) => {
  seedData();
  const logs = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
  const newLog: AuditLog = {
    ...log,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    user_email: USER_EMAIL,
  } as AuditLog;
  logs.unshift(newLog);
  localStorage.setItem(AUDIT_KEY, JSON.stringify(logs));
};

export const getDestinos = (): Destination[] => {
  seedData();
  return JSON.parse(localStorage.getItem(DESTINOS_KEY) || '[]');
};

export const saveDestino = (destino: Destination): void => {
  const destinos = getDestinos();
  const idx = destinos.findIndex(d => d.id === destino.id);
  const isUpdate = idx >= 0;
  if (isUpdate) destinos[idx] = destino;
  else destinos.push(destino);
  localStorage.setItem(DESTINOS_KEY, JSON.stringify(destinos));
  saveAuditLog({ action: isUpdate ? 'UPDATE' : 'CREATE', table_name: 'destinos', record_id: destino.id, record_name: destino.name, changes_summary: `${isUpdate ? 'Actualizó' : 'Creó'} el centro de costo "${destino.name}"` });
};

export const deleteDestino = (id: string): void => {
  const movements = getMovements();
  if (movements.some(m => m.destinationId === id)) throw new Error('No se puede eliminar. Tiene movimientos registrados.');
  const all = getDestinos();
  const toDelete = all.find(d => d.id === id);
  const remaining = all.filter(d => d.id !== id);
  localStorage.setItem(DESTINOS_KEY, JSON.stringify(remaining));
  if (toDelete) saveAuditLog({ action: 'DELETE', table_name: 'destinos', record_id: id, record_name: toDelete.name, changes_summary: `Eliminó el centro de costo "${toDelete.name}"` });
};

export const getAuditLogs = (page = 0, limit = 50) => {
  seedData();
  const data = JSON.parse(localStorage.getItem(AUDIT_KEY) || '[]');
  const sorted = data.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return { data: sorted.slice(page * limit, (page + 1) * limit), count: sorted.length };
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
  const products: Product[] = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]');
  // Ordena por fecha de actualización descendente para que los más nuevos aparezcan primero.
  return products.sort((a, b) => {
    const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return dateB - dateA;
  });
};

export const saveProduct = (product: Product): void => {
  const products = JSON.parse(localStorage.getItem(PRODUCTS_KEY) || '[]') as Product[];
  const idx = products.findIndex(p => p.id === product.id);
  const isUpdate = idx >= 0;

  // Asegura que la fecha de actualización esté presente y actualizada.
  const productToSave = { ...product, updatedAt: new Date().toISOString() };
  
  if (isUpdate) {
    products[idx] = productToSave;
  } else {
    products.push(productToSave);
  }
  
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(products));
  saveAuditLog({ action: isUpdate ? 'UPDATE' : 'CREATE', table_name: 'products', record_id: product.id, record_name: product.name, changes_summary: `${isUpdate ? 'Actualizó' : 'Creó'} el producto "${product.name}"` });
};

export const deleteProduct = (id: string): void => {
  const all = getProducts();
  const toDelete = all.find(p => p.id === id);
  const remaining = all.filter(p => p.id !== id);
  localStorage.setItem(PRODUCTS_KEY, JSON.stringify(remaining));
  if (toDelete) saveAuditLog({ action: 'DELETE', table_name: 'products', record_id: id, record_name: toDelete.name, changes_summary: `Eliminó el producto "${toDelete.name}"` });
};

export const getContacts = (): Contact[] => {
  seedData();
  return JSON.parse(localStorage.getItem(CONTACTS_KEY) || '[]');
};

export const saveContact = (contact: Contact): void => {
  const contacts = getContacts();
  const idx = contacts.findIndex(c => c.id === contact.id);
  const isUpdate = idx >= 0;
  if (isUpdate) contacts[idx] = contact;
  else contacts.push(contact);
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(contacts));
  saveAuditLog({ action: isUpdate ? 'UPDATE' : 'CREATE', table_name: 'contacts', record_id: contact.id, record_name: contact.name, changes_summary: `${isUpdate ? 'Actualizó' : 'Creó'} el contacto "${contact.name}"` });
};

export const deleteContact = (id: string): void => {
  const all = getContacts();
  const toDelete = all.find(c => c.id === id);
  const remaining = all.filter(c => c.id !== id);
  localStorage.setItem(CONTACTS_KEY, JSON.stringify(remaining));
  if (toDelete) saveAuditLog({ action: 'DELETE', table_name: 'contacts', record_id: id, record_name: toDelete.name, changes_summary: `Eliminó el contacto "${toDelete.name}"` });
};

export const getMovements = (): Movement[] => {
  seedData();
  return JSON.parse(localStorage.getItem(MOVEMENTS_KEY) || '[]');
};

export const registerMovement = (movement: any): Movement => {
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
    id: crypto.randomUUID(),
    productName: product.name,
    balanceAfter: newStock,
    date: new Date().toISOString()
  };

  const movements = getMovements();
  movements.unshift(newMovement);
  localStorage.setItem(MOVEMENTS_KEY, JSON.stringify(movements));
  saveAuditLog({ action: 'CREATE', table_name: 'movements', record_id: newMovement.id, record_name: newMovement.productName, changes_summary: `Registró ${newMovement.type} de ${newMovement.quantity} unds. para "${newMovement.productName}"` });
  return newMovement;
};

export const getStats = (): InventoryStats => {
  const products = getProducts();
  const movements = getMovements();
  const contacts = getContacts();
  const critical = products.filter(p => p.stock > 0 && p.stock <= (p.criticalStock || 10)).length;
  const low = products.filter(p => p.stock > (p.criticalStock || 10) && p.stock <= (p.minStock || 30)).length;
  const totalValue = products.reduce((sum, p) => sum + (p.stock * (p.purchasePrice || 0)), 0);
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
